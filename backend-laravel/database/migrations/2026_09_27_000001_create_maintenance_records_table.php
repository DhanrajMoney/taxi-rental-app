<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('taxi_id')->constrained()->cascadeOnDelete();
            $table->date('service_date');
            $table->integer('odometer_reading')->unsigned();
            $table->decimal('cost', 10, 2)->default(0);
            $table->text('description')->nullable();
            $table->date('next_service_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_records');
    }
};
