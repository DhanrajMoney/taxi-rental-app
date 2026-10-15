<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_read_settings()
    {
        $user = User::factory()->create(['role' => 'staff']);

        $response = $this->actingAs($user)->getJson('/api/settings');

        $response->assertStatus(200)
            ->assertJsonPath('settings.company_name', 'Rent A Ride Desk');
    }

    public function test_admin_can_update_settings()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->putJson('/api/settings', [
            'settings' => [
                'company_name' => 'RideDesk Global Operations',
                'currency_symbol' => '$',
                'tax_percentage' => '7.50',
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('settings.company_name', 'RideDesk Global Operations')
            ->assertJsonPath('settings.currency_symbol', '$');

        $this->assertDatabaseHas('settings', [
            'key' => 'company_name',
            'value' => 'RideDesk Global Operations',
        ]);
    }

    public function test_staff_cannot_update_settings()
    {
        $staff = User::factory()->create(['role' => 'staff']);

        $response = $this->actingAs($staff)->putJson('/api/settings', [
            'settings' => [
                'company_name' => 'Unauthorized Change',
            ],
        ]);

        $response->assertStatus(403);
    }
}
