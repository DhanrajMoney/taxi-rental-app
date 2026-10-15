<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->date('insurance_expiry')->nullable()->after('license_expiry');
            $table->date('document_expiry')->nullable()->after('insurance_expiry');
            $table->date('required_document_expiry')->nullable()->after('document_expiry');
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn(['insurance_expiry', 'document_expiry', 'required_document_expiry']);
        });
    }
};
