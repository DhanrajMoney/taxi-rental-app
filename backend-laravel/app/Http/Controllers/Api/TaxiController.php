<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaxiRequest;
use App\Models\MaintenanceRecord;
use App\Models\Taxi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TaxiController extends Controller
{
    // GET /api/taxis?search=&status=&type=&office_id=
    public function index(Request $request)
    {
        $query = Taxi::with(['driver', 'office']);
        $user = $request->user();

        if ($user?->role === 'staff' && $user->office_id) {
            $query->where('office_id', $user->office_id);
        } elseif ($officeId = $request->query('office_id')) {
            $query->where('office_id', $officeId);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('reg_number', 'like', "%{$search}%")
                    ->orWhere('make_model', 'like', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($type = $request->query('type')) {
            $query->where('vehicle_type', $type);
        }

        return response()->json(
            $query->latest()->paginate($request->integer('per_page', 15))
        );
    }

    // POST /api/taxis
    public function store(StoreTaxiRequest $request)
    {
        $data = $request->validated();
        if (empty($data['office_id']) && $request->user()?->office_id) {
            $data['office_id'] = $request->user()->office_id;
        }

        if ($request->hasFile('document')) {
            $data['document_path'] = $request->file('document')->store('taxis/documents', 'public');
        }

        $taxi = Taxi::create($data);

        return response()->json($taxi->load(['driver', 'office']), 201);
    }

    // GET /api/taxis/{taxi}
    public function show(Taxi $taxi)
    {
        return response()->json($taxi->load(['driver', 'office', 'documents']));
    }

    // PUT /api/taxis/{taxi}
    public function update(StoreTaxiRequest $request, Taxi $taxi)
    {
        $data = $request->validated();

        if ($request->hasFile('document')) {
            $data['document_path'] = $request->file('document')->store('taxis/documents', 'public');
        }

        $taxi->update($data);

        return response()->json($taxi->load(['driver', 'office']));
    }

    // DELETE /api/taxis/{taxi}  (soft delete)
    public function destroy(Taxi $taxi)
    {
        $localFilePaths = $taxi->documents()->pluck('file_path')
            ->merge(MaintenanceRecord::where('taxi_id', $taxi->id)->pluck('bill_path'))
            ->filter()
            ->all();
        $legacyDocumentPath = $taxi->document_path;

        $taxi->forceDelete();

        Storage::disk('local')->delete($localFilePaths);
        if ($legacyDocumentPath) {
            Storage::disk('public')->delete($legacyDocumentPath);
        }

        return response()->json(['message' => 'Taxi permanently deleted'], 200);
    }
}
