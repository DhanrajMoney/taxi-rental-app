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
                    ['MH-01-AB-1234', 'sedan', 'Toyota Etios 2021', '2021', '4', 'petrol', 'daily', '1500', 'available'],
                    ['DL-01-CD-5678', 'suv', 'Innova Crysta 2022', '2022', '7', 'diesel', 'per_km', '18', 'available'],
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
            'Content-Type' => 'text/csv; charset=UTF-8',
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

        // Strip UTF-8 Byte Order Mark (BOM) if present (common with Windows Excel exports)
        if (substr($content, 0, 3) === "\xEF\xBB\xBF") {
            $content = substr($content, 3);
        }

        $stream = fopen('php://temp', 'r+');
        fwrite($stream, $content);
        rewind($stream);

        $rawHeaders = fgetcsv($stream);
        if (! $rawHeaders || empty(array_filter($rawHeaders))) {
            fclose($stream);

            return response()->json(['message' => 'CSV file is empty or missing headers.'], 422);
        }

        // Clean & normalize headers (trim whitespace and convert to lowercase)
        $headers = array_map(fn ($h) => strtolower(trim((string) $h)), $rawHeaders);

        // Validate mandatory columns per entity
        $requiredHeaders = [
            'customers' => ['name', 'phone'],
            'taxis' => ['reg_number', 'make_model'],
            'drivers' => ['name', 'phone', 'license_number', 'license_expiry'],
            'bookings' => ['customer_name', 'customer_phone', 'taxi_reg_number', 'driver_license_number', 'pickup_date', 'return_date'],
        ];

        $missing = array_diff($requiredHeaders[$type] ?? [], $headers);
        if (! empty($missing)) {
            fclose($stream);

            return response()->json([
                'message' => 'CSV file is missing required column headers: '.implode(', ', $missing).'.',
            ], 422);
        }

        $previewRows = [];
        $validCount = 0;
        $invalidCount = 0;
        $duplicateCount = 0;
        $rowNumber = 1;

        // In-batch duplicate trackers
        $seenInBatch = [
            'phones' => [],
            'reg_numbers' => [],
            'license_numbers' => [],
        ];

        while (($data = fgetcsv($stream)) !== false) {
            $rowNumber++;

            // Skip completely empty lines
            if (empty(array_filter($data, fn ($val) => trim((string) $val) !== ''))) {
                continue;
            }

            // Map header names to values
            $mapped = [];
            foreach ($headers as $hIdx => $hName) {
                $mapped[$hName] = isset($data[$hIdx]) ? trim((string) $data[$hIdx]) : null;
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
                    } else {
                        $phone = $mapped['phone'];
                        if (isset($seenInBatch['phones'][$phone])) {
                            $status = 'duplicate';
                            $errors[] = 'Duplicate phone number found within this CSV file.';
                        } elseif (Customer::where('phone', $phone)->exists()) {
                            $status = 'duplicate';
                            $errors[] = 'Phone number already exists in customers directory.';
                        }
                        $seenInBatch['phones'][$phone] = true;
                    }
                    break;

                case 'taxis':
                    if (empty($mapped['reg_number'])) {
                        $errors[] = 'Registration number is required.';
                    }
                    if (empty($mapped['make_model'])) {
                        $errors[] = 'Make and model are required.';
                    }

                    // Normalize enum values to lowercase to match database definitions
                    if (! empty($mapped['vehicle_type'])) {
                        $vType = strtolower($mapped['vehicle_type']);
                        $mapped['vehicle_type'] = in_array($vType, ['sedan', 'suv', 'hatchback', 'mini_bus']) ? $vType : 'sedan';
                    } else {
                        $mapped['vehicle_type'] = 'sedan';
                    }

                    if (! empty($mapped['fuel_type'])) {
                        $fType = strtolower($mapped['fuel_type']);
                        $mapped['fuel_type'] = in_array($fType, ['petrol', 'diesel', 'cng', 'ev']) ? $fType : 'petrol';
                    } else {
                        $mapped['fuel_type'] = 'petrol';
                    }

                    if (! empty($mapped['pricing_type'])) {
                        $pType = strtolower($mapped['pricing_type']);
                        $mapped['pricing_type'] = in_array($pType, ['daily', 'per_km']) ? $pType : 'daily';
                    } else {
                        $mapped['pricing_type'] = 'daily';
                    }

                    if (! empty($mapped['rate_amount']) && ! is_numeric($mapped['rate_amount'])) {
                        $errors[] = 'Rate amount must be a numeric value.';
                    }

                    if (! empty($mapped['reg_number'])) {
                        $regNum = $mapped['reg_number'];
                        if (isset($seenInBatch['reg_numbers'][$regNum])) {
                            $status = 'duplicate';
                            $errors[] = 'Duplicate registration number found within this CSV file.';
                        } elseif (Taxi::where('reg_number', $regNum)->exists()) {
                            $status = 'duplicate';
                            $errors[] = 'Registration number already exists in fleet.';
                        }
                        $seenInBatch['reg_numbers'][$regNum] = true;
                    }
                    break;

                case 'drivers':
                    if (empty($mapped['name'])) {
                        $errors[] = 'Driver name is required.';
                    }
                    if (empty($mapped['license_number'])) {
                        $errors[] = 'License number is required.';
                    }
                    if (empty($mapped['license_expiry'])) {
                        $errors[] = 'License expiry date is required.';
                    } elseif (strtotime($mapped['license_expiry']) === false) {
                        $errors[] = 'Invalid license expiry date format.';
                    }

                    if (! empty($mapped['phone'])) {
                        $driverPhone = $mapped['phone'];
                        if (isset($seenInBatch['phones'][$driverPhone])) {
                            $status = 'duplicate';
                            $errors[] = 'Duplicate phone number found within this CSV file.';
                        } elseif (Driver::where('phone', $driverPhone)->exists()) {
                            $status = 'duplicate';
                            $errors[] = 'Phone number is already assigned to an existing driver.';
                        }
                        $seenInBatch['phones'][$driverPhone] = true;
                    }

                    if (! empty($mapped['license_number'])) {
                        $license = $mapped['license_number'];
                        if (isset($seenInBatch['license_numbers'][$license])) {
                            $status = 'duplicate';
                            $errors[] = 'Duplicate license number found within this CSV file.';
                        } elseif (Driver::where('license_number', $license)->exists()) {
                            $status = 'duplicate';
                            $errors[] = 'License number already exists in driver roster.';
                        }
                        $seenInBatch['license_numbers'][$license] = true;
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
                    } elseif (strtotime($mapped['pickup_date']) === false) {
                        $errors[] = 'Invalid pickup date format.';
                    }

                    if (empty($mapped['return_date'])) {
                        $errors[] = 'Return date is required.';
                    } elseif (strtotime($mapped['return_date']) === false) {
                        $errors[] = 'Invalid return date format.';
                    }

                    if (! empty($mapped['pickup_date']) && ! empty($mapped['return_date']) &&
                        strtotime($mapped['pickup_date']) !== false && strtotime($mapped['return_date']) !== false) {
                        if (strtotime($mapped['return_date']) < strtotime($mapped['pickup_date'])) {
                            $errors[] = 'Return date cannot be earlier than pickup date.';
                        }
                    }

                    // Default locations to ensure NOT NULL constraint is satisfied
                    if (empty($mapped['pickup_location'])) {
                        $mapped['pickup_location'] = 'HQ';
                    }
                    if (empty($mapped['drop_location'])) {
                        $mapped['drop_location'] = $mapped['pickup_location'] ?: 'HQ';
                    }

                    // Match taxi by reg_number
                    if (! empty($mapped['taxi_reg_number'])) {
                        $taxi = Taxi::where('reg_number', $mapped['taxi_reg_number'])->first();
                        if (! $taxi) {
                            $errors[] = "Taxi with registration '{$mapped['taxi_reg_number']}' not found in fleet.";
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
                            $errors[] = "Driver with license '{$mapped['driver_license_number']}' not found in roster.";
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

        fclose($stream);

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
            'duplicate_action' => ['nullable', 'string', 'in:update,skip'],
        ]);

        $type = $validated['entity_type'];
        $user = $request->user();
        $duplicateAction = $validated['duplicate_action'] ?? 'update';

        $imported = 0;
        $updated = 0;
        $skipped = 0;

        DB::beginTransaction();
        try {
            foreach ($validated['rows'] as $rowItem) {
                $data = $rowItem['mapped'];

                switch ($type) {
                    case 'customers':
                        $existing = Customer::where('phone', $data['phone'])->first();
                        if ($existing && $duplicateAction === 'skip') {
                            $skipped++;
                            break;
                        }

                        $customer = Customer::updateOrCreate(
                            ['phone' => $data['phone']],
                            [
                                'name' => $data['name'],
                                'email' => $data['email'] ?? null,
                                'address' => $data['address'] ?? null,
                                'office_id' => $user?->office_id ?? $existing?->office_id,
                            ]
                        );

                        if ($customer->wasRecentlyCreated) {
                            $imported++;
                        } else {
                            $updated++;
                        }
                        break;

                    case 'taxis':
                        $existing = Taxi::where('reg_number', $data['reg_number'])->first();
                        if ($existing && $duplicateAction === 'skip') {
                            $skipped++;
                            break;
                        }

                        $vType = strtolower($data['vehicle_type'] ?? 'sedan');
                        $fType = strtolower($data['fuel_type'] ?? 'petrol');
                        $pType = strtolower($data['pricing_type'] ?? 'daily');

                        $taxi = Taxi::updateOrCreate(
                            ['reg_number' => $data['reg_number']],
                            [
                                'vehicle_type' => in_array($vType, ['sedan', 'suv', 'hatchback', 'mini_bus']) ? $vType : 'sedan',
                                'make_model' => $data['make_model'],
                                'year_of_manufacture' => $data['year_of_manufacture'] ?? date('Y'),
                                'seating_capacity' => $data['seating_capacity'] ?? 4,
                                'fuel_type' => in_array($fType, ['petrol', 'diesel', 'cng', 'ev']) ? $fType : 'petrol',
                                'pricing_type' => in_array($pType, ['daily', 'per_km']) ? $pType : 'daily',
                                'rate_amount' => $data['rate_amount'] ?? 1500,
                                'daily_rate' => $data['rate_amount'] ?? 1500,
                                'status' => strtolower($data['status'] ?? 'available'),
                                'office_id' => $user?->office_id ?? $existing?->office_id,
                            ]
                        );

                        if ($taxi->wasRecentlyCreated) {
                            $imported++;
                        } else {
                            $updated++;
                        }
                        break;

                    case 'drivers':
                        $existing = Driver::where('license_number', $data['license_number'])->first();
                        if ($existing && $duplicateAction === 'skip') {
                            $skipped++;
                            break;
                        }

                        $driver = Driver::updateOrCreate(
                            ['license_number' => $data['license_number']],
                            [
                                'name' => $data['name'],
                                'phone' => $data['phone'] ?? '',
                                'email' => $data['email'] ?? null,
                                'gender' => $data['gender'] ?? null,
                                'license_expiry' => $data['license_expiry'],
                                'joining_date' => $data['joining_date'] ?? date('Y-m-d'),
                                'status' => strtolower($data['status'] ?? 'active'),
                                'office_id' => $user?->office_id ?? $existing?->office_id,
                            ]
                        );

                        if ($driver->wasRecentlyCreated) {
                            $imported++;
                        } else {
                            $updated++;
                        }
                        break;

                    case 'bookings':
                        // Ensure customer exists or create one
                        $customer = Customer::firstOrCreate(
                            ['phone' => $data['customer_phone']],
                            ['name' => $data['customer_name'], 'office_id' => $user?->office_id]
                        );

                        $pickupLoc = ! empty($data['pickup_location']) ? $data['pickup_location'] : 'HQ';
                        $dropLoc = ! empty($data['drop_location']) ? $data['drop_location'] : $pickupLoc;

                        Booking::create([
                            'customer_id' => $customer->id,
                            'customer_name' => $data['customer_name'],
                            'customer_phone' => $data['customer_phone'],
                            'taxi_id' => $data['taxi_id'],
                            'driver_id' => $data['driver_id'],
                            'pickup_date' => $data['pickup_date'],
                            'return_date' => $data['return_date'],
                            'pickup_location' => $pickupLoc,
                            'drop_location' => $dropLoc,
                            'status' => strtolower($data['status'] ?? 'confirmed'),
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
                'message' => "Import completed: {$imported} created, {$updated} updated, {$skipped} skipped.",
                'imported' => $imported,
                'updated' => $updated,
                'skipped' => $skipped,
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
                'updated_rows' => 0,
                'skipped_rows' => 0,
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
