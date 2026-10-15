<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Driver;
use App\Models\MaintenanceRecord;
use App\Models\Taxi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardOverviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_overview_returns_core_operational_metrics(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);

        $taxi = Taxi::create([
            'reg_number' => 'RRD-2001',
            'vehicle_type' => 'sedan',
            'make_model' => 'Maruti Dzire',
            'year_of_manufacture' => 2024,
            'seating_capacity' => 4,
            'fuel_type' => 'petrol',
            'daily_rate' => 1500,
            'status' => 'available',
            'odometer_reading' => 12000,
        ]);

        MaintenanceRecord::create([
            'taxi_id' => $taxi->id,
            'service_date' => now()->subDays(60)->toDateString(),
            'odometer_reading' => 12000,
            'next_service_date' => now()->addDays(15)->toDateString(),
        ]);

        Taxi::create([
            'reg_number' => 'RRD-2002',
            'vehicle_type' => 'suv',
            'make_model' => 'Kia Carens',
            'year_of_manufacture' => 2023,
            'seating_capacity' => 6,
            'fuel_type' => 'diesel',
            'daily_rate' => 2200,
            'status' => 'maintenance',
            'odometer_reading' => 42000,
        ]);

        Taxi::create([
            'reg_number' => 'RRD-2003',
            'vehicle_type' => 'sedan',
            'make_model' => 'Honda City',
            'year_of_manufacture' => 2022,
            'seating_capacity' => 4,
            'fuel_type' => 'petrol',
            'daily_rate' => 1800,
            'status' => 'available',
            'odometer_reading' => 26000,
        ]);

        Driver::create([
            'name' => 'Aarav',
            'phone' => '+91 90000 20001',
            'license_number' => 'DL-2001',
            'license_expiry' => '2028-01-01',
            'joining_date' => '2025-01-01',
            'status' => 'active',
        ]);

        Driver::create([
            'name' => 'Bhavna',
            'phone' => '+91 90000 20002',
            'license_number' => 'DL-2002',
            'license_expiry' => '2027-05-01',
            'joining_date' => '2025-02-01',
            'status' => 'active',
        ]);

        Driver::create([
            'name' => 'Chirag',
            'phone' => '+91 90000 20003',
            'license_number' => 'DL-2003',
            'license_expiry' => '2026-11-15',
            'joining_date' => '2024-01-01',
            'status' => 'on_leave',
        ]);

        Booking::create([
            'customer_name' => 'Upcoming One',
            'customer_phone' => '+91 98888 20001',
            'pickup_date' => now()->addDays(2)->toDateString(),
            'return_date' => now()->addDays(4)->toDateString(),
            'pickup_location' => 'Airport Terminal',
            'drop_location' => 'City Center',
            'status' => 'confirmed',
        ]);

        Booking::create([
            'customer_name' => 'Upcoming Two',
            'customer_phone' => '+91 98888 20002',
            'pickup_date' => now()->addDays(7)->toDateString(),
            'return_date' => now()->addDays(9)->toDateString(),
            'pickup_location' => 'City Center',
            'drop_location' => 'Airport Terminal',
            'status' => 'pending',
        ]);

        Booking::create([
            'customer_name' => 'Past One',
            'customer_phone' => '+91 98888 20003',
            'pickup_date' => now()->subDays(5)->toDateString(),
            'return_date' => now()->subDays(3)->toDateString(),
            'pickup_location' => 'Old Location',
            'drop_location' => 'Old End',
            'status' => 'completed',
        ]);

        $response = $this->actingAs($staff, 'sanctum')->getJson('/api/dashboard/overview');

        $response
            ->assertOk()
            ->assertJsonPath('total_taxis', 3)
            ->assertJsonPath('available_taxis', 2)
            ->assertJsonPath('taxis_in_maintenance', 1)
            ->assertJsonPath('total_drivers', 3)
            ->assertJsonPath('active_drivers', 2)
            ->assertJsonPath('upcoming_bookings', 2)
            ->assertJsonPath('maintenance_alerts', 1)
            ->assertJsonPath('recent_activity.0.customer_name', 'Upcoming Two');
    }
}
