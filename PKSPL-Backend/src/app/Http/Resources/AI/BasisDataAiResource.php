<?php

namespace App\Http\Resources\AI;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Membentuk response API untuk basis data AI. */
class BasisDataAiResource extends JsonResource
{
    /** Mengubah model basis data AI menjadi payload response. */
    public function toArray(Request $request): array
    {
        return ['id_basis' => $this->id_basis, 'nama_basis' => $this->nama_basis, 'versi' => $this->versi, 'deskripsi' => $this->deskripsi, 'path_file' => $this->path_file, 'status' => $this->status, 'jenis_basis' => $this->jenis_basis, 'model_embedding' => $this->model_embedding, 'jumlah_dokumen' => $this->jumlah_dokumen, 'created_at' => $this->created_at, 'updated_at' => $this->updated_at];
    }
}
