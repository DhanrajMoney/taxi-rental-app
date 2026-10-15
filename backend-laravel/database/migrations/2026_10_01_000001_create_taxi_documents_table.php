<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('taxi_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('taxi_id')->constrained()->cascadeOnDelete();
            $table->enum('document_type', ['insurance', 'rc']);
            $table->string('file_path');
            $table->string('original_filename');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->timestamps();

            $table->unique(['taxi_id', 'document_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('taxi_documents');
    }
};
