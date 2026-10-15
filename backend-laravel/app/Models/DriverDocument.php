<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DriverDocument extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'driver_id',
        'document_name',
        'type',
        'file_path',
        'file_size',
        'expiry_date',
        'status',
    ];

    protected $casts = [
        'expiry_date' => 'date',
    ];

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }
}
