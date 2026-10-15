<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DriverDocumentExpiryTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_counts_all_driver_document_expiry_alerts(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);

        Driver::create([
            'name' => 'Aarav Singh',
            'phone' => '+91 90000 20001',
            'email' => 'aarav@example.com',
            'license_number' => 'DL-1001',
            'license_expiry' => now()->subDays(5)->toDateString(),
            'insurance_expiry' => now()->addDays(12)->toDateString(),
            'document_expiry' => now()->addDays(20)->toDateString(),
            'required_document_expiry' => now()->addDays(40)->toDateString(),
            'joining_date' => now()->subYears(2)->toDateString(),
            'status' => 'active',
        ]);

        $response = $this->actingAs($staff, 'sanctum')->getJson('/api/dashboard/overview');

        $response
            ->assertOk()
            ->assertJsonPath('expiring_documents', 1);
    }

    public function test_driver_creation_accepts_document_expiry_dates(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);

        $response = $this->actingAs($staff, 'sanctum')->postJson('/api/drivers', [
            'name' => 'Naina Shah',
            'phone' => '+91 90000 30001',
            'email' => 'naina@example.com',
            'license_number' => 'DL-3001',
            'license_expiry' => now()->addMonths(6)->toDateString(),
            'insurance_expiry' => now()->addDays(15)->toDateString(),
            'document_expiry' => now()->addDays(30)->toDateString(),
            'required_document_expiry' => now()->addDays(45)->toDateString(),
            'joining_date' => now()->subMonths(2)->toDateString(),
            'status' => 'active',
        ]);

        $expectedInsurance = Carbon::parse(now()->addDays(15)->toDateString())->startOfDay()->toISOString();
        $expectedDocument = Carbon::parse(now()->addDays(30)->toDateString())->startOfDay()->toISOString();
        $expectedRequiredDocument = Carbon::parse(now()->addDays(45)->toDateString())->startOfDay()->toISOString();

        $response
            ->assertCreated()
            ->assertJsonPath('insurance_expiry', $expectedInsurance)
            ->assertJsonPath('document_expiry', $expectedDocument)
            ->assertJsonPath('required_document_expiry', $expectedRequiredDocument);
    }

    public function test_driver_creation_accepts_gender_and_uploads_photo(): void
    {
        Storage::fake('public');
        $staff = User::factory()->create(['role' => 'staff']);

        $response = $this->actingAs($staff, 'sanctum')->post('/api/drivers', [
            'name' => 'Mira Kapoor',
            'phone' => '+91 90000 40001',
            'gender' => 'female',
            'license_number' => 'DL-4001',
            'license_expiry' => now()->addYear()->toDateString(),
            'joining_date' => now()->toDateString(),
            'status' => 'active',
            'photo' => UploadedFile::fake()->create('driver.jpg', 1, 'image/jpeg'),
        ]);

        $response->assertCreated()->assertJsonPath('gender', 'female');
        Storage::disk('public')->assertExists($response->json('photo_path'));
    }

    public function test_driver_creation_rejects_an_unsupported_gender(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);

        $this->actingAs($staff, 'sanctum')->postJson('/api/drivers', [
            'name' => 'Sam Lee',
            'phone' => '+91 90000 40002',
            'gender' => 'unknown',
            'license_number' => 'DL-4002',
            'license_expiry' => now()->addYear()->toDateString(),
            'joining_date' => now()->toDateString(),
            'status' => 'active',
        ])->assertUnprocessable()->assertJsonValidationErrors('gender');
    }

    public function test_driver_update_without_a_new_photo_preserves_the_existing_photo(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('drivers/photos/existing.jpg', 'existing photo');
        $staff = User::factory()->create(['role' => 'staff']);
        $driver = Driver::create([
            'name' => 'Ari Patel',
            'phone' => '+91 90000 40003',
            'gender' => 'male',
            'license_number' => 'DL-4003',
            'license_expiry' => now()->addYear()->toDateString(),
            'joining_date' => now()->toDateString(),
            'status' => 'active',
            'photo_path' => 'drivers/photos/existing.jpg',
        ]);

        $this->actingAs($staff, 'sanctum')->post("/api/drivers/{$driver->id}", [
            '_method' => 'PUT',
            'name' => 'Ari Patel',
            'phone' => '+91 90000 40003',
            'gender' => 'other',
            'license_number' => 'DL-4003',
            'license_expiry' => now()->addYear()->toDateString(),
            'joining_date' => now()->toDateString(),
            'status' => 'active',
        ])->assertOk()->assertJsonPath('gender', 'other')
            ->assertJsonPath('photo_path', 'drivers/photos/existing.jpg');

        Storage::disk('public')->assertExists('drivers/photos/existing.jpg');
    }
}
