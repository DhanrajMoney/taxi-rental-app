<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfileAndSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_change_password()
    {
        $user = User::factory()->create([
            'password' => Hash::make('oldpassword123'),
        ]);

        $response = $this->actingAs($user)->postJson('/api/profile/change-password', [
            'current_password' => 'oldpassword123',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Password changed successfully.');

        $this->assertTrue(Hash::check('newpassword123', $user->fresh()->password));
    }

    public function test_login_records_activity()
    {
        $user = User::factory()->create([
            'email' => 'testlog@ridedesk.test',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'testlog@ridedesk.test',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('login_activities', ['user_id' => $user->id]);
    }

    public function test_user_can_update_profile_name_and_email()
    {
        $user = User::factory()->create([
            'name' => 'Original Name',
            'email' => 'original@ridedesk.test',
        ]);

        $response = $this->actingAs($user)->putJson('/api/profile', [
            'name' => 'Updated Officer',
            'email' => 'updated.officer@ridedesk.test',
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Profile updated successfully.')
            ->assertJsonPath('user.name', 'Updated Officer')
            ->assertJsonPath('user.email', 'updated.officer@ridedesk.test');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Officer',
            'email' => 'updated.officer@ridedesk.test',
        ]);
    }
}
