<?php

namespace App\Http\Resources\Ecosystem;

use App\Http\Resources\Project\JenisTutupanLahanResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CulturalServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_cultural' => $this->id_cultural,
            'id_jenis_tutupan_lahan' => $this->id_jenis_tutupan_lahan,
            'tutupan_lahan' => new JenisTutupanLahanResource($this->whenLoaded('jenisTutupanLahan')),
            'nama_aktivitas' => $this->nama_aktivitas,
            'jumlah_pengunjung' => $this->jumlah_pengunjung,
            'biaya_perjalanan' => $this->biaya_perjalanan,
            'frekuensi' => $this->frekuensi,
            'referensi' => $this->referensi,
            'nilai' => $this->nilai,
            'kategori_tev' => $this->kategori_tev,
            'wilayah' => $this->when($this->relationLoaded('provinsi') || $this->relationLoaded('kabupatenKota') || $this->relationLoaded('kecamatan') || $this->relationLoaded('desaKelurahan'), [
                'provinsi' => $this->whenLoaded('provinsi', fn () => new \App\Http\Resources\Geography\ProvinsiResource($this->provinsi)),
                'kabupaten_kota' => $this->whenLoaded('kabupatenKota', fn () => new \App\Http\Resources\Geography\KabupatenKotaResource($this->kabupatenKota)),
                'kecamatan' => $this->whenLoaded('kecamatan', fn () => new \App\Http\Resources\Geography\KecamatanResource($this->kecamatan)),
                'desa_kelurahan' => $this->whenLoaded('desaKelurahan', fn () => new \App\Http\Resources\Geography\DesaKelurahanResource($this->desaKelurahan)),
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
