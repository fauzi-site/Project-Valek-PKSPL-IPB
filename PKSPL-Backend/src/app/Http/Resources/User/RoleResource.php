<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bentuk response API untuk master data role.
 */
class RoleResource extends JsonResource
{
    /**
     * Mengekspos hanya kolom role yang tersimpan pada schema.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id_role' => $this->id_role,
            'nama_role' => $this->nama_role,
            'deskripsi' => $this->deskripsi,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
