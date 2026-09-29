<?php

declare(strict_types=1);

namespace App\Listeners\Review;

use App\Events\Review\CommentReplied;
use App\Notifications\Review\CommentReplyNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendReplyNotification implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(CommentReplied $event): void
    {
        $parentAuthor = $event->parent->user;
        $replyAuthorId = $event->reply->id_user;

        if ($parentAuthor && $parentAuthor->id_user !== $replyAuthorId) {
            $parentAuthor->notify(new CommentReplyNotification($event->reply, $event->parent, $event->review));
        }
    }
}
