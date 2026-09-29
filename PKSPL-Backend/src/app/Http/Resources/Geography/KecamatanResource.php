<?php

namespace App\Http\Resources\Geography;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bentuk response API untuk master kecamatan.
 */
class KecamatanResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id_kecamatan' => $this->id_kecamatan,
            'id_kabupaten_kota' => $this->id_kabupaten_kota,
            'kode_kecamatan' => $this->kode_kecamatan,
            'nama_kecamatan' => $this->nama_kecamatan,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
