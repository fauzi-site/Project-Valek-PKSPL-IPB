<?php

namespace App\Http\Resources\Review;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_log,
            'action' => $this->action,
            'description' => $this->description,
            'meta' => $this->meta,
            'created_at' => $this->created_at->toIso8601String(),
            'user' => $this->whenLoaded('user', fn() => [
                'id' => $this->user->id_user,
                'nama' => $this->user->nama,
            ]),
            'id_proyek' => $this->id_proyek,
            'id_review' => $this->id_review,
            'id_comment' => $this->id_comment,
        ];
    }
}
