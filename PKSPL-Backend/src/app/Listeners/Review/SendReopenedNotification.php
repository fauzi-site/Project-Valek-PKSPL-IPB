<?php

declare(strict_types=1);

namespace App\Listeners\Review;

use App\Events\Review\ReviewReopened;
use App\Notifications\Review\ReviewReopenedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendReopenedNotification implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(ReviewReopened $event): void
    {
        if ($event->proyek->user) {
            $event->proyek->user->notify(new ReviewReopenedNotification($event->review, $event->proyek));
        }
    }
}
