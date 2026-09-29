<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Chat;

use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $pref = NotificationPreference::getOrCreateForUser((int) $user->id_user);

        return response()->json($pref);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email_chat' => ['nullable', 'boolean'],
            'email_revision' => ['nullable', 'boolean'],
            'email_status_review' => ['nullable', 'boolean'],
            'app_notification' => ['nullable', 'boolean'],
        ]);

        $user = $request->user();
        $pref = NotificationPreference::getOrCreateForUser((int) $user->id_user);
        $pref->update($validated);

        return response()->json([
            'message' => 'Preferensi notifikasi berhasil diperbarui.',
            'preferences' => $pref->refresh(),
        ]);
    }
}