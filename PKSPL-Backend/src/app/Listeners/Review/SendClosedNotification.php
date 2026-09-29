<?php

declare(strict_types=1);

namespace App\Listeners\Review;

use App\Events\Review\ReviewClosed;
use App\Notifications\Review\ReviewClosedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendClosedNotification implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(ReviewClosed $event): void
    {
        if ($event->proyek->user) {
            $event->proyek->user->notify(new ReviewClosedNotification($event->review, $event->proyek));
        }
    }
}
