<?php

declare(strict_types=1);

namespace App\Http\Resources\Chat;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $currentUser = $request->user();
        
        // Calculate whether message is read & status (sent, delivered, read)
        $isRead = false;
        $status = 'sent';
        $isOutgoing = $currentUser && (int) $this->id_sender === (int) $currentUser->id_user;

        if ($isOutgoing) {
            // For sender: check if other participant has read past this message
            $otherParticipant = $this->conversation?->participants
                ?->first(fn ($p) => (int) $p->id_user !== (int) $currentUser->id_user);
            if ($otherParticipant && $this->created_at) {
                if ($otherParticipant->last_read_at && $otherParticipant->last_read_at >= $this->created_at) {
                    $isRead = true;
                    $status = 'read';
                } else {
                    $otherUser = $otherParticipant->user;
                    $lastSeen = $otherUser?->last_seen_at ?? $otherUser?->last_online_at;
                    $isOnline = $lastSeen && (int) $lastSeen->diffInMinutes(now()) <= 3;
                    if ($isOnline || ($lastSeen && $lastSeen >= $this->created_at)) {
                        $status = 'delivered';
                    } else {
                        $status = 'sent';
                    }
                }
            }
        } else {
            // Received message is already read if viewer's last_read_at >= message created_at
            $myParticipant = $this->conversation?->participants
                ?->first(fn ($p) => (int) $p->id_user === (int) $currentUser?->id_user);
            if ($myParticipant && $myParticipant->last_read_at && $this->created_at) {
                $isRead = $myParticipant->last_read_at >= $this->created_at;
            }
            $status = $isRead ? 'read' : 'delivered';
        }

        $senderRole = $this->sender?->role?->nama_role ?? 'User';
        $senderName = $this->sender?->nama ?? 'Pengguna';
        $isDeleted = $this->trashed();
        $isEdited = !$isDeleted && $this->edited_at !== null;
        $messageText = $isDeleted ? 'Pesan telah dihapus' : $this->message;

        return [
            'id' => (string) $this->id_message,
            'id_message' => $this->id_message,
            'conversationId' => (string) $this->id_conversation,
            'conversation_id' => $this->id_conversation,
            'senderId' => (string) $this->id_sender,
            'sender_id' => $this->id_sender,
            'senderRole' => $senderRole,
            'sender_role' => $senderRole,
            'senderName' => $senderName,
            'sender_name' => $senderName,
            'text' => $messageText,
            'message' => $messageText,
            'messageType' => $this->message_type,
            'message_type' => $this->message_type,
            'timestamp' => $this->created_at ? $this->created_at->format('H:i') : '',
            'createdAt' => $this->created_at ? $this->created_at->toIso8601String() : '',
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : '',
            'editedAt' => $this->edited_at ? $this->edited_at->toIso8601String() : null,
            'edited_at' => $this->edited_at ? $this->edited_at->toIso8601String() : null,
            'isEdited' => $isEdited,
            'is_edited' => $isEdited,
            'isDeleted' => $isDeleted,
            'is_deleted' => $isDeleted,
            'isOutgoing' => $isOutgoing,
            'is_outgoing' => $isOutgoing,
            'status' => $status,
            'isRead' => $isRead,
            'is_read' => $isRead,
            'projectContext' => $this->proyek ? [
                'projectCode' => $this->proyek->kode_proyek ?: ('PRJ-' . str_pad((string) $this->proyek->id_proyek, 3, '0', STR_PAD_LEFT)),
                'projectName' => $this->proyek->nama_proyek,
            ] : null,
            'attachments' => $isDeleted ? [] : MessageAttachmentResource::collection($this->whenLoaded('attachments')),
        ];
    }
}