<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->string('document_name');
            $table->string('type')->default('other'); // license, insurance, background_check, training, required, other
            $table->string('file_path');
            $table->string('file_size')->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('status')->default('Valid'); // Valid, Expiring soon, Expired
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_documents');
    }
};
