<?php

namespace App\Http\Resources\Review;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewCommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id_comment,
            'id_review' => $this->id_review,
            'id_parent' => $this->id_parent,
            'body' => $this->isDeleted() ? '[deleted]' : $this->body,
            'is_edited' => $this->is_edited,
            'is_deleted' => $this->isDeleted(),
            'edited_at' => $this->edited_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
            'user' => $this->whenLoaded('user', fn() => [
                'id' => $this->user->id_user,
                'nama' => $this->user->nama,
            ]),
            'attachments' => CommentAttachmentResource::collection($this->whenLoaded('attachments')),
            'mentions' => CommentMentionResource::collection($this->whenLoaded('mentions')),
            'replies' => ReviewCommentResource::collection($this->whenLoaded('replies')),
            'replies_count' => $this->whenCounted('replies'),
            'edit_histories' => CommentEditHistoryResource::collection($this->whenLoaded('editHistories')),
        ];
    }
}
