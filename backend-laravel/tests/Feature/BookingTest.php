<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Driver;
use App\Models\Taxi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_create_a_booking(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $taxi = $this->makeTaxi('TEST-1001');
        $driver = $this->makeDriver('TEST-DRIVER-1');

        $response = $this->actingAs($staff, 'sanctum')->postJson('/api/bookings', [
            'customer_name' => 'Test Customer',
            'customer_phone' => '+91 90000 00001',
            'pickup_date' => '2026-10-01',
            'return_date' => '2026-10-03',
            'pickup_location' => 'Test Airport',
            'drop_location' => 'City Center',
            'taxi_id' => $taxi->id,
            'driver_id' => $driver->id,
            'status' => 'confirmed',
        ]);

        $bookingId = $response->json('id');
        $response->assertCreated()->assertJsonPath('customer_name', 'Test Customer');
        $this->assertDatabaseHas('bookings', ['customer_phone' => '+91 90000 00001', 'drop_location' => 'City Center']);
        $this->assertDatabaseHas('notifications', [
            'type' => 'booking_created',
            'message' => "Booking #{$bookingId} for Test Customer from 01 Oct 2026 to 03 Oct 2026 is confirmed.",
        ]);
    }

    public function test_driver_can_view_but_cannot_create_bookings(): void
    {
        $driver = User::factory()->create(['role' => 'driver']);

        $this->actingAs($driver, 'sanctum')
            ->getJson('/api/bookings')
            ->assertOk();

        $this->actingAs($driver, 'sanctum')
            ->postJson('/api/bookings', [
                'customer_name' => 'Blocked Customer',
                'customer_phone' => '+91 90000 00002',
                'pickup_date' => '2026-10-01',
                'return_date' => '2026-10-01',
                'pickup_location' => 'Test Location',
                'status' => 'pending',
            ])
            ->assertForbidden();
    }

    public function test_driver_only_sees_assigned_bookings(): void
    {
        $driverUser = User::factory()->create([
            'name' => 'Aarav Mehta',
            'role' => 'driver',
        ]);

        $assignedDriver = Driver::create([
            'name' => 'Aarav Mehta',
            'phone' => '+91 90000 00011',
            'license_number' => 'DL-ASSIGNED-1',
            'license_expiry' => '2028-01-01',
            'joining_date' => '2026-01-01',
            'status' => 'active',
        ]);

        $otherDriver = Driver::create([
            'name' => 'Diya Sharma',
            'phone' => '+91 90000 00012',
            'license_number' => 'DL-ASSIGNED-2',
            'license_expiry' => '2028-01-01',
            'joining_date' => '2026-01-01',
            'status' => 'active',
        ]);

        Booking::create([
            'customer_name' => 'Assigned Customer',
            'customer_phone' => '+91 90000 00021',
            'pickup_date' => '2026-10-20',
            'return_date' => '2026-10-22',
            'pickup_location' => 'Airport',
            'drop_location' => 'Downtown',
            'taxi_id' => null,
            'driver_id' => $assignedDriver->id,
            'status' => 'confirmed',
        ]);

        Booking::create([
            'customer_name' => 'Other Customer',
            'customer_phone' => '+91 90000 00022',
            'pickup_date' => '2026-10-21',
            'return_date' => '2026-10-23',
            'pickup_location' => 'City Center',
            'drop_location' => 'Mall',
            'taxi_id' => null,
            'driver_id' => $otherDriver->id,
            'status' => 'confirmed',
        ]);

        $this->actingAs($driverUser, 'sanctum')
            ->getJson('/api/bookings')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.customer_name', 'Assigned Customer');
    }

    public function test_driver_account_linked_by_driver_id_sees_assigned_bookings(): void
    {
        $assignedDriver = $this->makeDriver('LINKED-DRIVER-1');
        $driverUser = User::factory()->create([
            'role' => 'driver',
            'driver_id' => $assignedDriver->id,
        ]);

        Booking::create([
            'customer_name' => 'Linked Customer',
            'customer_phone' => '+91 90000 00031',
            'pickup_date' => '2026-10-20',
            'return_date' => '2026-10-22',
            'pickup_location' => 'Airport',
            'drop_location' => 'Downtown',
            'driver_id' => $assignedDriver->id,
            'status' => 'confirmed',
        ]);

        $this->actingAs($driverUser, 'sanctum')
            ->getJson('/api/bookings')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.customer_name', 'Linked Customer');
    }

    public function test_overlapping_booking_for_same_taxi_is_rejected(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $taxi = $this->makeTaxi('TEST-1002');
        $driver = $this->makeDriver('TEST-DRIVER-2');

        Booking::create([
            'customer_name' => 'Existing Customer',
            'customer_phone' => '+91 90000 00003',
            'pickup_date' => '2026-10-10',
            'return_date' => '2026-10-12',
            'pickup_location' => 'Existing Location',
            'drop_location' => 'Existing Drop Location',
            'taxi_id' => $taxi->id,
            'driver_id' => $driver->id,
            'status' => 'confirmed',
        ]);

        $this->assertDatabaseHas('bookings', [
            'taxi_id' => $taxi->id,
            'pickup_date' => '2026-10-10',
            'return_date' => '2026-10-12',
            'status' => 'confirmed',
        ]);
        $this->assertTrue(Booking::query()
            ->whereIn('status', ['pending', 'confirmed', 'active'])
            ->where('pickup_date', '<=', '2026-10-14')
            ->where('return_date', '>=', '2026-10-12')
            ->where('taxi_id', $taxi->id)
            ->exists());

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/bookings', [
                'customer_name' => 'Overlapping Customer',
                'customer_phone' => '+91 90000 00004',
                'pickup_date' => '2026-10-12',
                'return_date' => '2026-10-14',
                'pickup_location' => 'New Location',
                'drop_location' => 'New Drop Location',
                'taxi_id' => $taxi->id,
                'status' => 'pending',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('pickup_date');
    }

    public function test_staff_can_cancel_a_booking(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $booking = Booking::create([
            'customer_name' => 'Cancel Customer',
            'customer_phone' => '+91 90000 00005',
            'pickup_date' => '2026-11-01',
            'return_date' => '2026-11-01',
            'pickup_location' => 'Test Location',
            'drop_location' => 'Test Drop Location',
            'status' => 'pending',
        ]);

        $this->actingAs($staff, 'sanctum')
            ->deleteJson('/api/bookings/'.$booking->id)
            ->assertOk()
            ->assertJson(['message' => 'Booking cancelled']);

        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'cancelled']);
    }

    public function test_staff_can_view_a_single_booking(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $taxi = $this->makeTaxi('TEST-1003');
        $driver = $this->makeDriver('TEST-DRIVER-3');
        $booking = Booking::create([
            'customer_name' => 'Single Booking Customer',
            'customer_phone' => '+91 90000 00006',
            'pickup_date' => '2026-11-01',
            'return_date' => '2026-11-01',
            'pickup_location' => 'Test Location',
            'drop_location' => 'Test Drop Location',
            'taxi_id' => $taxi->id,
            'driver_id' => $driver->id,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($staff, 'sanctum')->getJson('/api/bookings/'.$booking->id);
        $response->assertOk()
            ->assertJsonPath('customer_name', 'Single Booking Customer')
            ->assertJsonPath('taxi.reg_number', 'TEST-1003')
            ->assertJsonPath('driver.name', 'Test Driver');
    }

    public function test_bookings_can_be_filtered_by_date_preset_and_custom_range(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $taxi = $this->makeTaxi('TEST-FILTER-1');
        $driver = $this->makeDriver('TEST-FILTER-DRV-1');

        $today = now()->toDateString();
        $tomorrow = now()->addDay()->toDateString();
        $nextMonth = now()->addDays(40)->toDateString();

        Booking::create([
            'customer_name' => 'Today Customer',
            'customer_phone' => '+91 90000 00101',
            'pickup_date' => $today,
            'return_date' => $today,
            'pickup_location' => 'Airport',
            'drop_location' => 'Hotel',
            'taxi_id' => $taxi->id,
            'driver_id' => $driver->id,
            'status' => 'confirmed',
        ]);

        Booking::create([
            'customer_name' => 'Tomorrow Customer',
            'customer_phone' => '+91 90000 00102',
            'pickup_date' => $tomorrow,
            'return_date' => $tomorrow,
            'pickup_location' => 'Station',
            'drop_location' => 'Office',
            'taxi_id' => $taxi->id,
            'driver_id' => $driver->id,
            'status' => 'confirmed',
        ]);

        Booking::create([
            'customer_name' => 'Future Customer',
            'customer_phone' => '+91 90000 00103',
            'pickup_date' => $nextMonth,
            'return_date' => $nextMonth,
            'pickup_location' => 'Resort',
            'drop_location' => 'Airport',
            'taxi_id' => $taxi->id,
            'driver_id' => $driver->id,
            'status' => 'pending',
        ]);

        // Test 'today' preset
        $todayRes = $this->actingAs($staff, 'sanctum')->getJson('/api/bookings?date_preset=today');
        $todayRes->assertOk();
        $this->assertEquals(1, collect($todayRes->json('data'))->where('customer_name', 'Today Customer')->count());
        $this->assertEquals(0, collect($todayRes->json('data'))->where('customer_name', 'Tomorrow Customer')->count());

        // Test 'tomorrow' preset
        $tomRes = $this->actingAs($staff, 'sanctum')->getJson('/api/bookings?date_preset=tomorrow');
        $tomRes->assertOk();
        $this->assertEquals(1, collect($tomRes->json('data'))->where('customer_name', 'Tomorrow Customer')->count());
        $this->assertEquals(0, collect($tomRes->json('data'))->where('customer_name', 'Today Customer')->count());

        // Test custom date range (start_date and end_date)
        $rangeRes = $this->actingAs($staff, 'sanctum')->getJson("/api/bookings?start_date={$today}&end_date={$tomorrow}");
        $rangeRes->assertOk();
        $this->assertEquals(1, collect($rangeRes->json('data'))->where('customer_name', 'Today Customer')->count());
        $this->assertEquals(1, collect($rangeRes->json('data'))->where('customer_name', 'Tomorrow Customer')->count());
        $this->assertEquals(0, collect($rangeRes->json('data'))->where('customer_name', 'Future Customer')->count());

        // Test driver and taxi filter
        $taxiRes = $this->actingAs($staff, 'sanctum')->getJson("/api/bookings?taxi_id={$taxi->id}");
        $taxiRes->assertOk();
        $this->assertGreaterThanOrEqual(3, count($taxiRes->json('data')));
    }

    private function makeTaxi(string $registration): Taxi
    {
        return Taxi::create([
            'reg_number' => $registration,
            'vehicle_type' => 'sedan',
            'make_model' => 'Test Sedan',
            'year_of_manufacture' => 2024,
            'seating_capacity' => 4,
            'fuel_type' => 'petrol',
            'daily_rate' => 1500,
            'status' => 'available',
            'odometer_reading' => 0,
        ]);
    }

    private function makeDriver(string $license): Driver
    {
        return Driver::create([
            'name' => 'Test Driver',
            'phone' => '+91 '.random_int(9000000000, 9999999999),
            'license_number' => $license,
            'license_expiry' => '2028-01-01',
            'joining_date' => '2026-01-01',
            'status' => 'active',
        ]);
    }
}
