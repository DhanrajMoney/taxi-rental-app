<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Driver extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'phone', 'emergency_number', 'email', 'gender', 'license_number', 'license_expiry',
        'insurance_expiry', 'document_expiry', 'required_document_expiry',
        'address', 'joining_date', 'status', 'office_id', 'photo_path', 'document_path', 'notes',
    ];

    protected $casts = [
        'license_expiry' => 'date',
        'insurance_expiry' => 'date',
        'document_expiry' => 'date',
        'required_document_expiry' => 'date',
        'joining_date' => 'date',
    ];

    public function taxi()
    {
        return $this->hasOne(Taxi::class);
    }

    public function office()
    {
        return $this->belongsTo(Office::class);
    }

    public function documents()
    {
        return $this->hasMany(DriverDocument::class);
    }

    public function getDocumentStatusAttribute(): string
    {
        $documentDates = array_filter([
            $this->license_expiry?->toDateString(),
            $this->insurance_expiry?->toDateString(),
            $this->document_expiry?->toDateString(),
            $this->required_document_expiry?->toDateString(),
        ]);

        if (empty($documentDates)) {
            return 'unknown';
        }

        $today = now()->toDateString();
        $expiringSoon = now()->addDays(30)->toDateString();

        foreach ($documentDates as $documentDate) {
            if ($documentDate < $today) {
                return 'expired';
            }

            if ($documentDate <= $expiringSoon) {
                return 'expiring_soon';
            }
        }

        return 'ok';
    }
}
