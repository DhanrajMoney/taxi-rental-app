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

    public function test_admin_can_update_user_without_changing_password(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $staff = User::factory()->create([
            'role' => 'staff',
            'name' => 'Old Name',
            'password' => 'original-secure-password',
        ]);

        $originalHash = $staff->password;

        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/users/{$staff->id}", [
                'name' => 'Updated Name',
                'email' => $staff->email,
                'role' => 'staff',
                'password' => '', // blank password should not alter existing password
            ]);

        $response->assertOk()
            ->assertJsonPath('name', 'Updated Name');

        $staff->refresh();
        $this->assertEquals('Updated Name', $staff->name);
        $this->assertEquals($originalHash, $staff->password);
    }

    public function test_admin_cannot_delete_their_own_account(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'admin']); // Ensure there is another admin

        $response = $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/users/{$admin->id}");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'You cannot delete your own account.');

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_admin_cannot_demote_their_own_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'admin']); // Another admin exists

        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/users/{$admin->id}", [
                'role' => 'staff',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'You cannot change your own role from administrator.');

        $admin->refresh();
        $this->assertEquals('admin', $admin->role);
    }

    public function test_cannot_delete_the_last_admin(): void
    {
        // Only 1 admin in the system
        $admin = User::factory()->create(['role' => 'admin']);
        $otherAdmin = User::factory()->create(['role' => 'admin']);

        // Delete otherAdmin first
        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/users/{$otherAdmin->id}")
            ->assertOk();

        // Now admin is the only admin, if another user could try to delete them or another token
        $staff = User::factory()->create(['role' => 'staff']);
        // If a request tried to delete the last admin:
        $response = $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/users/{$admin->id}");

        $response->assertStatus(422);
    }
}
