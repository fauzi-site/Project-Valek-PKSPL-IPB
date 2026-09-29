<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** Membentuk response API untuk data pengguna. */
class UserResource extends JsonResource
{
    /** Mengubah model pengguna menjadi payload response tanpa password. */
    public function toArray(Request $request): array
    {
        $role = $this->role;

        return [
            'id' => $this->id_user,
            'id_user' => $this->id_user,
            'id_role' => $this->id_role,
            'nama' => $this->nama,
            'email' => $this->email,
            'foto' => $this->resolvedFotoUrl(),
            'google_id_exists' => !empty($this->google_id),
            'email_verified_at' => $this->email_verified_at,
            'is_verified' => !empty($this->email_verified_at),
            'status' => $this->status,
            'last_online_at' => $this->last_online_at,
            'last_seen_at' => $this->last_seen_at,
            'is_online' => $this->last_seen_at ? $this->last_seen_at->gt(now()->subMinutes(2)) : false,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'role' => $role ? new RoleResource($role) : null,
        ];
    }

    private function resolvedFotoUrl(): ?string
    {
        $foto = $this->foto;

        if ($foto === null || $foto === '') {
            return null;
        }

        // External URL (Google avatar, etc.) — return as-is
        if (str_starts_with($foto, 'http://') || str_starts_with($foto, 'https://')) {
            return $foto;
        }

        // Local storage path — resolve to full URL
        return Storage::disk('public')->url($foto);
    }
}
