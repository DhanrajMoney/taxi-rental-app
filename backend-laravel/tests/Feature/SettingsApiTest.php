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
            ->assertJsonPath('settings.company_name', 'Rent A Ride Desk')
            ->assertJsonPath('settings.company_gst_number', '27AADCR2345A1Z1');
    }

    public function test_admin_can_update_settings()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->putJson('/api/settings', [
            'settings' => [
                'company_name' => 'RideDesk Global Operations',
                'company_gst_number' => '07AAAAA0000A1Z5',
                'currency_symbol' => '$',
                'tax_percentage' => '7.50',
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('settings.company_name', 'RideDesk Global Operations')
            ->assertJsonPath('settings.company_gst_number', '07AAAAA0000A1Z5')
            ->assertJsonPath('settings.currency_symbol', '$');

        $this->assertDatabaseHas('settings', [
            'key' => 'company_gst_number',
            'value' => '07AAAAA0000A1Z5',
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

    public function test_cannot_update_settings_with_invalid_email()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->putJson('/api/settings', [
            'settings' => [
                'company_email' => 'invalid-email-address',
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['settings.company_email']);
    }

    public function test_cannot_update_settings_with_invalid_tax_percentage()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        // Test negative tax percentage
        $responseNegative = $this->actingAs($admin)->putJson('/api/settings', [
            'settings' => [
                'tax_percentage' => '-5',
            ],
        ]);
        $responseNegative->assertStatus(422)
            ->assertJsonValidationErrors(['settings.tax_percentage']);

        // Test tax percentage above 100
        $responseExcessive = $this->actingAs($admin)->putJson('/api/settings', [
            'settings' => [
                'tax_percentage' => '105.50',
            ],
        ]);
        $responseExcessive->assertStatus(422)
            ->assertJsonValidationErrors(['settings.tax_percentage']);

        // Test non-numeric tax percentage
        $responseNonNumeric = $this->actingAs($admin)->putJson('/api/settings', [
            'settings' => [
                'tax_percentage' => 'abc',
            ],
        ]);
        $responseNonNumeric->assertStatus(422)
            ->assertJsonValidationErrors(['settings.tax_percentage']);
    }

    public function test_cannot_update_settings_with_invalid_alert_days()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        // Test zero days
        $responseZero = $this->actingAs($admin)->putJson('/api/settings', [
            'settings' => [
                'document_expiry_alert_days' => 0,
                'maintenance_alert_days' => 0,
            ],
        ]);
        $responseZero->assertStatus(422)
            ->assertJsonValidationErrors(['settings.document_expiry_alert_days', 'settings.maintenance_alert_days']);

        // Test negative days
        $responseNegative = $this->actingAs($admin)->putJson('/api/settings', [
            'settings' => [
                'document_expiry_alert_days' => -15,
                'maintenance_alert_days' => -30,
            ],
        ]);
        $responseNegative->assertStatus(422)
            ->assertJsonValidationErrors(['settings.document_expiry_alert_days', 'settings.maintenance_alert_days']);

        // Test decimal values
        $responseDecimal = $this->actingAs($admin)->putJson('/api/settings', [
            'settings' => [
                'document_expiry_alert_days' => 14.5,
                'maintenance_alert_days' => 20.2,
            ],
        ]);
        $responseDecimal->assertStatus(422)
            ->assertJsonValidationErrors(['settings.document_expiry_alert_days', 'settings.maintenance_alert_days']);

        // Test non-numeric strings
        $responseString = $this->actingAs($admin)->putJson('/api/settings', [
            'settings' => [
                'document_expiry_alert_days' => 'two weeks',
                'maintenance_alert_days' => 'one month',
            ],
        ]);
        $responseString->assertStatus(422)
            ->assertJsonValidationErrors(['settings.document_expiry_alert_days', 'settings.maintenance_alert_days']);

        // Test exceeding upper bound (365 days)
        $responseExceeding = $this->actingAs($admin)->putJson('/api/settings', [
            'settings' => [
                'document_expiry_alert_days' => 400,
                'maintenance_alert_days' => 500,
            ],
        ]);
        $responseExceeding->assertStatus(422)
            ->assertJsonValidationErrors(['settings.document_expiry_alert_days', 'settings.maintenance_alert_days']);
    }

    public function test_admin_can_update_alert_days_with_valid_positive_integers()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->putJson('/api/settings', [
            'settings' => [
                'document_expiry_alert_days' => 45,
                'maintenance_alert_days' => 60,
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('settings.document_expiry_alert_days', '45')
            ->assertJsonPath('settings.maintenance_alert_days', '60');

        $this->assertDatabaseHas('settings', [
            'key' => 'document_expiry_alert_days',
            'value' => '45',
        ]);

        $this->assertDatabaseHas('settings', [
            'key' => 'maintenance_alert_days',
            'value' => '60',
        ]);
    }
}
