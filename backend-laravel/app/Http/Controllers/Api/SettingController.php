<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingController extends Controller
{
    public function index()
    {
        return response()->json([
            'settings' => Setting::getDictionary(),
            'details' => Setting::all(),
        ]);
    }

    public function update(Request $request)
    {
        $allowedKeys = [
            'company_name',
            'company_gst_number',
            'company_email',
            'company_phone',
            'currency_symbol',
            'currency_code',
            'tax_percentage',
            'document_expiry_alert_days',
            'maintenance_alert_days',
            'default_booking_status',
            'terms_and_conditions',
        ];

        $data = $request->validate([
            'settings' => ['required', 'array'],
            'settings.company_name' => ['nullable', 'string', 'max:150'],
            'settings.company_gst_number' => ['nullable', 'string', 'max:20'],
            'settings.company_email' => ['nullable', 'email', 'max:150'],
            'settings.company_phone' => ['nullable', 'string', 'max:50'],
            'settings.currency_symbol' => ['nullable', 'string', 'max:10'],
            'settings.currency_code' => ['nullable', 'string', 'size:3'],
            'settings.tax_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'settings.document_expiry_alert_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'settings.maintenance_alert_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'settings.default_booking_status' => ['nullable', 'in:pending,confirmed'],
            'settings.terms_and_conditions' => ['nullable', 'string', 'max:5000'],
        ], [
            'settings.company_email.email' => 'The company email must be a valid email address.',
            'settings.tax_percentage.numeric' => 'The tax percentage must be a number.',
            'settings.tax_percentage.min' => 'The tax percentage must be at least 0%.',
            'settings.tax_percentage.max' => 'The tax percentage cannot exceed 100%.',
            'settings.currency_code.size' => 'The currency code must be a 3-letter ISO code.',
            'settings.document_expiry_alert_days.integer' => 'Document expiry alert days must be a whole number.',
            'settings.document_expiry_alert_days.min' => 'Document expiry alert days must be at least 1 day.',
            'settings.document_expiry_alert_days.max' => 'Document expiry alert days cannot exceed 365 days.',
            'settings.maintenance_alert_days.integer' => 'Maintenance alert days must be a whole number.',
            'settings.maintenance_alert_days.min' => 'Maintenance alert days must be at least 1 day.',
            'settings.maintenance_alert_days.max' => 'Maintenance alert days cannot exceed 365 days.',
        ]);

        DB::transaction(function () use ($data, $allowedKeys) {
            foreach ($data['settings'] as $key => $value) {
                if (in_array($key, $allowedKeys, true)) {
                    Setting::updateOrCreate(
                        ['key' => $key],
                        ['value' => $value !== null ? (string) $value : null]
                    );
                }
            }
            Setting::flushCache();
        });

        return response()->json([
            'message' => 'Settings updated successfully.',
            'settings' => Setting::getDictionary(),
        ]);
    }
}
