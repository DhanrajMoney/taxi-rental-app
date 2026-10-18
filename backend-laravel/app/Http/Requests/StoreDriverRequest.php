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

    protected function prepareForValidation(): void
    {
        $merge = [];
        if ($this->has('name')) {
            $merge['name'] = trim((string) $this->name);
        }
        if ($this->has('phone')) {
            $merge['phone'] = trim((string) $this->phone);
        }
        if ($this->has('emergency_number')) {
            $val = trim((string) $this->emergency_number);
            $merge['emergency_number'] = $val !== '' ? $val : null;
        }
        if ($this->has('email')) {
            $email = trim((string) $this->email);
            $merge['email'] = $email !== '' ? strtolower($email) : null;
        }
        if ($this->has('license_number')) {
            $merge['license_number'] = strtoupper(trim((string) $this->license_number));
        }

        if (! empty($merge)) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        $driverId = $this->route('driver')?->id;

        return [
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:20', Rule::unique('drivers', 'phone')->ignore($driverId)],
            'emergency_number' => ['nullable', 'string', 'max:25', 'different:phone'],
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

    public function messages(): array
    {
        return [
            'emergency_number.different' => 'Emergency number must be different from the driver contact phone.',
        ];
    }
}
