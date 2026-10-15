<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Office extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'address',
        'phone',
        'email',
        'status',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function taxis()
    {
        return $this->hasMany(Taxi::class);
    }

    public function drivers()
    {
        return $this->hasMany(Driver::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}
