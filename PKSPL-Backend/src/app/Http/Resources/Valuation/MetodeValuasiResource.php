<?php

namespace App\Http\Resources\Valuation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Membentuk response API untuk metode valuasi. */
class MetodeValuasiResource extends JsonResource
{
    /** Mengubah model metode valuasi menjadi payload response. */
    public function toArray(Request $request): array
    {
        return ['id_metode' => $this->id_metode, 'nama_metode' => $this->nama_metode, 'deskripsi' => $this->deskripsi, 'formula' => $this->formula, 'parameter' => $this->parameter, 'status' => $this->status, 'created_at' => $this->created_at, 'updated_at' => $this->updated_at];
    }
}
