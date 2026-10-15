<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Bookings optimizations
        Schema::table('bookings', function (Blueprint $table) {
            if (! Schema::hasIndex('bookings', 'bookings_status_pickup_date_index')) {
                $table->index(['status', 'pickup_date'], 'bookings_status_pickup_date_index');
            }
            if (! Schema::hasIndex('bookings', 'bookings_customer_phone_index')) {
                $table->index('customer_phone', 'bookings_customer_phone_index');
            }
        });

        // 2. Notifications optimizations
        Schema::table('notifications', function (Blueprint $table) {
            if (! Schema::hasIndex('notifications', 'notifications_user_read_created_index')) {
                $table->index(['user_id', 'read_at', 'created_at'], 'notifications_user_read_created_index');
            }
        });

        // 3. Driver Documents optimizations
        Schema::table('driver_documents', function (Blueprint $table) {
            if (! Schema::hasIndex('driver_documents', 'driver_docs_driver_status_index')) {
                $table->index(['driver_id', 'status'], 'driver_docs_driver_status_index');
            }
            if (! Schema::hasIndex('driver_documents', 'driver_docs_expiry_status_index')) {
                $table->index(['expiry_date', 'status'], 'driver_docs_expiry_status_index');
            }
        });

        // 4. Maintenance Records optimizations
        Schema::table('maintenance_records', function (Blueprint $table) {
            if (! Schema::hasIndex('maintenance_records', 'maintenance_service_date_index')) {
                $table->index('service_date', 'maintenance_service_date_index');
            }
        });

        // 5. Login Activities optimizations
        Schema::table('login_activities', function (Blueprint $table) {
            if (! Schema::hasIndex('login_activities', 'login_activities_user_logged_in_index')) {
                $table->index(['user_id', 'logged_in_at'], 'login_activities_user_logged_in_index');
            }
        });

        // 6. Import Logs optimizations
        Schema::table('import_logs', function (Blueprint $table) {
            if (! Schema::hasIndex('import_logs', 'import_logs_status_created_index')) {
                $table->index(['status', 'created_at'], 'import_logs_status_created_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('import_logs', function (Blueprint $table) {
            if (Schema::hasIndex('import_logs', 'import_logs_status_created_index')) {
                $table->dropIndex('import_logs_status_created_index');
            }
        });

        Schema::table('login_activities', function (Blueprint $table) {
            if (Schema::hasIndex('login_activities', 'login_activities_user_logged_in_index')) {
                $table->dropIndex('login_activities_user_logged_in_index');
            }
        });

        Schema::table('maintenance_records', function (Blueprint $table) {
            if (Schema::hasIndex('maintenance_records', 'maintenance_service_date_index')) {
                $table->dropIndex('maintenance_service_date_index');
            }
        });

        Schema::table('driver_documents', function (Blueprint $table) {
            if (Schema::hasIndex('driver_documents', 'driver_docs_expiry_status_index')) {
                $table->dropIndex('driver_docs_expiry_status_index');
            }
            if (Schema::hasIndex('driver_documents', 'driver_docs_driver_status_index')) {
                $table->dropIndex('driver_docs_driver_status_index');
            }
        });

        Schema::table('notifications', function (Blueprint $table) {
            if (Schema::hasIndex('notifications', 'notifications_user_read_created_index')) {
                $table->dropIndex('notifications_user_read_created_index');
            }
        });

        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasIndex('bookings', 'bookings_status_pickup_date_index')) {
                $table->dropIndex('bookings_status_pickup_date_index');
            }
            if (Schema::hasIndex('bookings', 'bookings_customer_phone_index')) {
                $table->dropIndex('bookings_customer_phone_index');
            }
        });
    }
};

