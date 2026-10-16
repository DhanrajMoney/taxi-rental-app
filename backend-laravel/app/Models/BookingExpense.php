<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BookingExpense extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'driver_id',
        'office_id',
        'category',
        'amount',
        'payment_method',
        'is_billable',
        'status',
        'receipt_path',
        'receipt_original_name',
        'notes',
        'expense_date',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_billable' => 'boolean',
        'expense_date' => 'date:Y-m-d',
        'approved_at' => 'datetime',
    ];

    protected $appends = [
        'receipt_url',
        'category_label',
        'payment_method_label',
    ];

    public const CATEGORIES = [
        'fuel' => 'Fuel & Energy',
        'toll' => 'Tolls & FASTag',
        'parking' => 'Parking Charges',
        'driver_allowance' => 'Driver Allowance (Bata)',
        'permit' => 'Border & Permits',
        'other' => 'Incidentals & Repairs',
    ];

    public const PAYMENT_METHODS = [
        'driver_cash' => 'Driver Cash',
        'driver_upi' => 'Driver UPI',
        'company_card' => 'Company Card',
        'fastag' => 'FASTag (Company)',
        'customer_paid' => 'Customer Direct Paid',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function office()
    {
        return $this->belongsTo(Office::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function getReceiptUrlAttribute(): ?string
    {
        if (! $this->receipt_path) {
            return null;
        }

        return url("/api/expenses/{$this->id}/receipt");
    }

    public function getCategoryLabelAttribute(): string
    {
        return self::CATEGORIES[$this->category] ?? ucfirst($this->category);
    }

    public function getPaymentMethodLabelAttribute(): string
    {
        return self::PAYMENT_METHODS[$this->payment_method] ?? ucfirst(str_replace('_', ' ', $this->payment_method));
    }
}

