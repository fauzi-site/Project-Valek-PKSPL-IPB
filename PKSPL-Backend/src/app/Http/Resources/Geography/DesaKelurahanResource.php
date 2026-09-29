<?php

namespace App\Http\Resources\Geography;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bentuk response API untuk master desa atau kelurahan.
 */
class DesaKelurahanResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id_desa_kelurahan' => $this->id_desa_kelurahan,
            'id_kecamatan' => $this->id_kecamatan,
            'kode_desa_kelurahan' => $this->kode_desa_kelurahan,
            'nama_desa_kelurahan' => $this->nama_desa_kelurahan,
            'tipe' => $this->tipe,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
