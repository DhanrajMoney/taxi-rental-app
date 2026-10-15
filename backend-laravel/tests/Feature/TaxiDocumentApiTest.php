<?php

namespace Tests\Feature;

use App\Models\Taxi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TaxiDocumentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_upload_and_download_insurance_and_rc_documents_for_a_taxi(): void
    {
        Storage::fake('local');
        $staff = User::factory()->create(['role' => 'staff']);
        $taxi = $this->createTaxi('RRD-2200');

        $insurance = $this->actingAs($staff, 'sanctum')->post('/api/taxis/'.$taxi->id.'/documents', [
            'document_type' => 'insurance',
            'document' => UploadedFile::fake()->create('insurance.pdf', 100, 'application/pdf'),
        ]);

        $insurance->assertCreated()->assertJsonPath('document_type', 'insurance');
        $insurancePath = $taxi->documents()->where('document_type', 'insurance')->value('file_path');
        Storage::disk('local')->assertExists($insurancePath);

        $rc = $this->actingAs($staff, 'sanctum')->post('/api/taxis/'.$taxi->id.'/documents', [
            'document_type' => 'rc',
            'document' => UploadedFile::fake()->image('registration.png'),
        ]);

        $rc->assertCreated()->assertJsonPath('document_type', 'rc');
        $rcPath = $taxi->documents()->where('document_type', 'rc')->value('file_path');
        Storage::disk('local')->assertExists($rcPath);

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/taxis/'.$taxi->id.'/documents')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment(['document_type' => 'insurance'])
            ->assertJsonFragment(['document_type' => 'rc']);

        $this->actingAs($staff, 'sanctum')
            ->get('/api/taxis/'.$taxi->id.'/documents/'.$rc->json('id').'/file')
            ->assertOk()
            ->assertDownload('registration.png');
    }

    public function test_reupload_replaces_only_the_matching_document_and_removes_old_file(): void
    {
        Storage::fake('local');
        $staff = User::factory()->create(['role' => 'staff']);
        $taxi = $this->createTaxi('RRD-2201');
        $baseUrl = '/api/taxis/'.$taxi->id.'/documents';

        $firstInsurance = $this->actingAs($staff, 'sanctum')->post($baseUrl, [
            'document_type' => 'insurance',
            'document' => UploadedFile::fake()->create('insurance-old.pdf', 100, 'application/pdf'),
        ]);
        $firstInsurancePath = $taxi->documents()->where('document_type', 'insurance')->value('file_path');

        $rc = $this->actingAs($staff, 'sanctum')->post($baseUrl, [
            'document_type' => 'rc',
            'document' => UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf'),
        ]);
        $rcPath = $taxi->documents()->where('document_type', 'rc')->value('file_path');

        $replacement = $this->actingAs($staff, 'sanctum')->post($baseUrl, [
            'document_type' => 'insurance',
            'document' => UploadedFile::fake()->create('insurance-new.pdf', 120, 'application/pdf'),
        ]);

        $replacement->assertOk()->assertJsonPath('document_type', 'insurance');
        $this->assertSame(2, $taxi->documents()->count());
        Storage::disk('local')->assertMissing($firstInsurancePath);
        Storage::disk('local')->assertExists($rcPath);
        Storage::disk('local')->assertExists($taxi->documents()->where('document_type', 'insurance')->value('file_path'));
        $this->assertSame($firstInsurance->json('id'), $replacement->json('id'));
        $this->assertSame($rc->json('id'), $taxi->documents()->where('document_type', 'rc')->value('id'));
    }

    public function test_upload_validation_and_role_permissions_are_enforced(): void
    {
        Storage::fake('local');
        $taxi = $this->createTaxi('RRD-2202');
        $driver = User::factory()->create(['role' => 'driver']);
        $baseUrl = '/api/taxis/'.$taxi->id.'/documents';

        $this->getJson($baseUrl)->assertUnauthorized();

        $this->actingAs($driver, 'sanctum')
            ->post($baseUrl, [
                'document_type' => 'insurance',
                'document' => UploadedFile::fake()->create('insurance.pdf', 100, 'application/pdf'),
            ])
            ->assertForbidden();

        $staff = User::factory()->create(['role' => 'staff']);

        $this->actingAs($staff, 'sanctum')->post($baseUrl, [
            'document_type' => 'permit',
            'document' => UploadedFile::fake()->create('permit.pdf', 100, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('document_type');

        $this->actingAs($staff, 'sanctum')->post($baseUrl, [
            'document_type' => 'insurance',
            'document' => UploadedFile::fake()->create('insurance.txt', 100, 'text/plain'),
        ])->assertUnprocessable()->assertJsonValidationErrors('document');

    }

    public function test_documents_are_scoped_to_the_taxi_and_oversized_uploads_are_rejected(): void
    {
        Storage::fake('local');
        $staff = User::factory()->create(['role' => 'staff']);
        $taxi = $this->createTaxi('RRD-2203');
        $otherTaxi = $this->createTaxi('RRD-2204');

        $document = $this->actingAs($staff, 'sanctum')->post('/api/taxis/'.$taxi->id.'/documents', [
            'document_type' => 'insurance',
            'document' => UploadedFile::fake()->create('insurance.pdf', 100, 'application/pdf'),
        ]);
        $document->assertCreated();

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/taxis/'.$otherTaxi->id.'/documents')
            ->assertOk()
            ->assertJsonCount(0);

        $this->actingAs($staff, 'sanctum')
            ->get('/api/taxis/'.$otherTaxi->id.'/documents/'.$document->json('id').'/file')
            ->assertNotFound();

        $this->actingAs($staff, 'sanctum')->post('/api/taxis/'.$taxi->id.'/documents', [
            'document_type' => 'rc',
            'document' => UploadedFile::fake()->create('oversized.pdf', 5121, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('document');
    }

    public function test_staff_can_delete_taxi_document(): void
    {
        Storage::fake('local');
        $staff = User::factory()->create(['role' => 'staff']);
        $taxi = $this->createTaxi('RRD-2205');

        $doc = $this->actingAs($staff, 'sanctum')->post('/api/taxis/'.$taxi->id.'/documents', [
            'document_type' => 'insurance',
            'document' => UploadedFile::fake()->create('insurance.pdf', 100, 'application/pdf'),
        ])->assertCreated();

        $docId = $doc->json('id');
        $filePath = $taxi->documents()->find($docId)->file_path;
        Storage::disk('local')->assertExists($filePath);

        $this->actingAs($staff, 'sanctum')
            ->deleteJson('/api/taxis/'.$taxi->id.'/documents/'.$docId)
            ->assertOk();

        $this->assertDatabaseMissing('taxi_documents', ['id' => $docId]);
        Storage::disk('local')->assertMissing($filePath);
    }

    private function createTaxi(string $registrationNumber): Taxi
    {
        return Taxi::create([
            'reg_number' => $registrationNumber,
            'vehicle_type' => 'sedan',
            'make_model' => 'Test Sedan',
            'year_of_manufacture' => 2024,
            'seating_capacity' => 4,
            'fuel_type' => 'petrol',
            'daily_rate' => 1500,
            'status' => 'available',
        ]);
    }
}
