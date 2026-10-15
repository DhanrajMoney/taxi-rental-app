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
        $query = User::with(['office', 'driver']);

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

        return response()->json(
            $query->orderBy('role')->latest()->paginate($request->integer('per_page', 15))
        );
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
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => ['sometimes', 'string', 'min:8'],
            'role' => ['sometimes', 'string', Rule::in(['admin', 'staff', 'driver'])],
            'driver_id' => ['nullable', 'exists:drivers,id', Rule::unique('users', 'driver_id')->ignore($user->id)],
            'office_id' => ['nullable', 'exists:offices,id'],
        ]);

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
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

        $user->delete();

        return response()->json(['message' => 'User removed'], 200);
    }
}
