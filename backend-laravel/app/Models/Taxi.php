<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Taxi extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reg_number', 'vehicle_type', 'make_model', 'year_of_manufacture',
        'seating_capacity', 'fuel_type', 'pricing_type', 'rate_amount', 'daily_rate', 'status', 'driver_id', 'office_id',
        'odometer_reading', 'document_path', 'notes',
    ];

    protected $casts = [
        'rate_amount' => 'decimal:2',
        'daily_rate' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::saving(function (Taxi $taxi) {
            $taxi->pricing_type = $taxi->pricing_type ?: 'daily';

            if ((empty($taxi->rate_amount) || (float) $taxi->rate_amount == 0) && (float) $taxi->daily_rate > 0) {
                $taxi->rate_amount = $taxi->daily_rate;
            }

            if ($taxi->pricing_type === 'daily') {
                $taxi->daily_rate = $taxi->rate_amount;
            } else {
                $taxi->daily_rate = 0;
            }
        });
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function office()
    {
        return $this->belongsTo(Office::class);
    }

    public function documents()
    {
        return $this->hasMany(TaxiDocument::class);
    }
}
