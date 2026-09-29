<?php

declare(strict_types=1);

namespace App\Events\Review;

use App\Models\User;
use App\Models\ReviewComment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserMentioned
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly ReviewComment $comment,
        public readonly User $mentionedUser
    ) {
    }
}
