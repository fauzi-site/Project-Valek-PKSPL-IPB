<?php

declare(strict_types=1);

namespace App\Http\Resources\Chat;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $currentUser = $request->user();
        $currentUserId = $currentUser ? (int) $currentUser->id_user : 0;

        // Find the other participant for direct chat
        $otherParticipant = $this->participants
            ?->first(fn ($p) => (int) $p->id_user !== $currentUserId);
        $otherUser = $otherParticipant?->user;

        // Calculate unread count for current user
        $myParticipant = $this->participants
            ?->first(fn ($p) => (int) $p->id_user === $currentUserId);
        $lastReadAt = $myParticipant?->last_read_at;

        $unreadCount = 0;
        if ($this->relationLoaded('messages')) {
            $unreadCount = $this->messages
                ->filter(fn ($m) => (int) $m->id_sender !== $currentUserId && (!$lastReadAt || $m->created_at > $lastReadAt))
                ->count();
        } else {
            $unreadCount = $this->messages()
                ->where('id_sender', '!=', $currentUserId)
                ->when($lastReadAt, fn ($q) => $q->where('created_at', '>', $lastReadAt))
                ->count();
        }

        $latestMsg = $this->latestMessage ?? ($this->relationLoaded('messages') ? $this->messages->first() : null);
        $otherUserData = $otherUser ? (new ChatUserResource($otherUser))->toArray($request) : null;

        $roleName = $otherUser?->role?->nama_role ?? 'User';
        $userName = $otherUser?->nama ?? 'Pengguna';
        $initials = 'U';
        if ($otherUser && !empty($otherUser->nama)) {
            $words = array_filter(explode(' ', trim($otherUser->nama)));
            $initials = strtoupper(substr(implode('', array_map(fn ($w) => $w[0] ?? '', array_slice($words, 0, 2))), 0, 2)) ?: 'U';
        }

        $avatarBg = match ($roleName) {
            'Analyst' => 'from-amber-600 to-rose-600',
            'Peneliti' => 'from-blue-600 to-indigo-600',
            'Admin', 'Administrator' => 'from-purple-600 to-indigo-600',
            default => 'from-slate-600 to-slate-800',
        };

        $snippet = '';
        if ($latestMsg) {
            $snippet = $latestMsg->message ?: ($latestMsg->attachments()->count() > 0 ? '📎 Mengirim lampiran' : '');
        }

        $time = ($latestMsg && $latestMsg->created_at) ? $latestMsg->created_at->format('H:i') : '';

        return [
            'id' => (string) $this->id_conversation,
            'id_conversation' => $this->id_conversation,
            'type' => $this->type,
            'title' => $this->title,
            'researcherId' => $otherUser ? (string) $otherUser->id_user : '',
            'userId' => $otherUser ? (string) $otherUser->id_user : '',
            'userName' => $userName,
            'userRole' => $roleName,
            'userAvatarBg' => $avatarBg,
            'userInitials' => $initials,
            'isOnline' => (bool) ($otherUserData['isOnline'] ?? false),
            'lastSeen' => $otherUserData['lastSeen'] ?? 'Offline',
            'projectCode' => $this->proyek?->kode_proyek ?: ($this->proyek ? ('PRJ-' . str_pad((string) $this->proyek->id_proyek, 3, '0', STR_PAD_LEFT)) : 'PKS-994KY1'),
            'projectName' => $this->proyek?->nama_proyek ?? 'Proyek PKSPL',
            'lastMessageSnippet' => $snippet,
            'lastMessageTime' => $time,
            'researcher' => $otherUserData,
            'otherUser' => $otherUserData,
            'other_user' => $otherUserData,
            'lastMessage' => $latestMsg ? (new ChatMessageResource($latestMsg))->toArray($request) : null,
            'last_message' => $latestMsg ? (new ChatMessageResource($latestMsg))->toArray($request) : null,
            'unreadCount' => $unreadCount,
            'unread_count' => $unreadCount,
            'project' => $this->proyek ? [
                'id' => $this->proyek->id_proyek,
                'code' => $this->proyek->kode_proyek ?: ('PRJ-' . str_pad((string) $this->proyek->id_proyek, 3, '0', STR_PAD_LEFT)),
                'name' => $this->proyek->nama_proyek,
            ] : null,
            'updatedAt' => $this->updated_at ? $this->updated_at->toIso8601String() : '',
            'updated_at' => $this->updated_at ? $this->updated_at->toIso8601String() : '',
            'createdAt' => $this->created_at ? $this->created_at->toIso8601String() : '',
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : '',
        ];
    }
}