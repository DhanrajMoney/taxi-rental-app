<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_users(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $staff = User::factory()->create(['role' => 'staff']);
        $driver = User::factory()->create(['role' => 'driver']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/users')
            ->assertOk()
            ->assertJsonFragment(['email' => $admin->email])
            ->assertJsonFragment(['email' => $staff->email])
            ->assertJsonFragment(['email' => $driver->email]);
    }

    public function test_admin_can_assign_a_driver_profile_to_a_driver_account(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $driver = Driver::create([
            'name' => 'Assigned Driver',
            'phone' => '+91 90000 00111',
            'license_number' => 'DL-USER-LINK-1',
            'license_expiry' => '2028-01-01',
            'joining_date' => '2026-01-01',
            'status' => 'active',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/users', [
                'name' => 'Driver Login',
                'email' => 'driver-login@example.test',
                'password' => 'password',
                'role' => 'driver',
                'driver_id' => $driver->id,
            ])
            ->assertCreated()
            ->assertJsonPath('driver_id', $driver->id);
    }

    public function test_staff_and_driver_cannot_access_user_management(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $driver = User::factory()->create(['role' => 'driver']);

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/users')
            ->assertForbidden();

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/users', [
                'name' => 'Blocked Staff Creation',
                'email' => 'blocked@example.test',
                'password' => 'password123',
                'role' => 'staff',
            ])
            ->assertForbidden();

        $this->actingAs($driver, 'sanctum')
            ->getJson('/api/users')
            ->assertForbidden();

        $this->actingAs($driver, 'sanctum')
            ->postJson('/api/users', [
                'name' => 'Blocked Driver Creation',
                'email' => 'blocked2@example.test',
                'password' => 'password123',
                'role' => 'staff',
            ])
            ->assertForbidden();
    }
}
