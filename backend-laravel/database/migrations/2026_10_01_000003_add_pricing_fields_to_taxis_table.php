<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('taxis', function (Blueprint $table) {
            $table->string('pricing_type', 20)->default('daily');
            $table->decimal('rate_amount', 10, 2)->default(0);
        });

        DB::table('taxis')->update(['rate_amount' => DB::raw('daily_rate')]);
    }

    public function down(): void
    {
        Schema::table('taxis', function (Blueprint $table) {
            $table->dropColumn(['pricing_type', 'rate_amount']);
        });
    }
};
