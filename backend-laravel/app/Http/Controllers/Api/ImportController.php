<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Customer;
use App\Models\Driver;
use App\Models\ImportLog;
use App\Models\Taxi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;

class ImportController extends Controller
{
    public function template(string $type)
    {
        $headers = [];
        $sample = [];

        switch ($type) {
            case 'customers':
                $headers = ['name', 'phone', 'email', 'address'];
                $sample = [
                    ['Rajesh Kumar', '+91 98765 43210', 'rajesh@example.com', '123 MG Road, Mumbai'],
                    ['Anita Verma', '+91 98765 43211', 'anita@example.com', '45 Park Street, Delhi'],
                ];
                break;
            case 'taxis':
                $headers = ['reg_number', 'vehicle_type', 'make_model', 'year_of_manufacture', 'seating_capacity', 'fuel_type', 'pricing_type', 'rate_amount', 'status'];
                $sample = [
                    ['MH-01-AB-1234', 'Sedan', 'Toyota Etios 2021', '2021', '4', 'Petrol', 'daily', '1500', 'available'],
                    ['DL-01-CD-5678', 'SUV', 'Innova Crysta 2022', '2022', '7', 'Diesel', 'per_km', '18', 'available'],
                ];
                break;
            case 'drivers':
                $headers = ['name', 'phone', 'email', 'gender', 'license_number', 'license_expiry', 'joining_date', 'status'];
                $sample = [
                    ['Aarav Mehta', '+91 99887 76655', 'aarav@example.com', 'male', 'DL-1420110012345', '2028-05-15', '2024-01-10', 'active'],
                    ['Diya Sharma', '+91 99887 76656', 'diya@example.com', 'female', 'DL-1420110012346', '2027-11-20', '2024-02-01', 'active'],
                ];
                break;
            case 'bookings':
                $headers = ['customer_name', 'customer_phone', 'taxi_reg_number', 'driver_license_number', 'pickup_date', 'return_date', 'pickup_location', 'drop_location', 'status'];
                $sample = [
                    ['Rajesh Kumar', '+91 98765 43210', 'MH-01-AB-1234', 'DL-1420110012345', '2026-10-10', '2026-10-12', 'Airport Terminal 1', 'Hotel Taj', 'confirmed'],
                ];
                break;
            default:
                return response()->json(['message' => 'Invalid template type.'], 400);
        }

        $output = implode(',', $headers)."\n";
        foreach ($sample as $row) {
            $output .= implode(',', array_map(fn ($v) => '"'.str_replace('"', '""', $v).'"', $row))."\n";
        }

        return Response::make($output, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$type}_import_template.csv\"",
        ]);
    }

    public function preview(Request $request)
    {
        $request->validate([
            'entity_type' => ['required', 'string', 'in:customers,taxis,drivers,bookings'],
            'file' => ['required', 'file', 'max:5120'], // 5MB max
        ]);

        $type = $request->input('entity_type');
        $file = $request->file('file');

        $content = file_get_contents($file->getRealPath());
        $lines = array_filter(array_map('trim', explode("\n", $content)));

        if (count($lines) < 2) {
            return response()->json(['message' => 'CSV file is empty or missing headers.'], 422);
        }

        $headerLine = array_shift($lines);
        $headers = array_map('trim', str_getcsv($headerLine));

        $previewRows = [];
        $validCount = 0;
        $invalidCount = 0;
        $duplicateCount = 0;

        foreach ($lines as $index => $line) {
            if (empty(trim($line))) {
                continue;
            }

            $rowNumber = $index + 2;
            $data = str_getcsv($line);

            // Map header to values
            $mapped = [];
            foreach ($headers as $hIdx => $hName) {
                $mapped[$hName] = isset($data[$hIdx]) ? trim($data[$hIdx]) : null;
            }

            $errors = [];
            $status = 'valid';

            // Validate based on entity type
            switch ($type) {
                case 'customers':
                    if (empty($mapped['name'])) {
                        $errors[] = 'Customer name is required.';
                    }
                    if (empty($mapped['phone'])) {
                        $errors[] = 'Phone number is required.';
                    } elseif (Customer::where('phone', $mapped['phone'])->exists()) {
                        $status = 'duplicate';
                        $errors[] = 'Phone number already exists in customers.';
                    }
                    break;

                case 'taxis':
                    if (empty($mapped['reg_number'])) {
                        $errors[] = 'Registration number is required.';
                    }
                    if (empty($mapped['make_model'])) {
                        $errors[] = 'Make and model are required.';
                    }
                    if (! empty($mapped['reg_number']) && Taxi::where('reg_number', $mapped['reg_number'])->exists()) {
                        $status = 'duplicate';
                        $errors[] = 'Registration number already exists.';
                    }
                    break;

                case 'drivers':
                    if (empty($mapped['name'])) {
                        $errors[] = 'Driver name is required.';
                    }
                    if (empty($mapped['license_number'])) {
                        $errors[] = 'License number is required.';
                    } elseif (Driver::where('license_number', $mapped['license_number'])->exists()) {
                        $status = 'duplicate';
                        $errors[] = 'License number already exists.';
                    }
                    if (empty($mapped['license_expiry'])) {
                        $errors[] = 'License expiry date is required.';
                    }
                    break;

                case 'bookings':
                    if (empty($mapped['customer_name'])) {
                        $errors[] = 'Customer name is required.';
                    }
                    if (empty($mapped['customer_phone'])) {
                        $errors[] = 'Customer phone is required.';
                    }
                    if (empty($mapped['pickup_date'])) {
                        $errors[] = 'Pickup date is required.';
                    }
                    if (empty($mapped['return_date'])) {
                        $errors[] = 'Return date is required.';
                    }

                    // Match taxi by reg_number
                    if (! empty($mapped['taxi_reg_number'])) {
                        $taxi = Taxi::where('reg_number', $mapped['taxi_reg_number'])->first();
                        if (! $taxi) {
                            $errors[] = "Taxi with registration {$mapped['taxi_reg_number']} not found.";
                        } else {
                            $mapped['taxi_id'] = $taxi->id;
                        }
                    } else {
                        $errors[] = 'Taxi registration number is required.';
                    }

                    // Match driver by license_number
                    if (! empty($mapped['driver_license_number'])) {
                        $driver = Driver::where('license_number', $mapped['driver_license_number'])->first();
                        if (! $driver) {
                            $errors[] = "Driver with license {$mapped['driver_license_number']} not found.";
                        } else {
                            $mapped['driver_id'] = $driver->id;
                        }
                    } else {
                        $errors[] = 'Driver license number is required.';
                    }
                    break;
            }

            if (! empty($errors) && $status !== 'duplicate') {
                $status = 'error';
            }

            if ($status === 'valid') {
                $validCount++;
            } elseif ($status === 'duplicate') {
                $duplicateCount++;
            } else {
                $invalidCount++;
            }

            $previewRows[] = [
                'row_number' => $rowNumber,
                'status' => $status,
                'mapped' => $mapped,
                'errors' => $errors,
            ];
        }

        return response()->json([
            'file_name' => $file->getClientOriginalName(),
            'entity_type' => $type,
            'total_rows' => count($previewRows),
            'valid_rows' => $validCount,
            'duplicate_rows' => $duplicateCount,
            'invalid_rows' => $invalidCount,
            'rows' => $previewRows,
        ]);
    }

    public function confirm(Request $request)
    {
        $validated = $request->validate([
            'entity_type' => ['required', 'string', 'in:customers,taxis,drivers,bookings'],
            'file_name' => ['required', 'string'],
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.mapped' => ['required', 'array'],
        ]);

        $type = $validated['entity_type'];
        $user = $request->user();

        $imported = 0;
        $updated = 0;
        $skipped = 0;

        DB::beginTransaction();
        try {
            foreach ($validated['rows'] as $rowItem) {
                $data = $rowItem['mapped'];

                switch ($type) {
                    case 'customers':
                        Customer::updateOrCreate(
                            ['phone' => $data['phone']],
                            [
                                'name' => $data['name'],
                                'email' => $data['email'] ?? null,
                                'address' => $data['address'] ?? null,
                                'office_id' => $user?->office_id,
                            ]
                        );
                        $imported++;
                        break;

                    case 'taxis':
                        Taxi::updateOrCreate(
                            ['reg_number' => $data['reg_number']],
                            [
                                'vehicle_type' => $data['vehicle_type'] ?? 'Sedan',
                                'make_model' => $data['make_model'],
                                'year_of_manufacture' => $data['year_of_manufacture'] ?? date('Y'),
                                'seating_capacity' => $data['seating_capacity'] ?? 4,
                                'fuel_type' => $data['fuel_type'] ?? 'Petrol',
                                'pricing_type' => $data['pricing_type'] ?? 'daily',
                                'rate_amount' => $data['rate_amount'] ?? 1500,
                                'daily_rate' => $data['rate_amount'] ?? 1500,
                                'status' => $data['status'] ?? 'available',
                                'office_id' => $user?->office_id,
                            ]
                        );
                        $imported++;
                        break;

                    case 'drivers':
                        Driver::updateOrCreate(
                            ['license_number' => $data['license_number']],
                            [
                                'name' => $data['name'],
                                'phone' => $data['phone'] ?? '',
                                'email' => $data['email'] ?? null,
                                'gender' => $data['gender'] ?? null,
                                'license_expiry' => $data['license_expiry'],
                                'joining_date' => $data['joining_date'] ?? date('Y-m-d'),
                                'status' => $data['status'] ?? 'active',
                                'office_id' => $user?->office_id,
                            ]
                        );
                        $imported++;
                        break;

                    case 'bookings':
                        // Ensure customer exists or create one
                        $customer = Customer::firstOrCreate(
                            ['phone' => $data['customer_phone']],
                            ['name' => $data['customer_name'], 'office_id' => $user?->office_id]
                        );

                        Booking::create([
                            'customer_id' => $customer->id,
                            'customer_name' => $data['customer_name'],
                            'customer_phone' => $data['customer_phone'],
                            'taxi_id' => $data['taxi_id'],
                            'driver_id' => $data['driver_id'],
                            'pickup_date' => $data['pickup_date'],
                            'return_date' => $data['return_date'],
                            'pickup_location' => $data['pickup_location'] ?? 'HQ',
                            'drop_location' => $data['drop_location'] ?? null,
                            'status' => $data['status'] ?? 'confirmed',
                            'office_id' => $user?->office_id,
                        ]);
                        $imported++;
                        break;
                }
            }

            $log = ImportLog::create([
                'user_id' => $user?->id,
                'entity_type' => $type,
                'file_name' => $validated['file_name'],
                'total_rows' => count($validated['rows']),
                'imported_rows' => $imported,
                'updated_rows' => $updated,
                'skipped_rows' => $skipped,
                'failed_rows' => 0,
                'status' => 'completed',
            ]);

            DB::commit();

            return response()->json([
                'message' => "Successfully imported {$imported} {$type} records.",
                'log' => $log,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            ImportLog::create([
                'user_id' => $user?->id,
                'entity_type' => $type,
                'file_name' => $validated['file_name'],
                'total_rows' => count($validated['rows']),
                'imported_rows' => 0,
                'failed_rows' => count($validated['rows']),
                'status' => 'failed',
                'details' => ['error' => $e->getMessage()],
            ]);

            return response()->json(['message' => 'Import failed: '.$e->getMessage()], 500);
        }
    }

    public function history()
    {
        return response()->json(
            ImportLog::with('user')->orderByDesc('created_at')->limit(50)->get()
        );
    }
}
