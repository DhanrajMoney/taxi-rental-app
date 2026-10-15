<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('taxis', function (Blueprint $table) {
            $table->index(['office_id', 'status'], 'taxis_office_status_index');
        });

        Schema::table('drivers', function (Blueprint $table) {
            $table->index(['office_id', 'status'], 'drivers_office_status_index');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->index(['office_id', 'status'], 'bookings_office_status_index');
            $table->index(['customer_id', 'status'], 'bookings_customer_status_index');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index(['office_id', 'role'], 'users_office_role_index');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->index(['office_id', 'phone'], 'customers_office_phone_index');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex('customers_office_phone_index');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_office_role_index');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('bookings_office_status_index');
            $table->dropIndex('bookings_customer_status_index');
        });

        Schema::table('drivers', function (Blueprint $table) {
            $table->dropIndex('drivers_office_status_index');
        });

        Schema::table('taxis', function (Blueprint $table) {
            $table->dropIndex('taxis_office_status_index');
        });
    }
};
