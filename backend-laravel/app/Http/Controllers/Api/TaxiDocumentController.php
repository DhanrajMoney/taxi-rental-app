<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Taxi;
use App\Models\TaxiDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TaxiDocumentController extends Controller
{
    private const DOCUMENT_TYPES = ['insurance', 'rc'];

    public function index(Taxi $taxi)
    {
        return response()->json(
            $taxi->documents()
                ->orderBy('document_type')
                ->get(['id', 'taxi_id', 'document_type', 'original_filename', 'mime_type', 'file_size', 'created_at'])
        );
    }

    public function store(Request $request, Taxi $taxi)
    {
        $validated = $request->validate([
            'document_type' => ['required', 'in:'.implode(',', self::DOCUMENT_TYPES)],
            'document' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        $file = $request->file('document');
        $filePath = $file->store("taxis/{$taxi->id}/documents", 'local');
        $existingDocument = $taxi->documents()
            ->where('document_type', $validated['document_type'])
            ->first();
        $previousPath = $existingDocument?->file_path;
        $attributes = [
            'file_path' => $filePath,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'file_size' => $file->getSize(),
        ];

        if ($existingDocument) {
            $existingDocument->update($attributes);
            $document = $existingDocument->fresh();
            $status = 200;
        } else {
            $document = $taxi->documents()->create([
                'document_type' => $validated['document_type'],
                ...$attributes,
            ]);
            $status = 201;
        }

        if ($previousPath && $previousPath !== $filePath) {
            Storage::disk('local')->delete($previousPath);
        }

        return response()->json($this->documentPayload($document), $status);
    }

    public function download(Taxi $taxi, TaxiDocument $document)
    {
        abort_unless($document->taxi_id === $taxi->id, 404);
        abort_unless(Storage::disk('local')->exists($document->file_path), 404);

        return Storage::disk('local')->download($document->file_path, $document->original_filename);
    }

    public function destroy(Taxi $taxi, TaxiDocument $document)
    {
        abort_unless($document->taxi_id === $taxi->id, 404);

        if (Storage::disk('local')->exists($document->file_path)) {
            Storage::disk('local')->delete($document->file_path);
        }

        $document->delete();

        return response()->json(['message' => 'Taxi document removed successfully.'], 200);
    }

    private function documentPayload(TaxiDocument $document): array
    {
        return $document->only([
            'id', 'taxi_id', 'document_type', 'original_filename', 'mime_type', 'file_size', 'created_at',
        ]);
    }
}
