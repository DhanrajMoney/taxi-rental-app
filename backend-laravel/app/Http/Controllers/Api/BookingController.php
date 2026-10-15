<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBookingRequest;
use App\Models\Booking;
use App\Models\Customer;
use App\Models\Driver;
use App\Models\Notification;
use App\Models\Taxi;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookingController extends Controller
{
    private const ACTIVE_STATUSES = ['pending', 'confirmed', 'active'];

    public function index(Request $request)
    {
        $query = Booking::with(['taxi', 'driver', 'customer', 'office']);
        $this->applyUserAccessScope($query, $request->user());

        if ($search = $request->query('search')) {
            $cleanId = preg_replace('/[^0-9]/', '', $search);
            $query->where(function ($builder) use ($search, $cleanId) {
                $builder->where('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%")
                    ->orWhere('pickup_location', 'like', "%{$search}%")
                    ->orWhere('drop_location', 'like', "%{$search}%");

                if ($cleanId !== '') {
                    $builder->orWhere('id', (int) $cleanId);
                }

                $builder->orWhereHas('taxi', fn ($q) => $q->where('reg_number', 'like', "%{$search}%"));
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($officeId = $request->query('office_id')) {
            $query->where('office_id', $officeId);
        }

        if ($driverId = $request->query('driver_id')) {
            $query->where('driver_id', $driverId);
        }

        if ($taxiId = $request->query('taxi_id')) {
            $query->where('taxi_id', $taxiId);
        }

        $dateField = in_array($request->query('date_field'), ['pickup_date', 'return_date', 'created_at'], true)
            ? $request->query('date_field')
            : 'pickup_date';

        if ($date = $request->query('date')) {
            $query->whereDate($dateField, $date);
        }

        if ($startDate = $request->query('start_date') ?: $request->query('from_date')) {
            $query->whereDate($dateField, '>=', $startDate);
        }

        if ($endDate = $request->query('end_date') ?: $request->query('to_date')) {
            $query->whereDate($dateField, '<=', $endDate);
        }

        if ($datePreset = $request->query('date_preset')) {
            $today = Carbon::today();
            match ($datePreset) {
                'today' => $query->whereDate($dateField, $today),
                'tomorrow' => $query->whereDate($dateField, $today->copy()->addDay()),
                'next_7_days' => $query->whereBetween($dateField, [$today->toDateString(), $today->copy()->addDays(7)->toDateString()]),
                'next_30_days' => $query->whereBetween($dateField, [$today->toDateString(), $today->copy()->addDays(30)->toDateString()]),
                'past_7_days' => $query->whereBetween($dateField, [$today->copy()->subDays(7)->toDateString(), $today->toDateString()]),
                'past_30_days' => $query->whereBetween($dateField, [$today->copy()->subDays(30)->toDateString(), $today->toDateString()]),
                'this_week' => $query->whereBetween($dateField, [$today->copy()->startOfWeek()->toDateString(), $today->copy()->endOfWeek()->toDateString()]),
                'this_month' => $query->whereBetween($dateField, [$today->copy()->startOfMonth()->toDateString(), $today->copy()->endOfMonth()->toDateString()]),
                default => null,
            };
        }

        return response()->json(
            $query->orderBy('pickup_date')->orderByDesc('created_at')->paginate($request->integer('per_page', 15))
        );
    }

    public function store(StoreBookingRequest $request)
    {
        $data = $request->validated();
        $user = $request->user();

        if (empty($data['office_id']) && $user?->office_id) {
            $data['office_id'] = $user->office_id;
        }

        $booking = DB::transaction(function () use ($data) {
            // Find or create customer record
            if (empty($data['customer_id']) && ! empty($data['customer_phone'])) {
                $customer = Customer::firstOrCreate(
                    ['phone' => $data['customer_phone']],
                    ['name' => $data['customer_name'], 'office_id' => $data['office_id'] ?? null]
                );
                $data['customer_id'] = $customer->id;
            }

            $data = $this->applyPricingSnapshot($data);
            $data = $this->captureStartingOdometer($data);
            $booking = Booking::create($data);
            $this->ensureNoConflicts($booking);

            $pickupDate = $booking->pickup_date->format('d M Y');
            $returnDate = $booking->return_date->format('d M Y');

            // Create notification
            Notification::create([
                'type' => 'booking_created',
                'title' => 'New Booking Created',
                'message' => "Booking #{$booking->id} for {$booking->customer_name} from {$pickupDate} to {$returnDate} is {$booking->status}.",
            ]);

            return $booking;
        });

        return response()->json($booking->load(['taxi', 'driver', 'customer', 'office']), 201);
    }

    public function show(Request $request, Booking $booking)
    {
        if ($request->user()?->role === 'driver' && ! $this->bookingVisibleToUser($booking, $request->user())) {
            abort(403, 'You are not assigned to this booking.');
        }

        return response()->json($booking->load(['taxi', 'driver', 'customer', 'office']));
    }

    public function update(StoreBookingRequest $request, Booking $booking)
    {
        $data = $request->validated();
        $oldStatus = $booking->status;

        $booking = DB::transaction(function () use ($data, $booking) {
            $data = $this->applyPricingSnapshot($data, $booking);
            $data = $this->captureStartingOdometer($data, $booking);

            if (($data['status'] ?? $booking->status) === 'completed' && $booking->status !== 'completed') {
                $data = $this->finalizeFare($data, $booking);
            }

            $booking->update($data);
            $this->ensureNoConflicts($booking);

            return $booking;
        });

        if (isset($data['status']) && $data['status'] !== $oldStatus) {
            Notification::create([
                'type' => 'booking_status',
                'title' => 'Booking Status Updated',
                'message' => "Booking #{$booking->id} status changed from {$oldStatus} to {$booking->status}.",
            ]);
        }

        return response()->json($booking->load(['taxi', 'driver', 'customer', 'office']));
    }

    public function destroy(Request $request, Booking $booking)
    {
        $reason = trim((string) $request->input('reason', ''));
        $notes = trim((string) $request->input('notes', ''));

        $reasonParts = array_filter([$reason, $notes]);
        $updateData = ['status' => 'cancelled'];

        if (! empty($reasonParts)) {
            $logEntry = '[Cancellation Reason] '.implode(' — ', $reasonParts);
            $updateData['notes'] = $booking->notes
                ? $booking->notes."\n".$logEntry
                : $logEntry;
        }

        $booking->update($updateData);

        $notificationMsg = "Booking #{$booking->id} for {$booking->customer_name} has been cancelled.";
        if ($reason) {
            $notificationMsg .= " Reason: {$reason}.";
        }

        Notification::create([
            'type' => 'booking_status',
            'title' => 'Booking Cancelled',
            'message' => $notificationMsg,
        ]);

        return response()->json(['message' => 'Booking cancelled']);
    }

    private function applyUserAccessScope($query, $user): void
    {
        if (! $user) {
            return;
        }

        if ($user->role === 'driver') {
            $driverIds = $this->resolveDriverIdsForUser($user);

            if ($driverIds === []) {
                $query->whereRaw('0 = 1');

                return;
            }

            $query->whereNotNull('driver_id')->whereIn('driver_id', $driverIds);

            return;
        }

        if ($user->role === 'staff' && $user->office_id) {
            $query->where('office_id', $user->office_id);
        }
    }

    private function bookingVisibleToUser(Booking $booking, $user): bool
    {
        if (! $user || $user->role !== 'driver') {
            return true;
        }

        return in_array((int) $booking->driver_id, $this->resolveDriverIdsForUser($user), true);
    }

    private function resolveDriverIdsForUser($user): array
    {
        $driverIds = [];

        if ($user->driver_id) {
            return [(int) $user->driver_id];
        }

        $identifiers = array_values(array_unique(array_filter([
            $user->name ? trim($user->name) : null,
            $user->email ? trim($user->email) : null,
            $user->email ? Str::before(trim($user->email), '@') : null,
        ], fn ($identifier) => $identifier !== null && $identifier !== '')));

        if ($identifiers === []) {
            return $driverIds;
        }

        $matchingDriverIds = Driver::query()
            ->where(function ($query) use ($identifiers) {
                $query->whereIn('name', $identifiers)
                    ->orWhereIn('email', $identifiers)
                    ->orWhere(function ($innerQuery) use ($identifiers) {
                        foreach ($identifiers as $identifier) {
                            $innerQuery->orWhereRaw('LOWER(name) = ?', [strtolower($identifier)]);
                            $innerQuery->orWhereRaw('LOWER(email) = ?', [strtolower($identifier)]);
                        }
                    });
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return array_values(array_unique([...$driverIds, ...$matchingDriverIds]));
    }

    private function ensureNoConflicts(Booking $booking): void
    {
        if (! in_array($booking->status, self::ACTIVE_STATUSES, true)) {
            return;
        }

        if (! $booking->taxi_id && ! $booking->driver_id) {
            return;
        }

        $pickupDate = $booking->getRawOriginal('pickup_date');
        $returnDate = $booking->getRawOriginal('return_date');

        $conflict = Booking::query()
            ->where('id', '!=', $booking->id)
            ->whereIn('status', self::ACTIVE_STATUSES)
            ->where('pickup_date', '<=', $returnDate)
            ->where('return_date', '>=', $pickupDate)
            ->where(function ($query) use ($booking) {
                if ($booking->taxi_id) {
                    $query->where('taxi_id', $booking->taxi_id);
                }

                if ($booking->driver_id) {
                    $booking->taxi_id
                        ? $query->orWhere('driver_id', $booking->driver_id)
                        : $query->where('driver_id', $booking->driver_id);
                }
            })
            ->exists();

        if ($conflict) {
            throw ValidationException::withMessages([
                'pickup_date' => ['The selected taxi or driver is already booked for these dates.'],
            ]);
        }
    }

    private function applyPricingSnapshot(array $data, ?Booking $booking = null): array
    {
        $taxiId = $data['taxi_id'] ?? $booking?->taxi_id;
        if (! $taxiId) {
            return $data;
        }

        $taxi = Taxi::query()->lockForUpdate()->find($taxiId);
        if (! $taxi) {
            return $data;
        }

        $sameTaxi = $booking && (int) $booking->taxi_id === (int) $taxi->id;
        $taxiRate = (float) $taxi->rate_amount > 0 ? $taxi->rate_amount : $taxi->daily_rate;
        $data['pricing_type'] = $sameTaxi && $booking->pricing_type
            ? $booking->pricing_type
            : ($taxi->pricing_type ?: 'daily');
        $data['rate_amount'] = ($sameTaxi && $booking->rate_amount !== null && (float) $booking->rate_amount > 0)
            ? $booking->rate_amount
            : $taxiRate;

        if (! array_key_exists('planned_distance_km', $data) && $booking) {
            $data['planned_distance_km'] = $booking->planned_distance_km;
        }

        $data['estimated_fare'] = $this->estimateFare($data);

        return $data;
    }

    private function captureStartingOdometer(array $data, ?Booking $booking = null): array
    {
        $status = $data['status'] ?? $booking?->status;
        if ($status !== 'active' || ($booking && $booking->status === 'active')) {
            return $data;
        }

        $taxiId = $data['taxi_id'] ?? $booking?->taxi_id;
        $taxi = $taxiId ? Taxi::query()->lockForUpdate()->find($taxiId) : null;
        if (! $taxi) {
            throw ValidationException::withMessages([
                'taxi_id' => ['A taxi must be assigned before a trip can start.'],
            ]);
        }

        $data['odometer_start'] = $taxi->odometer_reading;

        return $data;
    }

    private function finalizeFare(array $data, Booking $booking): array
    {
        if ($booking->status !== 'active' || $booking->odometer_start === null) {
            throw ValidationException::withMessages([
                'status' => ['Start the trip before completing it.'],
            ]);
        }

        $odometerEnd = (int) $data['odometer_end'];
        $distance = $odometerEnd - (int) $booking->odometer_start;
        if ($distance < 0) {
            throw ValidationException::withMessages([
                'odometer_end' => ['The ending reading cannot be below the starting reading.'],
            ]);
        }

        $data['actual_distance_km'] = $distance;
        $data['final_fare'] = $booking->pricing_type === 'per_km'
            ? round($distance * (float) $booking->rate_amount, 2)
            : $this->estimateFare([
                'pricing_type' => $booking->pricing_type,
                'rate_amount' => $booking->rate_amount,
                'pickup_date' => $data['pickup_date'] ?? $booking->getRawOriginal('pickup_date'),
                'return_date' => $data['return_date'] ?? $booking->getRawOriginal('return_date'),
            ]);

        $taxi = Taxi::query()->lockForUpdate()->find($data['taxi_id'] ?? $booking->taxi_id);
        if ($taxi) {
            $taxi->update(['odometer_reading' => $odometerEnd]);
        }

        return $data;
    }

    private function estimateFare(array $data): ?float
    {
        if (! isset($data['pricing_type'], $data['rate_amount'])) {
            return null;
        }

        if ($data['pricing_type'] === 'per_km') {
            if (! isset($data['planned_distance_km'])) {
                return null;
            }

            return round((float) $data['rate_amount'] * (float) $data['planned_distance_km'], 2);
        }

        if (! isset($data['pickup_date'], $data['return_date'])) {
            return null;
        }

        $days = Carbon::parse($data['pickup_date'])->startOfDay()
            ->diffInDays(Carbon::parse($data['return_date'])->startOfDay()) + 1;

        return round((float) $data['rate_amount'] * $days, 2);
    }
}
