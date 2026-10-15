<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaintenanceRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'taxi_id',
        'service_date',
        'odometer_reading',
        'cost',
        'description',
        'next_service_date',
        'bill_path',
    ];

    protected $casts = [
        'service_date' => 'date:Y-m-d',
        'next_service_date' => 'date:Y-m-d',
        'cost' => 'decimal:2',
    ];

    public function taxi()
    {
        return $this->belongsTo(Taxi::class);
    }
}
