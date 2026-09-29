<?php

declare(strict_types=1);

namespace App\Events\Review;

use App\Models\Proyek;
use App\Models\Review;
use App\Models\ReviewComment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly ReviewComment $comment,
        public readonly Review $review,
        public readonly Proyek $proyek
    ) {
    }
}
