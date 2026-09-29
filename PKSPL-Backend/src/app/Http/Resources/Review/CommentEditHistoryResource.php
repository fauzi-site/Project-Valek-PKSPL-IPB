<?php

namespace App\Http\Resources\Review;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommentEditHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_history,
            'body_before' => $this->body_before,
            'body_after' => $this->body_after,
            'edited_at' => $this->edited_at->toIso8601String(),
            'editor' => $this->whenLoaded('user', fn() => [
                'id' => $this->user->id_user,
                'nama' => $this->user->nama,
            ]),
        ];
    }
}
