<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->string('group')->default('general');
            $table->string('description')->nullable();
            $table->timestamps();
        });

        // Insert default initial settings
        $defaults = [
            ['key' => 'company_name', 'value' => 'Rent A Ride Desk', 'group' => 'general', 'description' => 'Business or company display name'],
            ['key' => 'company_gst_number', 'value' => '27AADCR2345A1Z1', 'group' => 'general', 'description' => 'Company GST / Tax Identification Number (GSTIN)'],
            ['key' => 'company_email', 'value' => 'admin@ridedesk.test', 'group' => 'general', 'description' => 'Primary operational email address'],
            ['key' => 'company_phone', 'value' => '+91 98765 43210', 'group' => 'general', 'description' => 'Primary operational contact phone'],
            ['key' => 'currency_symbol', 'value' => '₹', 'group' => 'general', 'description' => 'Display currency symbol'],
            ['key' => 'currency_code', 'value' => 'INR', 'group' => 'general', 'description' => 'Currency code'],
            ['key' => 'document_expiry_alert_days', 'value' => '30', 'group' => 'alerts', 'description' => 'Days threshold for driver document expiry warnings'],
            ['key' => 'maintenance_alert_days', 'value' => '30', 'group' => 'alerts', 'description' => 'Days threshold for upcoming maintenance warnings'],
            ['key' => 'default_booking_status', 'value' => 'pending', 'group' => 'operations', 'description' => 'Initial status for newly created bookings'],
            ['key' => 'tax_percentage', 'value' => '5.00', 'group' => 'finance', 'description' => 'Applicable tax percentage'],
            ['key' => 'terms_and_conditions', 'value' => 'Standard rental terms apply to all bookings.', 'group' => 'policy', 'description' => 'Rental agreement terms and conditions'],
        ];

        foreach ($defaults as $item) {
            DB::table('settings')->insert(array_merge($item, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
