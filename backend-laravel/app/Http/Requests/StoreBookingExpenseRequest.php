<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBookingExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category' => ['required', 'string', Rule::in(['fuel', 'toll', 'parking', 'driver_allowance', 'permit', 'other'])],
            'amount' => ['required', 'numeric', 'gt:0', 'max:999999.99'],
            'payment_method' => ['required', 'string', Rule::in(['driver_cash', 'driver_upi', 'company_card', 'fastag', 'customer_paid'])],
            'is_billable' => ['nullable', 'boolean'],
            'expense_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'receipt' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'driver_id' => ['nullable', 'exists:drivers,id'],
            'office_id' => ['nullable', 'exists:offices,id'],
        ];
    }
}

