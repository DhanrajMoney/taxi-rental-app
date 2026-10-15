<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Notification::where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
                ->orWhereNull('user_id');
        });

        return response()->json([
            'unread_count' => (clone $query)->whereNull('read_at')->count(),
            'notifications' => $query->orderByDesc('created_at')->limit(30)->get(),
        ]);
    }

    public function markAsRead(Request $request, Notification $notification)
    {
        if ($notification->user_id && $notification->user_id !== $request->user()->id) {
            abort(403);
        }

        $notification->update(['read_at' => now()]);

        return response()->json($notification);
    }

    public function markAllAsRead(Request $request)
    {
        $user = $request->user();

        Notification::where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
                ->orWhereNull('user_id');
        })->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}
