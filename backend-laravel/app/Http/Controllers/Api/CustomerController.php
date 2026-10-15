<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::with('office');

        if ($request->user()?->role === 'staff' && $request->user()->office_id) {
            $query->where('office_id', $request->user()->office_id);
        } elseif ($officeId = $request->query('office_id')) {
            $query->where('office_id', $officeId);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return response()->json(
            $query->orderBy('name')->paginate($request->integer('per_page', 20))
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50', 'unique:customers,phone'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'office_id' => ['nullable', 'exists:offices,id'],
        ]);

        $customer = Customer::create($validated);

        return response()->json($customer->load('office'), 201);
    }

    public function show(Customer $customer)
    {
        return response()->json($customer->load(['office', 'bookings.taxi', 'bookings.driver']));
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'required', 'string', 'max:50', 'unique:customers,phone,'.$customer->id],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'office_id' => ['nullable', 'exists:offices,id'],
        ]);

        $customer->update($validated);

        return response()->json($customer->load('office'));
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();

        return response()->json(['message' => 'Customer deleted successfully.']);
    }
}
