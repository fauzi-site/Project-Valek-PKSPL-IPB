<?php

declare(strict_types=1);

namespace App\Listeners\Review;

use App\Events\Review\CommentCreated;
use App\Notifications\Review\NewCommentNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendCommentNotification implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(CommentCreated $event): void
    {
        $owner = $event->proyek->user;
        $reviewer = $event->review->reviewer;
        $commentAuthorId = $event->comment->id_user;

        if ($owner && $owner->id_user !== $commentAuthorId) {
            $owner->notify(new NewCommentNotification($event->comment, $event->review, $event->proyek));
        }

        if ($reviewer && $reviewer->id_user !== $commentAuthorId && (!$owner || $reviewer->id_user !== $owner->id_user)) {
            $reviewer->notify(new NewCommentNotification($event->comment, $event->review, $event->proyek));
        }
    }
}
