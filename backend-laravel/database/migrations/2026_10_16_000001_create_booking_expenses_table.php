<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('booking_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('drivers')->nullOnDelete();
            $table->foreignId('office_id')->nullable()->constrained('offices')->nullOnDelete();
            $table->string('category', 50); // fuel, toll, parking, driver_allowance, permit, other
            $table->decimal('amount', 10, 2);
            $table->string('payment_method', 50)->default('driver_cash'); // driver_cash, driver_upi, company_card, fastag, customer_paid
            $table->boolean('is_billable')->default(false);
            $table->string('status', 50)->default('pending_approval'); // pending_approval, approved, reimbursed, rejected
            $table->string('receipt_path')->nullable();
            $table->string('receipt_original_name')->nullable();
            $table->text('notes')->nullable();
            $table->date('expense_date');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['booking_id', 'status']);
            $table->index(['driver_id', 'status']);
            $table->index(['office_id', 'expense_date']);
            $table->index(['category', 'expense_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_expenses');
    }
};

