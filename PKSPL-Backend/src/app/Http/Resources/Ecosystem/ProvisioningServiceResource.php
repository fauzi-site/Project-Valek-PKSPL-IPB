<?php

namespace App\Http\Resources\Ecosystem;

use App\Http\Resources\Project\JenisTutupanLahanResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProvisioningServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_provisioning' => $this->id_provisioning,
            'id_jenis_tutupan_lahan' => $this->id_jenis_tutupan_lahan,
            'tutupan_lahan' => new JenisTutupanLahanResource($this->whenLoaded('jenisTutupanLahan')),
            'nama_objek' => $this->nama_objek,
            'nama_latin' => $this->nama_latin,
            'nama_daerah' => $this->nama_daerah,
            'produktivitas' => $this->produktivitas,
            'harga_pasar' => $this->harga_pasar,
            'luas_pemanfaatan' => $this->luas_pemanfaatan,
            'satuan_luas' => $this->satuan_luas,
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
