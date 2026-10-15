<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index()
    {
        $settings = Setting::all();
        $dictionary = [];
        foreach ($settings as $setting) {
            $dictionary[$setting->key] = $setting->value;
        }

        return response()->json([
            'settings' => $dictionary,
            'details' => $settings,
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*' => ['nullable', 'string'],
        ]);

        foreach ($data['settings'] as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }

        $allSettings = Setting::all();
        $dictionary = [];
        foreach ($allSettings as $setting) {
            $dictionary[$setting->key] = $setting->value;
        }

        return response()->json([
            'message' => 'Settings updated successfully.',
            'settings' => $dictionary,
        ]);
    }
}
