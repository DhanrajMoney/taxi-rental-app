<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\DriverDocument;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DriverDocumentController extends Controller
{
    public function index(Driver $driver)
    {
        return response()->json($driver->documents()->orderByDesc('created_at')->get());
    }

    public function store(Request $request, Driver $driver)
    {
        $validated = $request->validate([
            'document_name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:license,insurance,background_check,training,required,other'],
            'expiry_date' => ['nullable', 'date'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'], // 10MB max
        ]);

        $path = $request->file('file')->store("driver_documents/{$driver->id}", 'local');
        $size = $request->file('file')->getSize();
        $formattedSize = $size < 1024 * 1024
            ? round($size / 1024).' KB'
            : round($size / (1024 * 1024), 2).' MB';

        $status = 'Valid';
        if ($validated['expiry_date'] ?? null) {
            $expiry = Carbon::parse($validated['expiry_date']);
            if ($expiry->isPast()) {
                $status = 'Expired';
            } elseif ($expiry->diffInDays(now()) <= 30) {
                $status = 'Expiring soon';
            }
        }

        $document = $driver->documents()->create([
            'document_name' => $validated['document_name'],
            'type' => $validated['type'],
            'file_path' => $path,
            'file_size' => $formattedSize,
            'expiry_date' => $validated['expiry_date'] ?? null,
            'status' => $status,
        ]);

        return response()->json($document, 201);
    }

    public function download(Driver $driver, DriverDocument $document)
    {
        if ($document->driver_id !== $driver->id) {
            abort(404);
        }

        $disk = Storage::disk('local')->exists($document->file_path) ? 'local' : 'public';

        if (! Storage::disk($disk)->exists($document->file_path)) {
            return response()->json(['message' => 'Document file not found.'], 404);
        }

        $extension = pathinfo($document->file_path, PATHINFO_EXTENSION);
        $downloadName = $document->document_name;
        if ($extension && ! str_ends_with(strtolower($downloadName), '.'.strtolower($extension))) {
            $downloadName .= '.'.$extension;
        }

        return Storage::disk($disk)->download($document->file_path, $downloadName);
    }

    public function destroy(Driver $driver, DriverDocument $document)
    {
        if ($document->driver_id !== $driver->id) {
            abort(404);
        }

        if (Storage::disk('local')->exists($document->file_path)) {
            Storage::disk('local')->delete($document->file_path);
        } elseif (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return response()->json(['message' => 'Document deleted successfully.']);
    }
}
