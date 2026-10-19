<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDriverRequest;
use App\Models\Driver;
use Illuminate\Http\Request;

class DriverController extends Controller
{
    // GET /api/drivers?search=&status=&office_id=
    public function index(Request $request)
    {
        $query = Driver::with(['office', 'documents', 'taxi']);
        $user = $request->user();

        if ($user?->role === 'staff' && $user->office_id) {
            $query->where('office_id', $user->office_id);
        } elseif ($officeId = $request->query('office_id')) {
            $query->where('office_id', $officeId);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('emergency_number', 'like', "%{$search}%")
                    ->orWhere('license_number', 'like', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $perPage = min(max($request->integer('per_page', 15), 1), 250);

        return response()->json(
            $query->latest()->paginate($perPage)
        );
    }

    // POST /api/drivers
    public function store(StoreDriverRequest $request)
    {
        $data = $request->validated();
        if (empty($data['office_id']) && $request->user()?->office_id) {
            $data['office_id'] = $request->user()->office_id;
        }

        if ($request->hasFile('photo')) {
            $data['photo_path'] = $request->file('photo')->store('drivers/photos', 'public');
        }
        if ($request->hasFile('document')) {
            $data['document_path'] = $request->file('document')->store('drivers/documents', 'public');
        }

        $driver = Driver::create($data);

        return response()->json($driver->load(['office', 'documents']), 201);
    }

    // GET /api/drivers/{driver}
    public function show(Driver $driver)
    {
        return response()->json($driver->load([
            'taxi',
            'office',
            'documents',
            'bookings' => fn ($q) => $q->latest('pickup_date')->take(5)->with('taxi'),
        ]));
    }

    // PUT /api/drivers/{driver}
    public function update(StoreDriverRequest $request, Driver $driver)
    {
        $data = $request->validated();

        if ($request->hasFile('photo')) {
            $data['photo_path'] = $request->file('photo')->store('drivers/photos', 'public');
        }
        if ($request->hasFile('document')) {
            $data['document_path'] = $request->file('document')->store('drivers/documents', 'public');
        }

        $driver->update($data);

        return response()->json($driver->load(['office', 'documents']));
    }

    // DELETE /api/drivers/{driver}  (soft delete)
    public function destroy(Driver $driver)
    {
        $driver->delete();

        return response()->json(['message' => 'Driver removed'], 200);
    }
}
