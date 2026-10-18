<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('taxis', function (Blueprint $table) {
            $table->string('ownership', 100)->nullable()->after('notes');
            $table->string('photo_front_path')->nullable()->after('ownership');
            $table->string('photo_back_path')->nullable()->after('photo_front_path');
        });
    }

    public function down(): void
    {
        Schema::table('taxis', function (Blueprint $table) {
            $table->dropColumn(['ownership', 'photo_front_path', 'photo_back_path']);
        });
    }
};

