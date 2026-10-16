<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingExpense;
use App\Models\Driver;
use App\Models\Office;
use App\Models\Taxi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BookingExpenseTest extends TestCase
{
    use RefreshDatabase;

    private function createSetup(): array
    {
        $office = Office::create([
            'name' => 'Downtown Hub',
            'city' => 'Mumbai',
            'address' => '100 Marine Drive',
            'status' => 'active',
        ]);

        $taxi = Taxi::create([
            'reg_number' => 'MH-01-AB-1234',
            'make_model' => 'Toyota Innova',
            'vehicle_type' => 'suv',
            'year_of_manufacture' => 2024,
            'seating_capacity' => 7,
            'fuel_type' => 'diesel',
            'status' => 'available',
            'daily_rate' => 3000,
            'pricing_type' => 'daily',
            'rate_amount' => 3000,
            'office_id' => $office->id,
            'odometer_reading' => 10000,
        ]);

        $driver = Driver::create([
            'name' => 'Rajesh Sharma',
            'license_number' => 'DL-99887766',
            'license_expiry' => now()->addYear()->toDateString(),
            'joining_date' => now()->subYear()->toDateString(),
            'phone' => '+91 98765 43210',
            'email' => 'rajesh.driver@ridedesk.test',
            'status' => 'active',
            'office_id' => $office->id,
        ]);

        $driverUser = User::factory()->create([
            'name' => 'Rajesh Sharma',
            'email' => 'rajesh.driver@ridedesk.test',
            'role' => 'driver',
            'driver_id' => $driver->id,
            'office_id' => $office->id,
        ]);

        $staffUser = User::factory()->create([
            'name' => 'Staff Dispatcher',
            'email' => 'dispatcher@ridedesk.test',
            'role' => 'staff',
            'office_id' => $office->id,
        ]);

        $adminUser = User::factory()->create([
            'name' => 'Fleet Admin',
            'email' => 'admin@ridedesk.test',
            'role' => 'admin',
        ]);

        $booking = Booking::create([
            'customer_name' => 'Amit Patel',
            'customer_phone' => '+91 91234 56789',
            'pickup_date' => now()->toDateString(),
            'return_date' => now()->addDays(2)->toDateString(),
            'pickup_location' => 'Mumbai Airport',
            'drop_location' => 'Pune City',
            'taxi_id' => $taxi->id,
            'driver_id' => $driver->id,
            'office_id' => $office->id,
            'status' => 'active',
            'rate_amount' => 3000,
            'estimated_fare' => 9000,
            'final_fare' => 9000,
        ]);

        return compact('office', 'taxi', 'driver', 'driverUser', 'staffUser', 'adminUser', 'booking');
    }

    public function test_staff_can_log_and_list_expenses_for_booking(): void
    {
        $setup = $this->createSetup();

        $response = $this->actingAs($setup['staffUser'], 'sanctum')
            ->postJson("/api/bookings/{$setup['booking']->id}/expenses", [
                'category' => 'fuel',
                'amount' => 2500.50,
                'payment_method' => 'company_card',
                'is_billable' => false,
                'expense_date' => now()->toDateString(),
                'notes' => 'Full tank diesel before trip',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('amount', '2500.50')
            ->assertJsonPath('category', 'fuel')
            ->assertJsonPath('status', 'approved');

        $this->assertDatabaseHas('booking_expenses', [
            'booking_id' => $setup['booking']->id,
            'category' => 'fuel',
            'amount' => 2500.50,
        ]);

        $listResponse = $this->actingAs($setup['staffUser'], 'sanctum')
            ->getJson("/api/bookings/{$setup['booking']->id}/expenses")
            ->assertOk();

        $listResponse->assertJsonStructure([
            'expenses',
            'pnl' => [
                'base_fare',
                'billable_expenses',
                'customer_grand_total',
                'total_expenses',
                'net_profit',
                'profit_margin_pct',
            ],
        ]);

        $this->assertEquals(2500.50, $listResponse->json('pnl.total_expenses'));
    }

    public function test_driver_can_log_expense_for_assigned_booking_and_it_is_pending(): void
    {
        $setup = $this->createSetup();

        $response = $this->actingAs($setup['driverUser'], 'sanctum')
            ->postJson("/api/bookings/{$setup['booking']->id}/expenses", [
                'category' => 'toll',
                'amount' => 340.00,
                'payment_method' => 'driver_upi',
                'is_billable' => true,
                'expense_date' => now()->toDateString(),
                'notes' => 'Expressway Toll Plaza',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'pending_approval')
            ->assertJsonPath('driver_id', $setup['driver']->id)
            ->assertJsonPath('is_billable', true);

        // Driver cannot log for a booking assigned to another driver
        $otherDriver = Driver::create([
            'name' => 'Suresh Kumar',
            'license_number' => 'DL-11223344',
            'license_expiry' => now()->addYear()->toDateString(),
            'joining_date' => now()->subYear()->toDateString(),
            'phone' => '+91 99999 11111',
            'status' => 'active',
        ]);
        $unassignedBooking = Booking::create([
            'customer_name' => 'Other Client',
            'customer_phone' => '+91 98888 22222',
            'pickup_date' => now()->toDateString(),
            'return_date' => now()->toDateString(),
            'pickup_location' => 'Colaba',
            'drop_location' => 'Bandra',
            'driver_id' => $otherDriver->id,
            'status' => 'confirmed',
        ]);

        $this->actingAs($setup['driverUser'], 'sanctum')
            ->postJson("/api/bookings/{$unassignedBooking->id}/expenses", [
                'category' => 'parking',
                'amount' => 150.00,
                'payment_method' => 'driver_cash',
                'expense_date' => now()->toDateString(),
            ])
            ->assertStatus(403);
    }

    public function test_staff_can_approve_reimburse_and_reject_driver_expense(): void
    {
        $setup = $this->createSetup();

        $expense = BookingExpense::create([
            'booking_id' => $setup['booking']->id,
            'driver_id' => $setup['driver']->id,
            'category' => 'parking',
            'amount' => 200.00,
            'payment_method' => 'driver_cash',
            'is_billable' => true,
            'status' => 'pending_approval',
            'expense_date' => now()->toDateString(),
        ]);

        // Driver cannot approve
        $this->actingAs($setup['driverUser'], 'sanctum')
            ->postJson("/api/expenses/{$expense->id}/approve")
            ->assertStatus(403);

        // Staff can approve
        $this->actingAs($setup['staffUser'], 'sanctum')
            ->postJson("/api/expenses/{$expense->id}/approve")
            ->assertOk()
            ->assertJsonPath('expense.status', 'approved');

        $this->assertEquals('approved', $expense->fresh()->status);
        $this->assertEquals($setup['staffUser']->id, $expense->fresh()->approved_by);

        // Staff can reimburse
        $this->actingAs($setup['staffUser'], 'sanctum')
            ->postJson("/api/expenses/{$expense->id}/reimburse")
            ->assertOk()
            ->assertJsonPath('expense.status', 'reimbursed');

        $this->assertEquals('reimbursed', $expense->fresh()->status);

        // Staff can reject
        $this->actingAs($setup['staffUser'], 'sanctum')
            ->postJson("/api/expenses/{$expense->id}/reject")
            ->assertOk()
            ->assertJsonPath('expense.status', 'rejected');

        $this->assertEquals('rejected', $expense->fresh()->status);
    }

    public function test_receipt_file_upload_and_download(): void
    {
        Storage::fake('local');
        $setup = $this->createSetup();

        $file = UploadedFile::fake()->create('toll-slip.pdf', 200, 'application/pdf');

        $response = $this->actingAs($setup['staffUser'], 'sanctum')
            ->postJson("/api/bookings/{$setup['booking']->id}/expenses", [
                'category' => 'toll',
                'amount' => 180.00,
                'payment_method' => 'fastag',
                'is_billable' => false,
                'expense_date' => now()->toDateString(),
                'receipt' => $file,
            ]);

        $response->assertStatus(201);
        $expenseId = $response->json('id');
        $expense = BookingExpense::findOrFail($expenseId);

        $this->assertNotNull($expense->receipt_path);
        Storage::disk('local')->assertExists($expense->receipt_path);

        // Download receipt
        $downloadRes = $this->actingAs($setup['staffUser'], 'sanctum')
            ->get("/api/expenses/{$expenseId}/receipt")
            ->assertOk();

        // Invalid file format rejected
        $badFile = UploadedFile::fake()->create('malware.exe', 100, 'application/x-msdownload');
        $this->actingAs($setup['staffUser'], 'sanctum')
            ->postJson("/api/bookings/{$setup['booking']->id}/expenses", [
                'category' => 'toll',
                'amount' => 100.00,
                'payment_method' => 'fastag',
                'expense_date' => now()->toDateString(),
                'receipt' => $badFile,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['receipt']);
    }

    public function test_profitability_calculations_and_eager_loaded_pnl(): void
    {
        $setup = $this->createSetup();
        $booking = $setup['booking'];
        $booking->update(['final_fare' => 6000.00]);

        // Fuel: 1500 (Company, non-billable)
        BookingExpense::create([
            'booking_id' => $booking->id,
            'driver_id' => $setup['driver']->id,
            'category' => 'fuel',
            'amount' => 1500.00,
            'payment_method' => 'company_card',
            'is_billable' => false,
            'status' => 'approved',
            'expense_date' => now()->toDateString(),
        ]);

        // Toll: 500 (Billable to customer)
        BookingExpense::create([
            'booking_id' => $booking->id,
            'driver_id' => $setup['driver']->id,
            'category' => 'toll',
            'amount' => 500.00,
            'payment_method' => 'fastag',
            'is_billable' => true,
            'status' => 'approved',
            'expense_date' => now()->toDateString(),
        ]);

        // Rejected claim: 300 (should be excluded from calculations)
        BookingExpense::create([
            'booking_id' => $booking->id,
            'driver_id' => $setup['driver']->id,
            'category' => 'other',
            'amount' => 300.00,
            'payment_method' => 'driver_cash',
            'is_billable' => false,
            'status' => 'rejected',
            'expense_date' => now()->toDateString(),
        ]);

        $freshBooking = $booking->fresh();
        // Total expenses = 1500 + 500 = 2000
        $this->assertEquals(2000.00, $freshBooking->total_expenses);
        // Billable add-ons = 500
        $this->assertEquals(500.00, $freshBooking->billable_expenses);
        // Gross customer total = 6000 + 500 = 6500
        // Net profit = 6500 - 2000 = 4500
        $this->assertEquals(4500.00, $freshBooking->net_profit);
        // Profit margin % = round((4500 / 6500) * 100, 1) = 69.2%
        $this->assertEquals(69.2, $freshBooking->profit_margin_pct);

        // Check show API endpoint includes these computed attributes
        $this->actingAs($setup['staffUser'], 'sanctum')
            ->getJson("/api/bookings/{$booking->id}")
            ->assertOk()
            ->assertJsonPath('total_expenses', 2000)
            ->assertJsonPath('billable_expenses', 500)
            ->assertJsonPath('net_profit', 4500)
            ->assertJsonPath('profit_margin_pct', 69.2);
    }

    public function test_driver_can_only_delete_their_own_pending_expense(): void
    {
        $setup = $this->createSetup();

        $pendingExpense = BookingExpense::create([
            'booking_id' => $setup['booking']->id,
            'driver_id' => $setup['driver']->id,
            'category' => 'parking',
            'amount' => 100.00,
            'payment_method' => 'driver_cash',
            'status' => 'pending_approval',
            'expense_date' => now()->toDateString(),
        ]);

        // Driver can delete their pending expense
        $this->actingAs($setup['driverUser'], 'sanctum')
            ->deleteJson("/api/expenses/{$pendingExpense->id}")
            ->assertOk();

        $this->assertDatabaseMissing('booking_expenses', ['id' => $pendingExpense->id]);

        // Approved expense cannot be deleted by driver
        $approvedExpense = BookingExpense::create([
            'booking_id' => $setup['booking']->id,
            'driver_id' => $setup['driver']->id,
            'category' => 'parking',
            'amount' => 100.00,
            'payment_method' => 'driver_cash',
            'status' => 'approved',
            'expense_date' => now()->toDateString(),
        ]);

        $this->actingAs($setup['driverUser'], 'sanctum')
            ->deleteJson("/api/expenses/{$approvedExpense->id}")
            ->assertStatus(403);
    }
}
