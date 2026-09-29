<?php

namespace App\Http\Resources\Review;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_review,
            'id_proyek' => $this->id_proyek,
            'status' => $this->status,
            'decision' => $this->decision,
            'notes' => $this->notes,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
            'reviewer' => $this->whenLoaded('reviewer', fn() => [
                'id' => $this->reviewer->id_user,
                'nama' => $this->reviewer->nama,
                'email' => $this->reviewer->email,
            ]),
            'proyek' => $this->whenLoaded('proyek', fn() => [
                'id' => $this->proyek->id_proyek,
                'nama_proyek' => $this->proyek->nama_proyek,
                'status' => $this->proyek->status,
            ]),
            'comments_count' => $this->whenCounted('comments'),
        ];
    }
}
