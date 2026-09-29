<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

class ConversationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Conversation $conversation): bool
    {
        return $conversation->participants()->where('id_user', $user->id_user)->exists();
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function sendMessage(User $user, Conversation $conversation): bool
    {
        return $conversation->participants()->where('id_user', $user->id_user)->exists();
    }

    public function markRead(User $user, Conversation $conversation): bool
    {
        return $conversation->participants()->where('id_user', $user->id_user)->exists();
    }
}