<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with([
            'office:id,name',
            'driver:id,name,phone,license_number',
        ]);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($role = $request->query('role')) {
            $query->where('role', $role);
        }

        if ($officeId = $request->query('office_id')) {
            $query->where('office_id', $officeId);
        }

        $paginated = $query->orderBy('role')->latest()->paginate($request->integer('per_page', 15));

        // Single aggregation query for summary metrics
        $metrics = User::selectRaw("
            COUNT(*) as total_users,
            COALESCE(SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END), 0) as admin_count,
            COALESCE(SUM(CASE WHEN role = 'staff' THEN 1 ELSE 0 END), 0) as staff_count,
            COALESCE(SUM(CASE WHEN role = 'driver' THEN 1 ELSE 0 END), 0) as driver_count
        ")->first();

        return response()->json(array_merge($paginated->toArray(), [
            'meta' => [
                'total_users' => (int) ($metrics->total_users ?? 0),
                'admin_count' => (int) ($metrics->admin_count ?? 0),
                'staff_count' => (int) ($metrics->staff_count ?? 0),
                'driver_count' => (int) ($metrics->driver_count ?? 0),
            ],
        ]));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::in(['admin', 'staff', 'driver'])],
            'driver_id' => ['nullable', 'exists:drivers,id', Rule::unique('users', 'driver_id')],
            'office_id' => ['nullable', 'exists:offices,id'],
        ]);

        $data['password'] = Hash::make($data['password']);
        if ($data['role'] !== 'driver') {
            $data['driver_id'] = null;
        }

        $user = User::create($data);

        return response()->json($user->load(['office', 'driver']), 201);
    }

    public function show(User $user)
    {
        return response()->json($user->load(['office', 'driver']));
    }

    public function update(Request $request, User $user)
    {
        // Guard against self-demotion
        if ($user->id === auth()->id() && $request->has('role') && $request->input('role') !== 'admin') {
            return response()->json(['message' => 'You cannot change your own role from administrator.'], 422);
        }

        // Guard against demoting the last remaining administrator
        if ($user->role === 'admin' && $request->has('role') && $request->input('role') !== 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json(['message' => 'Cannot demote the last administrator account.'], 422);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['sometimes', 'string', Rule::in(['admin', 'staff', 'driver'])],
            'driver_id' => ['nullable', 'exists:drivers,id', Rule::unique('users', 'driver_id')->ignore($user->id)],
            'office_id' => ['nullable', 'exists:offices,id'],
        ]);

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        if (($data['role'] ?? $user->role) !== 'driver') {
            $data['driver_id'] = null;
        }

        $user->update($data);

        return response()->json($user->fresh(['office', 'driver']));
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        // Guard against deleting the last remaining administrator
        if ($user->role === 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json(['message' => 'Cannot remove the last administrator account.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User removed'], 200);
    }
}
