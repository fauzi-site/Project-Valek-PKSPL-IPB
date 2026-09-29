<?php

namespace App\Http\Resources\Ecosystem;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Membentuk response API untuk data ekosistem. */
class EkosistemResource extends JsonResource
{
    /** Mengubah model ekosistem menjadi payload response. */
    public function toArray(Request $request): array
    {
        return ['id_ekosistem' => $this->id_ekosistem, 'nama_ekosistem' => $this->nama_ekosistem, 'deskripsi' => $this->deskripsi, 'status' => $this->status, 'created_at' => $this->created_at, 'updated_at' => $this->updated_at];
    }
}
