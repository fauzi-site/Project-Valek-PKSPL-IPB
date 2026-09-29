<?php

declare(strict_types=1);

namespace App\Events\Review;

use App\Models\Review;
use App\Models\ReviewComment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentReplied
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly ReviewComment $reply,
        public readonly ReviewComment $parent,
        public readonly Review $review
    ) {
    }
}
