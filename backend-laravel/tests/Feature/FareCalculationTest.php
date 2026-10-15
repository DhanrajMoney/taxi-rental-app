<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Taxi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FareCalculationTest extends TestCase
{
    use RefreshDatabase;

    public function test_per_kilometer_quote_is_finalized_from_actual_distance_and_rate_snapshot(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $taxi = $this->makeTaxi('per_km', 10, 500);

        $created = $this->actingAs($staff, 'sanctum')
            ->postJson('/api/bookings', $this->bookingPayload($taxi, [
                'planned_distance_km' => 20,
            ]))
            ->assertCreated()
            ->assertJsonPath('pricing_type', 'per_km')
            ->assertJsonPath('estimated_fare', '200.00');

        $bookingId = $created->json('id');
        $this->actingAs($staff, 'sanctum')
            ->putJson('/api/bookings/'.$bookingId, $this->bookingPayload($taxi, [
                'planned_distance_km' => 20,
                'status' => 'active',
            ]))
            ->assertOk()
            ->assertJsonPath('odometer_start', 500);

        $taxi->update(['rate_amount' => 25]);

        $this->actingAs($staff, 'sanctum')
            ->putJson('/api/bookings/'.$bookingId, $this->bookingPayload($taxi, [
                'planned_distance_km' => 20,
                'status' => 'completed',
                'odometer_end' => 560,
            ]))
            ->assertOk()
            ->assertJsonPath('rate_amount', '10.00')
            ->assertJsonPath('actual_distance_km', 60)
            ->assertJsonPath('final_fare', '600.00');

        $this->assertDatabaseHas('taxis', ['id' => $taxi->id, 'odometer_reading' => 560]);
        $this->assertDatabaseHas('bookings', ['id' => $bookingId, 'estimated_fare' => 200, 'final_fare' => 600]);
    }

    public function test_daily_booking_counts_pickup_and_return_dates(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $taxi = $this->makeTaxi('daily', 1500, 800);
        $payload = $this->bookingPayload($taxi, [
            'pickup_date' => '2026-10-01',
            'return_date' => '2026-10-03',
        ]);

        $created = $this->actingAs($staff, 'sanctum')
            ->postJson('/api/bookings', $payload)
            ->assertCreated()
            ->assertJsonPath('estimated_fare', '4500.00');

        $bookingId = $created->json('id');
        $this->actingAs($staff, 'sanctum')
            ->putJson('/api/bookings/'.$bookingId, [...$payload, 'status' => 'active'])
            ->assertOk();

        $this->actingAs($staff, 'sanctum')
            ->putJson('/api/bookings/'.$bookingId, [...$payload, 'status' => 'completed', 'odometer_end' => 825])
            ->assertOk()
            ->assertJsonPath('actual_distance_km', 25)
            ->assertJsonPath('final_fare', '4500.00');
    }

    public function test_trip_cannot_be_completed_with_a_lower_ending_odometer(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $taxi = $this->makeTaxi('per_km', 10, 500);
        $payload = $this->bookingPayload($taxi, ['planned_distance_km' => 20]);
        $booking = Booking::create([
            ...$payload,
            'pricing_type' => 'per_km',
            'rate_amount' => 10,
            'estimated_fare' => 200,
            'odometer_start' => 500,
            'status' => 'active',
        ]);

        $this->actingAs($staff, 'sanctum')
            ->putJson('/api/bookings/'.$booking->id, [
                ...$payload,
                'status' => 'completed',
                'odometer_end' => 499,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('odometer_end');

        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'active']);
    }

    public function test_per_kilometer_booking_requires_a_planned_distance(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $taxi = $this->makeTaxi('per_km', 10, 500);

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/bookings', $this->bookingPayload($taxi))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('planned_distance_km');
    }

    public function test_completed_booking_cannot_be_reopened_or_change_fare_dates(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $taxi = $this->makeTaxi('daily', 1500, 800);
        $booking = Booking::create([
            ...$this->bookingPayload($taxi),
            'pricing_type' => 'daily',
            'rate_amount' => 1500,
            'estimated_fare' => 1500,
            'odometer_start' => 800,
            'odometer_end' => 825,
            'actual_distance_km' => 25,
            'final_fare' => 1500,
            'status' => 'completed',
        ]);

        $this->actingAs($staff, 'sanctum')
            ->putJson('/api/bookings/'.$booking->id, [
                ...$this->bookingPayload($taxi, ['return_date' => '2026-10-02']),
                'status' => 'confirmed',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status', 'return_date']);
    }

    public function test_staff_can_create_a_per_kilometer_taxi(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/taxis', [
                'reg_number' => 'FARE-1001',
                'vehicle_type' => 'sedan',
                'make_model' => 'Test Sedan',
                'year_of_manufacture' => 2024,
                'seating_capacity' => 4,
                'fuel_type' => 'petrol',
                'pricing_type' => 'per_km',
                'rate_amount' => 12.5,
                'status' => 'available',
            ])
            ->assertCreated()
            ->assertJsonPath('pricing_type', 'per_km')
            ->assertJsonPath('rate_amount', '12.50');
    }

    public function test_legacy_daily_rate_payload_is_preserved_as_daily_pricing(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/taxis', [
                'reg_number' => 'FARE-1002',
                'vehicle_type' => 'sedan',
                'make_model' => 'Legacy Daily Sedan',
                'year_of_manufacture' => 2024,
                'seating_capacity' => 4,
                'fuel_type' => 'petrol',
                'daily_rate' => 1500,
                'status' => 'available',
            ])
            ->assertCreated()
            ->assertJsonPath('pricing_type', 'daily')
            ->assertJsonPath('rate_amount', '1500.00')
            ->assertJsonPath('daily_rate', '1500.00');
    }

    private function makeTaxi(string $pricingType, float $rate, int $odometer): Taxi
    {
        static $number = 1;

        return Taxi::create([
            'reg_number' => 'FARE-'.$number++,
            'vehicle_type' => 'sedan',
            'make_model' => 'Test Sedan',
            'year_of_manufacture' => 2024,
            'seating_capacity' => 4,
            'fuel_type' => 'petrol',
            'pricing_type' => $pricingType,
            'rate_amount' => $rate,
            'status' => 'available',
            'odometer_reading' => $odometer,
        ]);
    }

    private function bookingPayload(Taxi $taxi, array $overrides = []): array
    {
        return array_merge([
            'customer_name' => 'Fare Test Customer',
            'customer_phone' => '+91 90000 00100',
            'pickup_date' => '2026-10-01',
            'return_date' => '2026-10-01',
            'pickup_location' => 'Airport',
            'drop_location' => 'City Center',
            'taxi_id' => $taxi->id,
            'status' => 'pending',
        ], $overrides);
    }
}
