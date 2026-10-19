<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')->updateOrInsert(
            ['key' => 'company_gst_number'],
            [
                'value' => '27AADCR2345A1Z1',
                'group' => 'general',
                'description' => 'Company GST / Tax Identification Number (GSTIN)',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'company_gst_number')->delete();
    }
};

