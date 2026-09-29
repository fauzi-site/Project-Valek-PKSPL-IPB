<?php

namespace App\Http\Resources\Project;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IndexResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_index' => $this->id_index,
            'id_proyek' => $this->id_proyek,
            'proyek' => new ProyekResource($this->whenLoaded('proyek')),
            'nama_index' => $this->nama_index,
            'kode_index' => $this->kode_index,
            'luas' => $this->luas,
            'satuan_luas' => $this->satuan_luas,
            'geometry' => $this->geometry,
            'deskripsi' => $this->deskripsi,
            'jenis_tutupan_lahan' => JenisTutupanLahanResource::collection($this->whenLoaded('jenisTutupanLahan')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
