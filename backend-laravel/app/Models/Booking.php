<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id', 'customer_name', 'customer_phone', 'pickup_date', 'return_date',
        'pickup_location', 'drop_location', 'taxi_id', 'driver_id', 'office_id', 'status', 'notes',
        'pricing_type', 'rate_amount', 'planned_distance_km', 'odometer_start',
        'odometer_end', 'actual_distance_km', 'estimated_fare', 'final_fare',
    ];

    protected $casts = [
        'pickup_date' => 'date:Y-m-d',
        'return_date' => 'date:Y-m-d',
        'rate_amount' => 'decimal:2',
        'planned_distance_km' => 'decimal:2',
        'estimated_fare' => 'decimal:2',
        'final_fare' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::saving(function (Booking $booking) {
            if ($booking->taxi_id && (empty($booking->rate_amount) || (float) $booking->rate_amount == 0)) {
                $taxi = $booking->relationLoaded('taxi') ? $booking->taxi : Taxi::find($booking->taxi_id);
                if ($taxi) {
                    $booking->pricing_type = $booking->pricing_type ?: ($taxi->pricing_type ?: 'daily');
                    $booking->rate_amount = (float) $taxi->rate_amount > 0 ? $taxi->rate_amount : $taxi->daily_rate;
                }
            }

            if (($booking->estimated_fare === null || (float) $booking->estimated_fare == 0) && $booking->rate_amount) {
                if ($booking->pricing_type === 'per_km' && $booking->planned_distance_km) {
                    $booking->estimated_fare = round((float) $booking->rate_amount * (float) $booking->planned_distance_km, 2);
                } elseif (($booking->pricing_type === 'daily' || empty($booking->pricing_type)) && $booking->pickup_date && $booking->return_date) {
                    $start = \Carbon\Carbon::parse($booking->getRawOriginal('pickup_date') ?: $booking->pickup_date)->startOfDay();
                    $end = \Carbon\Carbon::parse($booking->getRawOriginal('return_date') ?: $booking->return_date)->startOfDay();
                    $days = max(1, $start->diffInDays($end) + 1);
                    $booking->estimated_fare = round((float) $booking->rate_amount * $days, 2);
                }
            }
        });
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function taxi()
    {
        return $this->belongsTo(Taxi::class);
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function office()
    {
        return $this->belongsTo(Office::class);
    }
}
