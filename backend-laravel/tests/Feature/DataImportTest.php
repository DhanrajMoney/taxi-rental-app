<?php

namespace Tests\Feature;

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
        $this->assertDatabaseHas('import_logs', ['entity_type' => 'taxis', 'imported_rows' => 1]);
    }
}
