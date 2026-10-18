<?php

namespace Tests\Feature;

use App\Models\Taxi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TaxiPhotoAndOwnershipTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_taxi_with_ownership_and_photos(): void
    {
        Storage::fake('public');

        $user = User::factory()->create(['role' => 'admin']);

        $frontPhoto = UploadedFile::fake()->create('front.jpg', 100, 'image/jpeg');
        $backPhoto = UploadedFile::fake()->create('back.jpg', 100, 'image/jpeg');

        $response = $this->actingAs($user)->postJson('/api/taxis', [
            'reg_number' => 'DL01 AB 9999',
            'vehicle_type' => 'sedan',
            'make_model' => 'Honda City',
            'year_of_manufacture' => 2024,
            'seating_capacity' => 4,
            'fuel_type' => 'petrol',
            'pricing_type' => 'daily',
            'rate_amount' => 2500,
            'status' => 'available',
            'odometer_reading' => 12000,
            'ownership' => 'Company Owned',
            'photo_front' => $frontPhoto,
            'photo_back' => $backPhoto,
        ]);

        $response->assertCreated();
        $taxi = Taxi::where('reg_number', 'DL01 AB 9999')->first();
        $this->assertNotNull($taxi);
        $this->assertEquals('Company Owned', $taxi->ownership);
        $this->assertNotNull($taxi->photo_front_path);
        $this->assertNotNull($taxi->photo_back_path);

        Storage::disk('public')->assertExists($taxi->photo_front_path);
        Storage::disk('public')->assertExists($taxi->photo_back_path);

        $this->assertNotNull($taxi->photo_front_url);
        $this->assertNotNull($taxi->photo_back_url);
    }

    public function test_can_update_taxi_ownership_and_replace_photos(): void
    {
        Storage::fake('public');

        $user = User::factory()->create(['role' => 'admin']);

        $taxi = Taxi::create([
            'reg_number' => 'MH02 CD 4321',
            'vehicle_type' => 'suv',
            'make_model' => 'Tata Safari',
            'year_of_manufacture' => 2023,
            'seating_capacity' => 7,
            'fuel_type' => 'diesel',
            'daily_rate' => 3500,
            'rate_amount' => 3500,
            'status' => 'available',
            'ownership' => 'Leased',
            'photo_front_path' => 'taxis/photos/old_front.jpg',
            'photo_back_path' => 'taxis/photos/old_back.jpg',
        ]);

        Storage::disk('public')->put('taxis/photos/old_front.jpg', 'old_front');
        Storage::disk('public')->put('taxis/photos/old_back.jpg', 'old_back');

        $newFront = UploadedFile::fake()->create('new_front.jpg', 100, 'image/jpeg');

        $response = $this->actingAs($user)->postJson("/api/taxis/{$taxi->id}", [
            '_method' => 'PUT',
            'reg_number' => 'MH02 CD 4321',
            'vehicle_type' => 'suv',
            'make_model' => 'Tata Safari',
            'year_of_manufacture' => 2023,
            'seating_capacity' => 7,
            'fuel_type' => 'diesel',
            'pricing_type' => 'daily',
            'rate_amount' => 3500,
            'status' => 'available',
            'ownership' => 'Driver Attached',
            'photo_front' => $newFront,
            'remove_photo_back' => true,
        ]);

        $response->assertOk();
        $taxi->refresh();

        $this->assertEquals('Driver Attached', $taxi->ownership);
        $this->assertNotEquals('taxis/photos/old_front.jpg', $taxi->photo_front_path);
        Storage::disk('public')->assertMissing('taxis/photos/old_front.jpg');
        Storage::disk('public')->assertExists($taxi->photo_front_path);
        $this->assertNull($taxi->photo_back_path);
        Storage::disk('public')->assertMissing('taxis/photos/old_back.jpg');
    }

    public function test_can_attach_and_remove_document(): void
    {
        Storage::fake('public');

        $user = User::factory()->create(['role' => 'admin']);

        $doc = UploadedFile::fake()->create('rc_book.pdf', 150, 'application/pdf');

        $response = $this->actingAs($user)->postJson('/api/taxis', [
            'reg_number' => 'KA03 EF 5555',
            'vehicle_type' => 'sedan',
            'make_model' => 'Hyundai Verna',
            'year_of_manufacture' => 2024,
            'seating_capacity' => 4,
            'fuel_type' => 'petrol',
            'pricing_type' => 'daily',
            'rate_amount' => 2200,
            'status' => 'available',
            'document' => $doc,
        ]);

        $response->assertCreated();
        $taxi = Taxi::where('reg_number', 'KA03 EF 5555')->first();
        $this->assertNotNull($taxi->document_path);
        Storage::disk('public')->assertExists($taxi->document_path);
        $this->assertNotNull($taxi->document_url);

        // Now remove the document via update
        $updateResp = $this->actingAs($user)->postJson("/api/taxis/{$taxi->id}", [
            '_method' => 'PUT',
            'reg_number' => 'KA03 EF 5555',
            'vehicle_type' => 'sedan',
            'make_model' => 'Hyundai Verna',
            'year_of_manufacture' => 2024,
            'seating_capacity' => 4,
            'fuel_type' => 'petrol',
            'pricing_type' => 'daily',
            'rate_amount' => 2200,
            'status' => 'available',
            'remove_document' => true,
        ]);

        $updateResp->assertOk();
        $taxi->refresh();
        $this->assertNull($taxi->document_path);
    }
}
