<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_staff_and_driver_can_login(): void
    {
        foreach (['admin', 'staff', 'driver'] as $role) {
            $user = User::factory()->create([
                'email' => $role.'@example.test',
                'password' => 'password',
                'role' => $role,
            ]);

            $response = $this->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'password',
            ]);

            $response->assertOk()
                ->assertJsonPath('user.email', $user->email)
                ->assertJsonPath('user.role', $role)
                ->assertJsonStructure(['token', 'user']);
        }
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        $user = User::factory()->create([
            'email' => 'staff@example.test',
            'password' => 'password',
            'role' => 'staff',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_authenticated_user_can_view_profile(): void
    {
        $user = User::factory()->create(['role' => 'driver']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('id', $user->id)
            ->assertJsonPath('role', 'driver');
    }

    public function test_logout_revokes_current_token(): void
    {
        $user = User::factory()->create(['role' => 'staff']);
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJson(['message' => 'Logged out successfully.']);

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
