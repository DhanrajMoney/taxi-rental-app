<?php

namespace App\Http\Requests;

use App\Models\Taxi;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id' => ['nullable', 'exists:customers,id'],
            'office_id' => ['nullable', 'exists:offices,id'],
            'customer_name' => ['required', 'string', 'max:120'],
            'customer_phone' => ['required', 'string', 'max:30'],
            'pickup_date' => ['required', 'date'],
            'return_date' => ['required', 'date', 'after_or_equal:pickup_date'],
            'pickup_location' => ['required', 'string', 'max:180'],
            'drop_location' => ['required', 'string', 'max:180'],
            'taxi_id' => ['nullable', 'exists:taxis,id'],
            'driver_id' => ['nullable', 'exists:drivers,id'],
            'status' => ['required', Rule::in(['pending', 'confirmed', 'active', 'completed', 'cancelled'])],
            'planned_distance_km' => ['nullable', 'numeric', 'gt:0'],
            'odometer_end' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $taxiId = $this->input('taxi_id') ?? $this->route('booking')?->taxi_id;
            $taxi = $taxiId ? Taxi::find($taxiId) : null;
            $booking = $this->route('booking');

            if ($booking && in_array($booking->status, ['active', 'completed'], true)
                && $this->has('taxi_id') && (int) $this->input('taxi_id') !== (int) $booking->taxi_id) {
                $validator->errors()->add('taxi_id', 'The assigned taxi cannot be changed after the trip starts.');
            }

            if ($booking && $booking->status === 'completed') {
                if ($this->input('status') !== 'completed') {
                    $validator->errors()->add('status', 'A completed booking cannot be reopened.');
                }

                foreach (['pickup_date', 'return_date', 'planned_distance_km', 'odometer_end'] as $fareField) {
                    if ($this->has($fareField) && (string) $this->input($fareField) !== (string) $booking->{$fareField}) {
                        $validator->errors()->add($fareField, 'Fare details cannot be changed after a booking is completed.');
                    }
                }
            }

            if ($this->input('status') === 'active' && ! $taxiId) {
                $validator->errors()->add('taxi_id', 'A taxi must be assigned before a trip can start.');
            }

            if ($taxi?->pricing_type === 'per_km'
                && ! $this->input('planned_distance_km')
                && ! $booking?->planned_distance_km) {
                $validator->errors()->add('planned_distance_km', 'Enter a planned distance for a per-kilometer taxi.');
            }

            if ($this->input('status') === 'completed'
                && (! $booking || $booking->status !== 'completed')) {
                if (! $booking || $booking->status !== 'active') {
                    $validator->errors()->add('status', 'Start the trip before completing it.');
                } elseif ($this->input('odometer_end') === null) {
                    $validator->errors()->add('odometer_end', 'Enter the ending odometer reading.');
                } elseif ($booking->odometer_start !== null
                    && (int) $this->input('odometer_end') < (int) $booking->odometer_start) {
                    $validator->errors()->add('odometer_end', 'The ending reading cannot be below the starting reading.');
                }
            }
        });
    }
}
