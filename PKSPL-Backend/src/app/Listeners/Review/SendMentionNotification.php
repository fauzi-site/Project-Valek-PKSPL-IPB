<?php

declare(strict_types=1);

namespace App\Listeners\Review;

use App\Events\Review\UserMentioned;
use App\Notifications\Review\MentionNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendMentionNotification implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(UserMentioned $event): void
    {
        $event->mentionedUser->notify(new MentionNotification($event->comment));
    }
}
