<?php

namespace App\Http\Resources\Geography;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bentuk response API untuk master kabupaten atau kota.
 */
class KabupatenKotaResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id_kabupaten_kota' => $this->id_kabupaten_kota,
            'id_provinsi' => $this->id_provinsi,
            'kode_kabupaten_kota' => $this->kode_kabupaten_kota,
            'nama_kabupaten_kota' => $this->nama_kabupaten_kota,
            'tipe' => $this->tipe,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
