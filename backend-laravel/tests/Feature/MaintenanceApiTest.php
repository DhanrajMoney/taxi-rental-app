<?php

namespace Tests\Feature;

use App\Models\Taxi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MaintenanceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_upload_a_bill_for_a_maintenance_record(): void
    {
        Storage::fake('local');
        $staff = User::factory()->create(['role' => 'staff']);
        $taxi = Taxi::create([
            'reg_number' => 'RRD-2100',
            'vehicle_type' => 'sedan',
            'make_model' => 'Test Sedan',
            'year_of_manufacture' => 2024,
            'seating_capacity' => 4,
            'fuel_type' => 'petrol',
            'daily_rate' => 1500,
            'status' => 'maintenance',
            'odometer_reading' => 36000,
        ]);

        $response = $this->actingAs($staff, 'sanctum')->post('/api/maintenance', [
            'taxi_id' => $taxi->id,
            'service_date' => '2026-09-15',
            'odometer_reading' => 36000,
            'cost' => 4200,
            'description' => 'Brake service',
            'bill' => UploadedFile::fake()->create('invoice.pdf', 100, 'application/pdf'),
        ]);

        $response->assertCreated();
        $billPath = $response->json('bill_path');
        $this->assertNotEmpty($billPath);
        Storage::disk('local')->assertExists($billPath);
        $this->assertDatabaseHas('maintenance_records', [
            'id' => $response->json('id'),
            'bill_path' => $billPath,
        ]);

        $this->actingAs($staff, 'sanctum')
            ->get('/api/maintenance/'.$response->json('id').'/bill')
            ->assertOk()
            ->assertDownload('maintenance-'.$response->json('id').'-bill.pdf');

        $driver = User::factory()->create(['role' => 'driver']);
        $this->actingAs($driver, 'sanctum')
            ->getJson('/api/maintenance/'.$response->json('id').'/bill')
            ->assertForbidden();

        $this->actingAs($staff, 'sanctum')
            ->putJson('/api/maintenance/'.$response->json('id'), [
                'taxi_id' => $taxi->id,
                'service_date' => '2026-09-15',
                'odometer_reading' => 36000,
                'cost' => 4300,
                'description' => 'Updated brake service',
            ])
            ->assertOk()
            ->assertJsonPath('bill_path', $billPath);

        Storage::disk('local')->assertExists($billPath);

        $replacementResponse = $this->actingAs($staff, 'sanctum')->post('/api/maintenance/'.$response->json('id'), [
            '_method' => 'PUT',
            'taxi_id' => $taxi->id,
            'service_date' => '2026-09-15',
            'odometer_reading' => 36000,
            'cost' => 4300,
            'description' => 'Updated brake service',
            'bill' => UploadedFile::fake()->create('replacement.pdf', 120, 'application/pdf'),
        ]);

        $replacementResponse->assertOk();
        $replacementBillPath = $replacementResponse->json('bill_path');
        $this->assertNotSame($billPath, $replacementBillPath);
        Storage::disk('local')->assertMissing($billPath);
        Storage::disk('local')->assertExists($replacementBillPath);
    }

    public function test_staff_can_list_maintenance_records(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);

        $taxi = Taxi::create([
            'reg_number' => 'RRD-2101',
            'vehicle_type' => 'sedan',
            'make_model' => 'Maruti Dzire',
            'year_of_manufacture' => 2024,
            'seating_capacity' => 4,
            'fuel_type' => 'petrol',
            'daily_rate' => 1600,
            'status' => 'maintenance',
            'odometer_reading' => 36000,
        ]);

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/maintenance', [
                'taxi_id' => $taxi->id,
                'service_date' => '2026-09-15',
                'odometer_reading' => 36000,
                'cost' => 4200,
                'description' => 'Brake service',
                'next_service_date' => '2026-11-01',
            ])
            ->assertCreated();

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/maintenance')
            ->assertOk()
            ->assertJsonPath('data.0.taxi.reg_number', 'RRD-2101')
            ->assertJsonPath('data.0.description', 'Brake service')
            ->assertJsonPath('total', 1);
    }

    public function test_staff_can_update_and_delete_maintenance_records(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);

        $taxi = Taxi::create([
            'reg_number' => 'RRD-2102',
            'vehicle_type' => 'suv',
            'make_model' => 'Kia Carens',
            'year_of_manufacture' => 2023,
            'seating_capacity' => 6,
            'fuel_type' => 'diesel',
            'daily_rate' => 2200,
            'status' => 'maintenance',
            'odometer_reading' => 45000,
        ]);

        $record = $this->actingAs($staff, 'sanctum')
            ->postJson('/api/maintenance', [
                'taxi_id' => $taxi->id,
                'service_date' => '2026-09-20',
                'odometer_reading' => 45000,
                'cost' => 3000,
                'description' => 'Oil change',
                'next_service_date' => '2026-11-05',
            ])
            ->decodeResponseJson();

        $this->actingAs($staff, 'sanctum')
            ->putJson('/api/maintenance/'.$record['id'], [
                'taxi_id' => $taxi->id,
                'service_date' => '2026-09-22',
                'odometer_reading' => 46000,
                'cost' => 3600,
                'description' => 'Engine service',
                'next_service_date' => '2026-11-15',
            ])
            ->assertOk()
            ->assertJsonPath('description', 'Engine service');

        $this->actingAs($staff, 'sanctum')
            ->deleteJson('/api/maintenance/'.$record['id'])
            ->assertOk();
    }
}
