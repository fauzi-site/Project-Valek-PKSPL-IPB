<?php

declare(strict_types=1);

namespace App\Http\Resources\Chat;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Online check: last_seen_at or last_online_at within last 3 minutes
        $lastSeen = $this->last_seen_at ?? $this->last_online_at;
        $isOnline = false;
        $lastSeenText = 'Offline';

        if ($lastSeen) {
            $diffMinutes = (int) $lastSeen->diffInMinutes(now());
            if ($diffMinutes <= 3) {
                $isOnline = true;
                $lastSeenText = 'Online';
            } elseif ($diffMinutes < 1) {
                $lastSeenText = 'Baru saja';
            } elseif ($diffMinutes < 60) {
                $lastSeenText = "{$diffMinutes} menit lalu";
            } elseif ($lastSeen->isToday()) {
                $lastSeenText = 'Hari ini pukul ' . $lastSeen->format('H:i');
            } elseif ($lastSeen->isYesterday()) {
                $lastSeenText = 'Kemarin pukul ' . $lastSeen->format('H:i');
            } else {
                $lastSeenText = $lastSeen->format('d M Y \p\u\k\u\l H:i');
            }
        }

        // Associated projects
        $projects = [];
        if ($this->relationLoaded('proyek')) {
            $projects = $this->proyek->map(fn ($p) => [
                'code' => $p->kode_proyek ?: ('PRJ-' . str_pad((string) $p->id_proyek, 3, '0', STR_PAD_LEFT)),
                'name' => $p->nama_proyek,
            ])->values()->all();
        }

        $roleName = $this->role?->nama_role ?? 'User';

        return [
            'id' => (string) $this->id_user,
            'id_user' => $this->id_user,
            'name' => $this->nama,
            'nama' => $this->nama,
            'email' => $this->email,
            'role' => $roleName,
            'academicTitle' => $roleName === 'Peneliti' ? 'Peneliti Valuasi' : $roleName,
            'specialization' => $roleName === 'Analyst' ? 'Reviewer & Quality Control' : ($roleName === 'Admin' ? 'Administrator Sistem' : 'Penelitian Ekosistem'),
            'institution' => 'PKSPL IPB University',
            'avatarUrl' => $this->foto,
            'isOnline' => $isOnline,
            'is_online' => $isOnline,
            'lastSeen' => $lastSeenText,
            'last_seen' => $lastSeenText,
            'associatedProjects' => $projects,
            'associated_projects' => $projects,
        ];
    }
}