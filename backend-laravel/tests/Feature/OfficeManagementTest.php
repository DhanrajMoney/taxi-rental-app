<?php

namespace Tests\Feature;

use App\Models\Office;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfficeManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_office()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->postJson('/api/offices', [
            'name' => 'Downtown Branch',
            'address' => '100 Main St, City Center',
            'phone' => '+91 98765 00000',
            'email' => 'downtown@ridedesk.test',
            'status' => 'active',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('name', 'Downtown Branch');

        $this->assertDatabaseHas('offices', ['name' => 'Downtown Branch']);
    }

    public function test_staff_cannot_create_office()
    {
        $staff = User::factory()->create(['role' => 'staff']);

        $response = $this->actingAs($staff)->postJson('/api/offices', [
            'name' => 'North Branch',
        ]);

        $response->assertStatus(403);
    }

    public function test_staff_user_sees_office_scoped_records()
    {
        $officeA = Office::create(['name' => 'Branch A']);
        $officeB = Office::create(['name' => 'Branch B']);

        $staff = User::factory()->create(['role' => 'staff', 'office_id' => $officeA->id]);

        $this->actingAs($staff)->postJson('/api/taxis', [
            'reg_number' => 'MH-01-AX-1111',
            'vehicle_type' => 'sedan',
            'make_model' => 'Etios',
            'year_of_manufacture' => 2022,
            'seating_capacity' => 4,
            'fuel_type' => 'petrol',
            'pricing_type' => 'daily',
            'rate_amount' => 1500,
            'status' => 'available',
            'office_id' => $officeA->id,
        ]);

        $this->actingAs($staff)->postJson('/api/taxis', [
            'reg_number' => 'MH-02-BY-2222',
            'vehicle_type' => 'suv',
            'make_model' => 'Innova',
            'year_of_manufacture' => 2023,
            'seating_capacity' => 7,
            'fuel_type' => 'diesel',
            'pricing_type' => 'daily',
            'rate_amount' => 2500,
            'status' => 'available',
            'office_id' => $officeB->id,
        ]);

        $response = $this->actingAs($staff)->getJson('/api/taxis');
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('MH-01-AX-1111', $response->json('data.0.reg_number'));
    }
}
