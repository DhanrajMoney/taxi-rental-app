<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaxiDocument extends Model
{
    protected $fillable = [
        'taxi_id', 'document_type', 'file_path', 'original_filename', 'mime_type', 'file_size',
    ];

    public function taxi()
    {
        return $this->belongsTo(Taxi::class);
    }
}
