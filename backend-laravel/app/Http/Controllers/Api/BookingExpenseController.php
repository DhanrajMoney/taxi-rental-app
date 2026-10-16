<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBookingExpenseRequest;
use App\Http\Requests\UpdateBookingExpenseRequest;
use App\Models\Booking;
use App\Models\BookingExpense;
use App\Models\Driver;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BookingExpenseController extends Controller
{
    /**
     * List all expenses across bookings with optional filters (category, status, driver, office, date range).
     */
    public function indexAll(Request $request)
    {
        $query = BookingExpense::with(['booking', 'booking.customer', 'booking.taxi', 'driver', 'approver', 'office']);
        $user = $request->user();

        $this->applyUserScope($query, $user);

        if ($bookingId = $request->query('booking_id')) {
            $query->where('booking_id', $bookingId);
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($driverId = $request->query('driver_id')) {
            $query->where('driver_id', $driverId);
        }

        if ($officeId = $request->query('office_id')) {
            $query->where('office_id', $officeId);
        }

        if ($fromDate = $request->query('from_date')) {
            $query->whereDate('expense_date', '>=', $fromDate);
        }

        if ($toDate = $request->query('to_date')) {
            $query->whereDate('expense_date', '<=', $toDate);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('notes', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%")
                    ->orWhereHas('booking', fn ($b) => $b->where('customer_name', 'like', "%{$search}%"))
                    ->orWhereHas('driver', fn ($d) => $d->where('name', 'like', "%{$search}%"));
            });
        }

        // Database-level financial aggregation using a single query
        $summaryRow = (clone $query)->selectRaw("
            COALESCE(SUM(CASE WHEN status != 'rejected' THEN amount ELSE 0 END), 0) as total_amount,
            COALESCE(SUM(CASE WHEN status != 'rejected' AND is_billable = 1 THEN amount ELSE 0 END), 0) as billable_amount,
            COALESCE(SUM(CASE WHEN status = 'pending_approval' AND payment_method IN ('driver_cash', 'driver_upi') THEN amount ELSE 0 END), 0) as reimbursable_pending,
            COALESCE(SUM(CASE WHEN status = 'reimbursed' AND payment_method IN ('driver_cash', 'driver_upi') THEN amount ELSE 0 END), 0) as reimbursed_total,
            COUNT(*) as total_count
        ")->first();

        $totalAmount = (float) round($summaryRow->total_amount ?? 0, 2);
        $billableAmount = (float) round($summaryRow->billable_amount ?? 0, 2);
        $reimbursablePending = (float) round($summaryRow->reimbursable_pending ?? 0, 2);
        $reimbursedTotal = (float) round($summaryRow->reimbursed_total ?? 0, 2);
        $count = (int) ($summaryRow->total_count ?? 0);

        $perPage = $request->integer('per_page', 0);
        if ($perPage > 0) {
            $expenses = $query->latest('expense_date')->paginate($perPage);
        } else {
            $expenses = $query->latest('expense_date')->get();
        }

        return response()->json([
            'expenses' => $expenses,
            'summary' => [
                'total_amount' => $totalAmount,
                'billable_amount' => $billableAmount,
                'reimbursable_pending' => $reimbursablePending,
                'reimbursed_total' => $reimbursedTotal,
                'count' => $count,
            ],
        ]);
    }

    /**
     * List expenses for a specific booking.
     */
    public function index(Request $request, Booking $booking)
    {
        $this->ensureBookingVisible($booking, $request->user());

        $expenses = $booking->expenses()
            ->with([
                'driver:id,name,phone',
                'approver:id,name',
                'office:id,name',
            ])
            ->latest('expense_date')
            ->get();

        $totalExpenses = 0.0;
        $billableExpenses = 0.0;
        $reimbursablePending = 0.0;
        $reimbursedTotal = 0.0;

        foreach ($expenses as $expense) {
            $amt = (float) $expense->amount;
            if ($expense->status !== 'rejected') {
                $totalExpenses += $amt;
                if ($expense->is_billable) {
                    $billableExpenses += $amt;
                }
            }
            if (in_array($expense->payment_method, ['driver_cash', 'driver_upi'], true)) {
                if ($expense->status === 'pending_approval') {
                    $reimbursablePending += $amt;
                } elseif ($expense->status === 'reimbursed') {
                    $reimbursedTotal += $amt;
                }
            }
        }

        $totalExpenses = round($totalExpenses, 2);
        $billableExpenses = round($billableExpenses, 2);
        $reimbursablePending = round($reimbursablePending, 2);
        $reimbursedTotal = round($reimbursedTotal, 2);

        $baseFare = (float) ($booking->final_fare ?? $booking->estimated_fare ?? 0);
        $customerGrandTotal = (float) round($baseFare + $billableExpenses, 2);
        $netProfit = (float) round($customerGrandTotal - $totalExpenses, 2);
        $profitMarginPct = $customerGrandTotal > 0 ? (float) round(($netProfit / $customerGrandTotal) * 100, 1) : 0.0;

        return response()->json([
            'expenses' => $expenses,
            'pnl' => [
                'base_fare' => $baseFare,
                'billable_expenses' => $billableExpenses,
                'customer_grand_total' => $customerGrandTotal,
                'total_expenses' => $totalExpenses,
                'net_profit' => $netProfit,
                'profit_margin_pct' => $profitMarginPct,
                'reimbursable_pending' => $reimbursablePending,
                'reimbursed_total' => $reimbursedTotal,
            ],
        ]);
    }

    /**
     * Store a new operational expense for a booking.
     */
    public function store(StoreBookingExpenseRequest $request, Booking $booking)
    {
        $user = $request->user();
        $this->ensureBookingVisible($booking, $user);

        $data = $request->validated();
        $data['booking_id'] = $booking->id;
        $data['office_id'] = $data['office_id'] ?? $booking->office_id;

        if ($user->role === 'driver') {
            $driverIds = $this->resolveDriverIdsForUser($user);
            $data['driver_id'] = $driverIds[0] ?? $booking->driver_id;
            $data['status'] = 'pending_approval';
        } else {
            $data['driver_id'] = $data['driver_id'] ?? $booking->driver_id;
            $data['status'] = $data['status'] ?? 'approved';
            if ($data['status'] === 'approved') {
                $data['approved_by'] = $user->id;
                $data['approved_at'] = now();
            }
        }

        if ($request->hasFile('receipt')) {
            $file = $request->file('receipt');
            $data['receipt_path'] = $file->store('expenses/receipts', 'local');
            $data['receipt_original_name'] = $file->getClientOriginalName();
        }

        $expense = BookingExpense::create($data);

        // Record notification
        $catLabel = BookingExpense::CATEGORIES[$expense->category] ?? ucfirst($expense->category);
        Notification::create([
            'type' => 'booking_expense_logged',
            'title' => 'Ride Expense Logged',
            'message' => "New expense of {$expense->amount} ({$catLabel}) logged for Booking #{$booking->id}.",
        ]);

        return response()->json($expense->load(['driver', 'approver']), 201);
    }

    /**
     * Update an expense.
     */
    public function update(UpdateBookingExpenseRequest $request, BookingExpense $expense)
    {
        $user = $request->user();
        $booking = $expense->booking;
        $this->ensureBookingVisible($booking, $user);

        if ($user->role === 'driver') {
            if ($expense->status !== 'pending_approval') {
                abort(403, 'You cannot edit an expense that has already been approved or processed.');
            }
            $driverIds = $this->resolveDriverIdsForUser($user);
            if (! in_array((int) $expense->driver_id, $driverIds, true)) {
                abort(403, 'You can only edit your own expenses.');
            }
        }

        $data = $request->validated();

        if ($request->hasFile('receipt')) {
            if ($expense->receipt_path) {
                Storage::disk('local')->delete($expense->receipt_path);
            }
            $file = $request->file('receipt');
            $data['receipt_path'] = $file->store('expenses/receipts', 'local');
            $data['receipt_original_name'] = $file->getClientOriginalName();
        }

        if (isset($data['status']) && $data['status'] === 'approved' && $expense->status !== 'approved') {
            $data['approved_by'] = $user->id;
            $data['approved_at'] = now();
        }

        $expense->update($data);

        return response()->json($expense->fresh()->load(['driver', 'approver']));
    }

    /**
     * Delete an expense.
     */
    public function destroy(Request $request, BookingExpense $expense)
    {
        $user = $request->user();
        $this->ensureBookingVisible($expense->booking, $user);

        if ($user->role === 'driver') {
            if ($expense->status !== 'pending_approval') {
                abort(403, 'You cannot delete an expense that has already been approved.');
            }
            $driverIds = $this->resolveDriverIdsForUser($user);
            if (! in_array((int) $expense->driver_id, $driverIds, true)) {
                abort(403, 'You can only delete your own expenses.');
            }
        }

        if ($expense->receipt_path) {
            Storage::disk('local')->delete($expense->receipt_path);
        }

        $expense->delete();

        return response()->json(['message' => 'Expense deleted successfully']);
    }

    /**
     * Approve an expense claim (admin/staff only).
     */
    public function approve(Request $request, BookingExpense $expense)
    {
        $user = $request->user();
        if ($user->role === 'driver') {
            abort(403, 'Drivers cannot approve expenses.');
        }

        $expense->update([
            'status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        return response()->json([
            'message' => 'Expense approved successfully',
            'expense' => $expense->fresh()->load(['driver', 'approver']),
        ]);
    }

    /**
     * Mark an expense as reimbursed (admin/staff only).
     */
    public function reimburse(Request $request, BookingExpense $expense)
    {
        $user = $request->user();
        if ($user->role === 'driver') {
            abort(403, 'Drivers cannot mark expenses as reimbursed.');
        }

        $expense->update([
            'status' => 'reimbursed',
            'approved_by' => $expense->approved_by ?? $user->id,
            'approved_at' => $expense->approved_at ?? now(),
        ]);

        return response()->json([
            'message' => 'Expense marked as reimbursed',
            'expense' => $expense->fresh()->load(['driver', 'approver']),
        ]);
    }

    /**
     * Reject an expense claim (admin/staff only).
     */
    public function reject(Request $request, BookingExpense $expense)
    {
        $user = $request->user();
        if ($user->role === 'driver') {
            abort(403, 'Drivers cannot reject expenses.');
        }

        $expense->update([
            'status' => 'rejected',
        ]);

        return response()->json([
            'message' => 'Expense rejected',
            'expense' => $expense->fresh()->load(['driver', 'approver']),
        ]);
    }

    /**
     * Download or view the expense receipt.
     */
    public function downloadReceipt(Request $request, BookingExpense $expense)
    {
        $this->ensureBookingVisible($expense->booking, $request->user());

        abort_if(! $expense->receipt_path, 404, 'Receipt not found.');
        abort_if(! Storage::disk('local')->exists($expense->receipt_path), 404, 'Receipt file missing.');

        $filename = $expense->receipt_original_name ?: basename($expense->receipt_path);

        return Storage::disk('local')->response($expense->receipt_path, $filename);
    }

    private function ensureBookingVisible(Booking $booking, $user): void
    {
        if (! $user) {
            abort(401);
        }

        if ($user->role === 'driver') {
            $driverIds = $this->resolveDriverIdsForUser($user);
            if (! in_array((int) $booking->driver_id, $driverIds, true)) {
                abort(403, 'You are not assigned to this booking.');
            }
        } elseif ($user->role === 'staff' && $user->office_id) {
            if ($booking->office_id && (int) $booking->office_id !== (int) $user->office_id) {
                abort(403, 'This booking does not belong to your office branch.');
            }
        }
    }

    private function applyUserScope($query, $user): void
    {
        if (! $user) {
            return;
        }

        if ($user->role === 'driver') {
            $driverIds = $this->resolveDriverIdsForUser($user);
            if (empty($driverIds)) {
                $query->whereRaw('0 = 1');
            } else {
                $query->whereIn('driver_id', $driverIds);
            }
        } elseif ($user->role === 'staff' && $user->office_id) {
            $query->where('office_id', $user->office_id);
        }
    }

    private function resolveDriverIdsForUser($user): array
    {
        if ($user->driver_id) {
            return [(int) $user->driver_id];
        }

        $identifiers = array_values(array_unique(array_filter([
            $user->name ? trim($user->name) : null,
            $user->email ? trim($user->email) : null,
            $user->email ? Str::before(trim($user->email), '@') : null,
        ], fn ($identifier) => $identifier !== null && $identifier !== '')));

        if ($identifiers === []) {
            return [];
        }

        return Driver::query()
            ->where(function ($query) use ($identifiers) {
                $query->whereIn('name', $identifiers)
                    ->orWhereIn('email', $identifiers)
                    ->orWhereIn('phone', $identifiers);
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }
}

