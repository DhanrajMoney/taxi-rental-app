<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\MaintenanceRecord;
use App\Models\Taxi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TaxiDeletionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_permanently_delete_a_taxi_and_its_files(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        $staff = User::factory()->create(['role' => 'staff']);
        $taxi = Taxi::create([
            'reg_number' => 'RRD-2300',
            'vehicle_type' => 'sedan',
            'make_model' => 'Test Sedan',
            'year_of_manufacture' => 2024,
            'seating_capacity' => 4,
            'fuel_type' => 'petrol',
            'daily_rate' => 1500,
            'status' => 'available',
            'document_path' => 'taxis/documents/legacy.pdf',
        ]);

        $documentPath = 'taxis/'.$taxi->id.'/documents/insurance.pdf';
        $billPath = 'maintenance/bills/invoice.pdf';
        Storage::disk('local')->put($documentPath, 'insurance');
        Storage::disk('local')->put($billPath, 'bill');
        Storage::disk('public')->put('taxis/documents/legacy.pdf', 'legacy');

        $taxi->documents()->create([
            'document_type' => 'insurance',
            'file_path' => $documentPath,
            'original_filename' => 'insurance.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 9,
        ]);

        MaintenanceRecord::create([
            'taxi_id' => $taxi->id,
            'service_date' => '2026-09-15',
            'odometer_reading' => 36000,
            'cost' => 4200,
            'description' => 'Brake service',
            'bill_path' => $billPath,
        ]);

        $booking = Booking::create([
            'customer_name' => 'Test Customer',
            'customer_phone' => '5550100',
            'pickup_date' => '2026-10-05',
            'return_date' => '2026-10-06',
            'pickup_location' => 'Station',
            'drop_location' => 'Airport',
            'taxi_id' => $taxi->id,
            'status' => 'confirmed',
        ]);

        $this->actingAs($staff, 'sanctum')
            ->deleteJson('/api/taxis/'.$taxi->id)
            ->assertOk()
            ->assertJsonPath('message', 'Taxi permanently deleted');

        $this->assertDatabaseMissing('taxis', ['id' => $taxi->id]);
        $this->assertDatabaseMissing('maintenance_records', ['taxi_id' => $taxi->id]);
        $this->assertDatabaseMissing('taxi_documents', ['taxi_id' => $taxi->id]);
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'taxi_id' => null]);
        Storage::disk('local')->assertMissing($documentPath);
        Storage::disk('local')->assertMissing($billPath);
        Storage::disk('public')->assertMissing('taxis/documents/legacy.pdf');
    }
}
