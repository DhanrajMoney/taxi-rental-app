<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceRecord;
use App\Models\Taxi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MaintenanceController extends Controller
{
    public function index(Request $request)
    {
        $query = MaintenanceRecord::with(['taxi', 'taxi.office'])->latest('service_date');
        $user = $request->user();

        if ($user?->role === 'staff' && $user->office_id) {
            $query->whereHas('taxi', fn ($q) => $q->where('office_id', $user->office_id));
        } elseif ($officeId = $request->query('office_id')) {
            $query->whereHas('taxi', fn ($q) => $q->where('office_id', $officeId));
        }

        if ($taxiId = $request->query('taxi_id')) {
            $query->where('taxi_id', $taxiId);
        }

        $perPage = min(max($request->integer('per_page', 15), 1), 100);

        return response()->json($query->paginate($perPage));
    }

    public function show(MaintenanceRecord $maintenance)
    {
        return response()->json($maintenance->load(['taxi', 'taxi.office']));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'taxi_id' => ['required', 'exists:taxis,id'],
            'service_date' => ['required', 'date'],
            'odometer_reading' => ['required', 'integer', 'min:0'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'next_service_date' => ['nullable', 'date'],
            'bill' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        if ($request->hasFile('bill')) {
            $validated['bill_path'] = $request->file('bill')->store('maintenance/bills', 'local');
        }

        unset($validated['bill']);
        $record = MaintenanceRecord::create($validated);

        $taxi = Taxi::findOrFail($validated['taxi_id']);
        $taxi->update(['odometer_reading' => $validated['odometer_reading']]);

        return response()->json($record->load(['taxi', 'taxi.office']), 201);
    }

    public function update(Request $request, MaintenanceRecord $maintenance)
    {
        $validated = $request->validate([
            'taxi_id' => ['required', 'exists:taxis,id'],
            'service_date' => ['required', 'date'],
            'odometer_reading' => ['required', 'integer', 'min:0'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'next_service_date' => ['nullable', 'date'],
            'bill' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        $oldBillPath = $maintenance->bill_path;
        if ($request->hasFile('bill')) {
            $validated['bill_path'] = $request->file('bill')->store('maintenance/bills', 'local');
        }

        unset($validated['bill']);
        $maintenance->update($validated);
        if (isset($validated['bill_path']) && $oldBillPath) {
            Storage::disk('local')->delete($oldBillPath);
        }

        $taxi = Taxi::findOrFail($validated['taxi_id']);
        $taxi->update(['odometer_reading' => $validated['odometer_reading']]);

        return response()->json($maintenance->fresh()->load(['taxi', 'taxi.office']));
    }

    public function downloadBill(MaintenanceRecord $maintenance)
    {
        abort_if(! $maintenance->bill_path, 404);

        $extension = pathinfo($maintenance->bill_path, PATHINFO_EXTENSION);
        $filename = 'maintenance-'.$maintenance->id.'-bill'.($extension ? '.'.$extension : '');

        return Storage::disk('local')->download($maintenance->bill_path, $filename);
    }

    public function destroy(MaintenanceRecord $maintenance)
    {
        if ($maintenance->bill_path) {
            Storage::disk('local')->delete($maintenance->bill_path);
        }

        $maintenance->delete();

        return response()->json(['message' => 'Maintenance record removed']);
    }
}
