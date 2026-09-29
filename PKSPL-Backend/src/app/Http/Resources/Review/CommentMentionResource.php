<?php

namespace App\Http\Resources\Review;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommentMentionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_mention,
            'user' => $this->whenLoaded('user', fn() => [
                'id' => $this->user->id_user,
                'nama' => $this->user->nama,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
