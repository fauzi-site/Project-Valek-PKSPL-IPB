<?php

namespace App\Http\Resources\AI;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Membentuk response API untuk data analisis AI. */
class AnalisisAiResource extends JsonResource
{
    /** Mengubah model analisis AI menjadi payload response. */
    public function toArray(Request $request): array
    {
        return ['id_analisis' => $this->id_analisis, 'id_proyek' => $this->id_proyek, 'id_user' => $this->id_user, 'pertanyaan' => $this->pertanyaan, 'jawaban' => $this->jawaban, 'sumber_data' => $this->sumber_data, 'tipe_analisis' => $this->tipe_analisis, 'created_at' => $this->created_at];
    }
}
