<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDriverRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $driverId = $this->route('driver')?->id;

        return [
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:20', Rule::unique('drivers', 'phone')->ignore($driverId)],
            'email' => ['nullable', 'email', 'max:150'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other', 'prefer_not_to_say'])],
            'license_number' => ['required', 'string', 'max:50', Rule::unique('drivers', 'license_number')->ignore($driverId)],
            'license_expiry' => ['required', 'date'],
            'insurance_expiry' => ['nullable', 'date'],
            'document_expiry' => ['nullable', 'date'],
            'required_document_expiry' => ['nullable', 'date'],
            'address' => ['nullable', 'string'],
            'joining_date' => ['required', 'date'],
            'status' => ['required', Rule::in(['active', 'on_trip', 'on_leave', 'inactive'])],
            'office_id' => ['nullable', 'exists:offices,id'],
            'photo' => ['nullable', 'image', 'max:2048'],
            'document' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:4096'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
