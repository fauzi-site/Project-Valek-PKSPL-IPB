<?php

namespace App\Http\Resources\Reference;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Membentuk response API untuk dataset referensi. */
class DatasetReferensiResource extends JsonResource
{
    /** Mengubah model dataset referensi menjadi payload response. */
    public function toArray(Request $request): array
    {
        return ['id_dataset' => $this->id_dataset, 'nama_dataset' => $this->nama_dataset, 'kategori' => $this->kategori, 'tahun' => $this->tahun, 'file_dataset' => $this->file_dataset, 'tipe_file' => $this->tipe_file, 'sumber' => $this->sumber, 'deskripsi' => $this->deskripsi, 'status' => $this->status, 'created_at' => $this->created_at, 'updated_at' => $this->updated_at];
    }
}
