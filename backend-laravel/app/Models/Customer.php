<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'address',
        'office_id',
    ];

    public function office()
    {
        return $this->belongsTo(Office::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}
