<?php

namespace App\Http\Resources\Valuation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Membentuk response API untuk hasil valuasi. */
class HasilValuasiResource extends JsonResource
{
    /** Mengubah model hasil valuasi menjadi payload response. */
    public function toArray(Request $request): array
    {
        return ['id_hasil' => $this->id_hasil, 'id_jenis_tutupan_lahan' => $this->id_jenis_tutupan_lahan, 'id_metode' => $this->id_metode, 'direct_use_value' => $this->direct_use_value, 'indirect_use_value' => $this->indirect_use_value, 'option_value' => $this->option_value, 'existence_value' => $this->existence_value, 'bequest_value' => $this->bequest_value, 'tev' => $this->tev, 'tanggal_hitung' => $this->tanggal_hitung, 'keterangan' => $this->keterangan, 'created_at' => $this->created_at, 'updated_at' => $this->updated_at];
    }
}
