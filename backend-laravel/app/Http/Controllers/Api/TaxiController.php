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

        if ($request->hasFile('photo_front')) {
            $data['photo_front_path'] = $request->file('photo_front')->store('taxis/photos', 'public');
        }

        if ($request->hasFile('photo_back')) {
            $data['photo_back_path'] = $request->file('photo_back')->store('taxis/photos', 'public');
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
            if ($taxi->document_path) {
                Storage::disk('public')->delete($taxi->document_path);
            }
            $data['document_path'] = $request->file('document')->store('taxis/documents', 'public');
        } elseif ($request->boolean('remove_document')) {
            if ($taxi->document_path) {
                Storage::disk('public')->delete($taxi->document_path);
            }
            $data['document_path'] = null;
        }

        if ($request->hasFile('photo_front')) {
            if ($taxi->photo_front_path) {
                Storage::disk('public')->delete($taxi->photo_front_path);
            }
            $data['photo_front_path'] = $request->file('photo_front')->store('taxis/photos', 'public');
        } elseif ($request->boolean('remove_photo_front')) {
            if ($taxi->photo_front_path) {
                Storage::disk('public')->delete($taxi->photo_front_path);
            }
            $data['photo_front_path'] = null;
        }

        if ($request->hasFile('photo_back')) {
            if ($taxi->photo_back_path) {
                Storage::disk('public')->delete($taxi->photo_back_path);
            }
            $data['photo_back_path'] = $request->file('photo_back')->store('taxis/photos', 'public');
        } elseif ($request->boolean('remove_photo_back')) {
            if ($taxi->photo_back_path) {
                Storage::disk('public')->delete($taxi->photo_back_path);
            }
            $data['photo_back_path'] = null;
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
        $photoFrontPath = $taxi->photo_front_path;
        $photoBackPath = $taxi->photo_back_path;

        $taxi->forceDelete();

        Storage::disk('local')->delete($localFilePaths);
        if ($legacyDocumentPath) {
            Storage::disk('public')->delete($legacyDocumentPath);
        }
        if ($photoFrontPath) {
            Storage::disk('public')->delete($photoFrontPath);
        }
        if ($photoBackPath) {
            Storage::disk('public')->delete($photoBackPath);
        }

        return response()->json(['message' => 'Taxi permanently deleted'], 200);
    }
}
