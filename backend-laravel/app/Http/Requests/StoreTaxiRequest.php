<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaxiRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (! $this->has('rate_amount') && $this->has('daily_rate')) {
            $this->merge(['rate_amount' => $this->input('daily_rate')]);
        }

        if (! $this->has('pricing_type')) {
            $this->merge(['pricing_type' => 'daily']);
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $taxiId = $this->route('taxi')?->id;

        return [
            'reg_number' => ['required', 'string', 'max:30', Rule::unique('taxis', 'reg_number')->ignore($taxiId)],
            'vehicle_type' => ['required', Rule::in(['sedan', 'suv', 'hatchback', 'mini_bus'])],
            'make_model' => ['required', 'string', 'max:100'],
            'year_of_manufacture' => ['required', 'integer', 'min:1990', 'max:'.(date('Y') + 1)],
            'seating_capacity' => ['required', 'integer', 'min:1', 'max:60'],
            'fuel_type' => ['required', Rule::in(['petrol', 'diesel', 'cng', 'ev'])],
            'pricing_type' => ['required', Rule::in(['daily', 'per_km'])],
            'rate_amount' => ['required', 'numeric', 'min:0'],
            'daily_rate' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['available', 'on_rent', 'maintenance', 'inactive'])],
            'driver_id' => ['nullable', 'exists:drivers,id'],
            'office_id' => ['nullable', 'exists:offices,id'],
            'odometer_reading' => ['nullable', 'integer', 'min:0'],
            'document' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:4096'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
