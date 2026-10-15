<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->index(['status', 'deleted_at'], 'drivers_status_deleted_at_index');
            $table->index(['deleted_at', 'license_expiry'], 'drivers_deleted_at_license_expiry_index');
        });

        Schema::table('taxis', function (Blueprint $table) {
            $table->dropIndex('taxis_status_index');
            $table->index(['status', 'deleted_at'], 'taxis_status_deleted_at_index');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->index(
                ['taxi_id', 'status', 'pickup_date', 'return_date'],
                'bookings_taxi_status_pickup_return_index',
            );
            $table->index(
                ['driver_id', 'status', 'pickup_date', 'return_date'],
                'bookings_driver_status_pickup_return_index',
            );
        });

        Schema::table('maintenance_records', function (Blueprint $table) {
            $table->index(['taxi_id', 'service_date'], 'maintenance_taxi_service_date_index');
            $table->index('next_service_date', 'maintenance_next_service_date_index');
        });
    }

    public function down(): void
    {
        Schema::table('maintenance_records', function (Blueprint $table) {
            $table->dropIndex('maintenance_taxi_service_date_index');
            $table->dropIndex('maintenance_next_service_date_index');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('bookings_taxi_status_pickup_return_index');
            $table->dropIndex('bookings_driver_status_pickup_return_index');
        });

        Schema::table('taxis', function (Blueprint $table) {
            $table->dropIndex('taxis_status_deleted_at_index');
            $table->index('status', 'taxis_status_index');
        });

        Schema::table('drivers', function (Blueprint $table) {
            $table->dropIndex('drivers_status_deleted_at_index');
            $table->dropIndex('drivers_deleted_at_license_expiry_index');
        });
    }
};
