<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('pricing_type', 20)->nullable();
            $table->decimal('rate_amount', 10, 2)->nullable();
            $table->decimal('planned_distance_km', 10, 2)->nullable();
            $table->unsignedInteger('odometer_start')->nullable();
            $table->unsignedInteger('odometer_end')->nullable();
            $table->unsignedInteger('actual_distance_km')->nullable();
            $table->decimal('estimated_fare', 12, 2)->nullable();
            $table->decimal('final_fare', 12, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'pricing_type', 'rate_amount', 'planned_distance_km',
                'odometer_start', 'odometer_end', 'actual_distance_km',
                'estimated_fare', 'final_fare',
            ]);
        });
    }
};
