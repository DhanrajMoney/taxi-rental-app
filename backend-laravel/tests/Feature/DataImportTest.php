<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Driver;
use App\Models\Taxi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class DataImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_download_csv_template()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->get('/api/imports/templates/taxis');

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('reg_number,vehicle_type,make_model', $response->getContent());
    }

    public function test_import_preview_validates_and_detects_duplicates()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Taxi::create([
            'reg_number' => 'EXISTING-01',
            'make_model' => 'Honda City',
            'vehicle_type' => 'sedan',
            'year_of_manufacture' => 2021,
            'seating_capacity' => 4,
            'fuel_type' => 'petrol',
            'pricing_type' => 'daily',
            'rate_amount' => 1500,
            'status' => 'available',
        ]);

        $csvContent = "reg_number,vehicle_type,make_model,year_of_manufacture,seating_capacity,fuel_type,pricing_type,rate_amount,status\n".
            "EXISTING-01,sedan,Honda City,2021,4,petrol,daily,1500,available\n".
            "NEW-TAXI-02,suv,Innova Crysta,2023,7,diesel,daily,2500,available\n";

        $file = UploadedFile::fake()->createWithContent('taxis.csv', $csvContent);

        $response = $this->actingAs($admin)->postJson('/api/imports/preview', [
            'entity_type' => 'taxis',
            'file' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('total_rows', 2)
            ->assertJsonPath('duplicate_rows', 1)
            ->assertJsonPath('valid_rows', 1);
    }

    public function test_import_preview_strips_utf8_bom_and_normalizes_headers()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        // Prepended with UTF-8 BOM (\xEF\xBB\xBF) common in Excel exports on Windows
        $bomCsv = "\xEF\xBB\xBFNAME,PHONE,EMAIL,ADDRESS\n".
            "Alice Smith,+91 91234 56789,alice@example.com,78 Green Avenue\n";

        $file = UploadedFile::fake()->createWithContent('customers_bom.csv', $bomCsv);

        $response = $this->actingAs($admin)->postJson('/api/imports/preview', [
            'entity_type' => 'customers',
            'file' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('total_rows', 1)
            ->assertJsonPath('valid_rows', 1)
            ->assertJsonPath('rows.0.mapped.name', 'Alice Smith');
    }

    public function test_import_preview_detects_in_batch_duplicates()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        // CSV containing duplicate phone within the same batch
        $csvContent = "name,phone,email,address\n".
            "John Doe,+91 90000 00001,john@example.com,Address 1\n".
            "John Duplicate,+91 90000 00001,johndup@example.com,Address 2\n";

        $file = UploadedFile::fake()->createWithContent('batch_dups.csv', $csvContent);

        $response = $this->actingAs($admin)->postJson('/api/imports/preview', [
            'entity_type' => 'customers',
            'file' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('total_rows', 2)
            ->assertJsonPath('valid_rows', 1)
            ->assertJsonPath('duplicate_rows', 1)
            ->assertJsonPath('rows.1.status', 'duplicate');
    }

    public function test_import_confirm_creates_records_and_audit_log()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $rows = [
            [
                'mapped' => [
                    'reg_number' => 'IMP-TAXI-100',
                    'vehicle_type' => 'sedan',
                    'make_model' => 'Toyota Etios',
                    'year_of_manufacture' => '2022',
                    'seating_capacity' => '4',
                    'fuel_type' => 'petrol',
                    'pricing_type' => 'daily',
                    'rate_amount' => '1800',
                    'status' => 'available',
                ],
            ],
        ];

        $response = $this->actingAs($admin)->postJson('/api/imports/confirm', [
            'entity_type' => 'taxis',
            'file_name' => 'taxis.csv',
            'rows' => $rows,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('taxis', ['reg_number' => 'IMP-TAXI-100']);
        $this->assertDatabaseHas('import_logs', [
            'entity_type' => 'taxis',
            'imported_rows' => 1,
            'updated_rows' => 0,
        ]);
    }

    public function test_import_confirm_supports_skip_and_update_modes()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Customer::create([
            'name' => 'Existing Person',
            'phone' => '+91 88888 77777',
            'email' => 'old@example.com',
        ]);

        $rows = [
            [
                'mapped' => [
                    'name' => 'Updated Person',
                    'phone' => '+91 88888 77777',
                    'email' => 'new@example.com',
                ],
            ],
        ];

        // 1. Confirm with duplicate_action = skip
        $skipResponse = $this->actingAs($admin)->postJson('/api/imports/confirm', [
            'entity_type' => 'customers',
            'file_name' => 'customers.csv',
            'rows' => $rows,
            'duplicate_action' => 'skip',
        ]);

        $skipResponse->assertStatus(200);
        $this->assertDatabaseHas('customers', [
            'phone' => '+91 88888 77777',
            'email' => 'old@example.com',
        ]);
        $this->assertDatabaseHas('import_logs', [
            'skipped_rows' => 1,
            'imported_rows' => 0,
            'updated_rows' => 0,
        ]);

        // 2. Confirm with duplicate_action = update
        $updateResponse = $this->actingAs($admin)->postJson('/api/imports/confirm', [
            'entity_type' => 'customers',
            'file_name' => 'customers.csv',
            'rows' => $rows,
            'duplicate_action' => 'update',
        ]);

        $updateResponse->assertStatus(200);
        $this->assertDatabaseHas('customers', [
            'phone' => '+91 88888 77777',
            'email' => 'new@example.com',
        ]);
        $this->assertDatabaseHas('import_logs', [
            'imported_rows' => 0,
            'updated_rows' => 1,
        ]);
    }

    public function test_import_bookings_validates_and_defaults_locations()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $taxi = Taxi::create([
            'reg_number' => 'MH-02-ZZ-9999',
            'make_model' => 'Maruti Dzire',
            'vehicle_type' => 'sedan',
            'year_of_manufacture' => 2022,
            'seating_capacity' => 4,
            'fuel_type' => 'cng',
            'pricing_type' => 'daily',
            'rate_amount' => 1200,
            'status' => 'available',
        ]);

        $driver = Driver::create([
            'name' => 'Ramesh Driver',
            'phone' => '+91 97777 66666',
            'license_number' => 'DL-999888777',
            'license_expiry' => '2028-12-31',
            'joining_date' => '2024-01-01',
            'status' => 'active',
        ]);

        $rows = [
            [
                'mapped' => [
                    'customer_name' => 'Tourist Client',
                    'customer_phone' => '+91 95555 44444',
                    'taxi_id' => $taxi->id,
                    'driver_id' => $driver->id,
                    'pickup_date' => '2026-11-20',
                    'return_date' => '2026-11-22',
                    'pickup_location' => '',
                    'drop_location' => '',
                    'status' => 'confirmed',
                ],
            ],
        ];

        $response = $this->actingAs($admin)->postJson('/api/imports/confirm', [
            'entity_type' => 'bookings',
            'file_name' => 'bookings.csv',
            'rows' => $rows,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('bookings', [
            'customer_phone' => '+91 95555 44444',
            'pickup_location' => 'HQ',
            'drop_location' => 'HQ',
            'status' => 'confirmed',
        ]);
    }

    public function test_admin_can_download_bookings_template_with_historical_fields()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->get('/api/imports/templates/bookings');

        $response->assertStatus(200);
        $this->assertStringContainsString('final_fare', $response->getContent());
        $this->assertStringContainsString('odometer_start', $response->getContent());
        $this->assertStringContainsString('actual_distance_km', $response->getContent());
    }

    public function test_import_historical_completed_bookings_with_final_fare_and_unassigned_fleet()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        // Historical completed booking with unassigned fleet/driver and past dates
        $csvContent = "customer_name,customer_phone,taxi_reg_number,driver_license_number,pickup_date,return_date,pickup_location,drop_location,status,final_fare,pricing_type,rate_amount,odometer_start,odometer_end,actual_distance_km,notes\n".
            "Old Client,+91 94444 33333,,,2023-05-10,2023-05-12,Old Terminal,Old Hotel,completed,3500.00,daily,1750.00,10000,10250,250,Historical 2023 trip\n";

        $file = UploadedFile::fake()->createWithContent('old_bookings.csv', $csvContent);

        // 1. Preview
        $previewResponse = $this->actingAs($admin)->postJson('/api/imports/preview', [
            'entity_type' => 'bookings',
            'file' => $file,
        ]);

        $previewResponse->assertStatus(200)
            ->assertJsonPath('total_rows', 1)
            ->assertJsonPath('valid_rows', 1)
            ->assertJsonPath('rows.0.status', 'valid')
            ->assertJsonPath('rows.0.mapped.final_fare', '3500.00')
            ->assertJsonPath('rows.0.mapped.taxi_id', null)
            ->assertJsonPath('rows.0.mapped.driver_id', null);

        $mappedRows = $previewResponse->json('rows');

        // 2. Confirm
        $confirmResponse = $this->actingAs($admin)->postJson('/api/imports/confirm', [
            'entity_type' => 'bookings',
            'file_name' => 'old_bookings.csv',
            'rows' => $mappedRows,
        ]);

        $confirmResponse->assertStatus(200);

        $this->assertDatabaseHas('bookings', [
            'customer_phone' => '+91 94444 33333',
            'status' => 'completed',
            'final_fare' => 3500.00,
            'taxi_id' => null,
            'driver_id' => null,
            'actual_distance_km' => 250,
            'notes' => 'Historical 2023 trip',
        ]);

        // Customer was also auto-created
        $this->assertDatabaseHas('customers', [
            'phone' => '+91 94444 33333',
            'name' => 'Old Client',
        ]);
    }
}
