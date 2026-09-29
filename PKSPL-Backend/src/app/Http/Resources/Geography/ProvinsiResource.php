<?php

namespace App\Http\Resources\Geography;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bentuk response API untuk master provinsi.
 */
class ProvinsiResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id_provinsi' => $this->id_provinsi,
            'kode_provinsi' => $this->kode_provinsi,
            'nama_provinsi' => $this->nama_provinsi,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
