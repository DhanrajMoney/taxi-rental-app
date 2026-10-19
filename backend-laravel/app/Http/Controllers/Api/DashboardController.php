<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Driver;
use App\Models\MaintenanceRecord;
use App\Models\Setting;
use App\Models\Taxi;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function overview(Request $request)
    {
        $today = now()->toDateString();
        $user = $request->user();

        $officeId = $request->query('office_id');
        if ($user?->role === 'staff' && $user->office_id) {
            $officeId = $user->office_id;
        }

        $taxiQuery = Taxi::query();
        if ($officeId) {
            $taxiQuery->where('office_id', $officeId);
        }

        $taxiMetrics = $taxiQuery
            ->selectRaw(
                'COUNT(*) as total, 
                 SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as available, 
                 SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as in_maintenance,
                 SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as on_rent,
                 SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as inactive',
                ['available', 'maintenance', 'on_rent', 'inactive'],
            )
            ->first();

        $driverQuery = Driver::query();
        if ($officeId) {
            $driverQuery->where('office_id', $officeId);
        }

        $driverMetrics = $driverQuery
            ->selectRaw(
                'COUNT(*) as total, 
                 SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as active,
                 SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as on_trip,
                 SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as on_leave,
                 SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as inactive',
                ['active', 'on_trip', 'on_leave', 'inactive'],
            )
            ->first();

        $totalTaxis = (int) $taxiMetrics->total;
        $availableTaxis = (int) $taxiMetrics->available;
        $taxisInMaintenance = (int) $taxiMetrics->in_maintenance;
        $taxisOnRent = (int) $taxiMetrics->on_rent;
        $taxisInactive = (int) $taxiMetrics->inactive;
        $fleetUtilization = $totalTaxis > 0 ? (int) round(($taxisOnRent / $totalTaxis) * 100) : 0;

        $totalDrivers = (int) $driverMetrics->total;
        $activeDrivers = (int) $driverMetrics->active;
        $driversOnTrip = (int) $driverMetrics->on_trip;
        $driversOnLeave = (int) $driverMetrics->on_leave;
        $driversInactive = (int) $driverMetrics->inactive;

        $startOfMonth = now()->startOfMonth()->toDateString();
        $bQuery = Booking::query();
        if ($officeId) {
            $bQuery->where('office_id', $officeId);
        }

        $bookingMetrics = $bQuery
            ->selectRaw(
                'SUM(CASE WHEN status != ? AND pickup_date >= ? THEN 1 ELSE 0 END) as upcoming,
                 SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending,
                 SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as active_trips,
                 SUM(CASE WHEN status = ? AND pickup_date >= ? THEN 1 ELSE 0 END) as completed_month,
                 SUM(CASE WHEN status = ? AND pickup_date >= ? THEN COALESCE(final_fare, estimated_fare, 0) ELSE 0 END) as revenue_month',
                ['cancelled', $today, 'pending', 'active', 'completed', $startOfMonth, 'completed', $startOfMonth]
            )
            ->first();

        $upcomingBookings = (int) ($bookingMetrics->upcoming ?? 0);
        $pendingBookings = (int) ($bookingMetrics->pending ?? 0);
        $activeTrips = (int) ($bookingMetrics->active_trips ?? 0);
        $completedThisMonth = (int) ($bookingMetrics->completed_month ?? 0);
        $revenueThisMonth = (float) ($bookingMetrics->revenue_month ?? 0);

        // Fetch dashboard settings from cache dictionary
        $settingsMap = collect(Setting::getDictionary());

        $docThresholdDays = (int) ($settingsMap->get('document_expiry_alert_days') ?: 30);
        $threshold = now()->addDays($docThresholdDays)->toDateString();
        $documentFields = ['license_expiry', 'insurance_expiry', 'document_expiry', 'required_document_expiry'];

        $docDriverQuery = Driver::where(function ($query) use ($threshold, $documentFields) {
            foreach ($documentFields as $field) {
                $query->orWhere($field, '<=', $threshold);
            }
        });
        if ($officeId) {
            $docDriverQuery->where('office_id', $officeId);
        }
        $documentDrivers = $docDriverQuery->get(['id', 'name', ...$documentFields]);

        $expiringDocuments = $documentDrivers->count();
        $documentAlerts = $documentDrivers
            ->map(function (Driver $driver) use ($documentFields, $today, $threshold) {
                $alerts = [];

                foreach ($documentFields as $field) {
                    $date = $driver->{$field};
                    if (! $date) {
                        continue;
                    }

                    if ($date->toDateString() < $today) {
                        $alerts[] = [
                            'field' => $field,
                            'label' => str_replace('_', ' ', $field),
                            'status' => 'expired',
                            'date' => $date->toDateString(),
                        ];

                        continue;
                    }

                    if ($date->toDateString() <= $threshold) {
                        $alerts[] = [
                            'field' => $field,
                            'label' => str_replace('_', ' ', $field),
                            'status' => 'expiring_soon',
                            'date' => $date->toDateString(),
                        ];
                    }
                }

                return [
                    'driver_id' => $driver->id,
                    'driver_name' => $driver->name,
                    'alerts' => $alerts,
                ];
            })
            ->filter(fn ($driver) => ! empty($driver['alerts']))
            ->values();

        $maintThresholdDays = (int) ($settingsMap->get('maintenance_alert_days') ?: 30);
        $maintQuery = MaintenanceRecord::whereNotNull('next_service_date')
            ->where('next_service_date', '<=', now()->addDays($maintThresholdDays)->toDateString());
        if ($officeId) {
            $maintQuery->whereHas('taxi', fn ($q) => $q->where('office_id', $officeId));
        }
        $maintenanceAlerts = $maintQuery->distinct('taxi_id')->count('taxi_id');

        $overdueMaintQuery = MaintenanceRecord::whereNotNull('next_service_date')
            ->where('next_service_date', '<', $today);
        if ($officeId) {
            $overdueMaintQuery->whereHas('taxi', fn ($q) => $q->where('office_id', $officeId));
        }
        $overdueMaintenance = $overdueMaintQuery->distinct('taxi_id')->count('taxi_id');

        $maintExpenseMonthQuery = MaintenanceRecord::where('service_date', '>=', $startOfMonth);
        if ($officeId) {
            $maintExpenseMonthQuery->whereHas('taxi', fn ($q) => $q->where('office_id', $officeId));
        }
        $maintenanceExpenseMonth = (float) $maintExpenseMonthQuery->sum('cost');

        $currencySymbol = $settingsMap->get('currency_symbol') ?: '₹';

        $activityQuery = Booking::with(['taxi', 'driver']);
        if ($officeId) {
            $activityQuery->where('office_id', $officeId);
        }

        $recentActivity = $activityQuery
            ->orderByDesc('pickup_date')
            ->orderByDesc('created_at')
            ->take(6)
            ->get()
            ->map(function (Booking $booking) {
                return [
                    'id' => $booking->id,
                    'customer_name' => $booking->customer_name,
                    'pickup_date' => $booking->pickup_date,
                    'pickup_location' => $booking->pickup_location,
                    'status' => $booking->status,
                    'taxi' => $booking->taxi?->reg_number,
                    'driver' => $booking->driver?->name,
                ];
            });

        $upcomingQuery = Booking::with(['taxi', 'driver', 'customer'])
            ->where('status', '!=', 'cancelled')
            ->where('pickup_date', '>=', $today);
        if ($officeId) {
            $upcomingQuery->where('office_id', $officeId);
        }

        $upcomingTrips = $upcomingQuery
            ->orderBy('pickup_date')
            ->take(5)
            ->get()
            ->map(function (Booking $booking) {
                return [
                    'id' => $booking->id,
                    'customer_name' => $booking->customer_name,
                    'customer_phone' => $booking->customer_phone,
                    'pickup_date' => $booking->pickup_date,
                    'return_date' => $booking->return_date,
                    'pickup_location' => $booking->pickup_location,
                    'drop_location' => $booking->drop_location,
                    'status' => $booking->status,
                    'taxi' => $booking->taxi ? [
                        'id' => $booking->taxi->id,
                        'reg_number' => $booking->taxi->reg_number,
                        'make_model' => $booking->taxi->make_model,
                        'vehicle_type' => $booking->taxi->vehicle_type,
                    ] : null,
                    'driver' => $booking->driver ? [
                        'id' => $booking->driver->id,
                        'name' => $booking->driver->name,
                        'phone' => $booking->driver->phone,
                    ] : null,
                    'fare' => $booking->final_fare ?: $booking->estimated_fare,
                ];
            });

        $offices = \App\Models\Office::where('status', 'active')->orderBy('name')->get(['id', 'name']);

        return response()->json([
            // Core original fields (preserves 100% backward compatibility)
            'total_taxis' => $totalTaxis,
            'available_taxis' => $availableTaxis,
            'taxis_in_maintenance' => $taxisInMaintenance,
            'total_drivers' => $totalDrivers,
            'active_drivers' => $activeDrivers,
            'upcoming_bookings' => $upcomingBookings,
            'expiring_documents' => $expiringDocuments,
            'document_alerts' => $documentAlerts,
            'maintenance_alerts' => $maintenanceAlerts,
            'recent_activity' => $recentActivity,

            // Rich Operational Extensions
            'fleet_breakdown' => [
                'total' => $totalTaxis,
                'available' => $availableTaxis,
                'on_rent' => $taxisOnRent,
                'in_maintenance' => $taxisInMaintenance,
                'inactive' => $taxisInactive,
                'utilization_rate' => $fleetUtilization,
            ],
            'driver_breakdown' => [
                'total' => $totalDrivers,
                'active' => $activeDrivers,
                'on_trip' => $driversOnTrip,
                'on_leave' => $driversOnLeave,
                'inactive' => $driversInactive,
            ],
            'booking_breakdown' => [
                'pending' => $pendingBookings,
                'active_trips' => $activeTrips,
                'upcoming' => $upcomingBookings,
                'completed_month' => $completedThisMonth,
            ],
            'financials' => [
                'revenue_month' => $revenueThisMonth,
                'maintenance_expense_month' => $maintenanceExpenseMonth,
                'currency_symbol' => $currencySymbol,
            ],
            'overdue_maintenance_count' => $overdueMaintenance,
            'upcoming_trips' => $upcomingTrips,
            'offices' => $offices,
        ]);
    }
}
