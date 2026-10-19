<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    use HasFactory;

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'key',
        'value',
        'group',
        'description',
    ];

    public const CACHE_KEY = 'app_settings_dictionary';

    /**
     * Retrieve all settings key-value pairs from memory cache.
     */
    public static function getDictionary(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            return static::pluck('value', 'key')->all();
        });
    }

    /**
     * Get a specific setting value by key with optional fallback.
     */
    public static function getValue(string $key, $default = null)
    {
        $dictionary = static::getDictionary();

        return $dictionary[$key] ?? $default;
    }

    /**
     * Invalidate cached settings dictionary.
     */
    public static function flushCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
