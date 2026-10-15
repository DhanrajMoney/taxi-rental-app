<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DriverDocumentApiTest extends TestCase
{
    use RefreshDatabase;

    private function createDriver(): Driver
    {
        return Driver::create([
            'name' => 'Rajesh Driver',
            'phone' => '+91 98765 43210',
            'email' => 'driver@example.com',
            'license_number' => 'DL-998877',
            'license_expiry' => now()->addYear()->toDateString(),
            'joining_date' => now()->subMonths(6)->toDateString(),
            'status' => 'active',
        ]);
    }

    public function test_staff_can_upload_and_download_valid_driver_documents(): void
    {
        Storage::fake('local');
        $staff = User::factory()->create(['role' => 'staff']);
        $driver = $this->createDriver();

        $response = $this->actingAs($staff, 'sanctum')->post("/api/drivers/{$driver->id}/documents", [
            'document_name' => 'Driving License Copy',
            'type' => 'license',
            'file' => UploadedFile::fake()->create('license.pdf', 500, 'application/pdf'),
        ]);

        $response->assertStatus(201);
        $documentId = $response->json('id');
        $filePath = $response->json('file_path');

        Storage::disk('local')->assertExists($filePath);

        $downloadResponse = $this->actingAs($staff, 'sanctum')
            ->get("/api/drivers/{$driver->id}/documents/{$documentId}/file");

        $downloadResponse->assertOk();
    }

    public function test_rejects_unauthorized_extensions_like_php_or_exe(): void
    {
        Storage::fake('local');
        $staff = User::factory()->create(['role' => 'staff']);
        $driver = $this->createDriver();

        $response = $this->actingAs($staff, 'sanctum')->postJson("/api/drivers/{$driver->id}/documents", [
            'document_name' => 'exploit.php',
            'type' => 'license',
            'file' => UploadedFile::fake()->create('shell.php', 10, 'application/x-php'),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['file']);
    }

    public function test_staff_can_delete_driver_document(): void
    {
        Storage::fake('local');
        $staff = User::factory()->create(['role' => 'staff']);
        $driver = $this->createDriver();

        $doc = $driver->documents()->create([
            'document_name' => 'test.pdf',
            'type' => 'insurance',
            'file_path' => "driver_documents/{$driver->id}/test.pdf",
            'file_size' => '100 KB',
            'status' => 'Valid',
        ]);
        Storage::disk('local')->put($doc->file_path, 'dummy content');

        $response = $this->actingAs($staff, 'sanctum')
            ->deleteJson("/api/drivers/{$driver->id}/documents/{$doc->id}");

        $response->assertOk();
        Storage::disk('local')->assertMissing($doc->file_path);
        $this->assertSoftDeleted('driver_documents', ['id' => $doc->id]);
    }
}
