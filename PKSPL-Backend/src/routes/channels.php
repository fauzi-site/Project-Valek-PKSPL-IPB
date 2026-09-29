<?php

use App\Models\ConversationParticipant;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::routes(['middleware' => ['auth:sanctum'], 'prefix' => 'api/v1']);


Broadcast::channel('conversation.{id}', function (User $user, int|string $id): bool {
    return ConversationParticipant::where('id_conversation', (int) $id)
        ->where('id_user', (int) $user->id_user)
        ->exists();
});

Broadcast::channel('user.{id}', function (User $user, int|string $id): bool {
    return (int) $user->id_user === (int) $id;
});

Broadcast::channel('online', function (User $user): array|bool {
    if ($user) {
        $user->update(['last_seen_at' => now(), 'last_online_at' => now()]);
        return [
            'id' => (string) $user->id_user,
            'id_user' => $user->id_user,
            'nama' => $user->nama,
            'name' => $user->nama,
            'role' => $user->role?->nama_role ?? 'User',
        ];
    }
    return false;
});