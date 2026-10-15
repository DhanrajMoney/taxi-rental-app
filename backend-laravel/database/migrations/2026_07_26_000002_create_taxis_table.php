<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('taxis', function (Blueprint $table) {
            $table->id();
            $table->string('reg_number', 30)->unique();
            $table->enum('vehicle_type', ['sedan', 'suv', 'hatchback', 'mini_bus']);
            $table->string('make_model', 100);
            $table->smallInteger('year_of_manufacture');
            $table->tinyInteger('seating_capacity');
            $table->enum('fuel_type', ['petrol', 'diesel', 'cng', 'ev']);
            $table->decimal('daily_rate', 10, 2);
            $table->enum('status', ['available', 'on_rent', 'maintenance', 'inactive'])->default('available');
            $table->foreignId('driver_id')->nullable()->constrained('drivers')->nullOnDelete();
            $table->unsignedInteger('odometer_reading')->default(0);
            $table->string('document_path')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('taxis');
    }
};
