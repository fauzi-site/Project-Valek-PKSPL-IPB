<?php

namespace App\Http\Resources\Project;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Membentuk response API untuk data area terdampak. */
class AreaTerdampakResource extends JsonResource
{
    /** Mengubah model area terdampak menjadi payload response. */
    public function toArray(Request $request): array
    {
        return ['id_area' => $this->id_area, 'id_proyek' => $this->id_proyek, 'id_ekosistem' => $this->id_ekosistem, 'nama_area' => $this->nama_area, 'latitude' => $this->latitude, 'longitude' => $this->longitude, 'luas' => $this->luas, 'satuan_luas' => $this->satuan_luas, 'deskripsi' => $this->deskripsi, 'created_at' => $this->created_at, 'updated_at' => $this->updated_at];
    }
}
