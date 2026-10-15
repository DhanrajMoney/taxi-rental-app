<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drivers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('phone', 20)->unique();
            $table->string('email', 150)->nullable();
            $table->string('license_number', 50)->unique();
            $table->date('license_expiry');
            $table->text('address')->nullable();
            $table->date('joining_date');
            $table->enum('status', ['active', 'on_trip', 'on_leave', 'inactive'])->default('active');
            $table->string('photo_path')->nullable();
            $table->string('document_path')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drivers');
    }
};
