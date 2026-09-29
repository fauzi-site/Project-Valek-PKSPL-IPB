<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ChatMessage;
use App\Models\Conversation;
use App\Models\User;

class ChatMessagePolicy
{
    /**
     * Determine whether the user can update the chat message.
     */
    public function update(User $user, ChatMessage $message, ?Conversation $conversation = null): bool
    {
        // User can only edit their own message
        if ((int) $message->id_sender !== (int) $user->id_user) {
            return false;
        }

        // Cannot edit soft-deleted message
        if ($message->trashed()) {
            return false;
        }

        // If conversation context is provided, ensure message belongs to it and user is participant
        if ($conversation) {
            if ((int) $message->id_conversation !== (int) $conversation->id_conversation) {
                return false;
            }

            return $conversation->participants()->where('id_user', $user->id_user)->exists();
        }

        return true;
    }

    /**
     * Determine whether the user can delete the chat message.
     */
    public function delete(User $user, ChatMessage $message, ?Conversation $conversation = null): bool
    {
        // User can only delete their own message
        if ((int) $message->id_sender !== (int) $user->id_user) {
            return false;
        }

        // Cannot delete already soft-deleted message
        if ($message->trashed()) {
            return false;
        }

        // If conversation context is provided, ensure message belongs to it and user is participant
        if ($conversation) {
            if ((int) $message->id_conversation !== (int) $conversation->id_conversation) {
                return false;
            }

            return $conversation->participants()->where('id_user', $user->id_user)->exists();
        }

        return true;
    }
}
