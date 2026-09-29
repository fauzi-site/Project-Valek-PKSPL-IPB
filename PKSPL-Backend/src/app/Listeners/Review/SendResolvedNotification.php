<?php

declare(strict_types=1);

namespace App\Listeners\Review;

use App\Events\Review\ReviewResolved;
use App\Notifications\Review\ReviewResolvedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendResolvedNotification implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(ReviewResolved $event): void
    {
        if ($event->proyek->user) {
            $event->proyek->user->notify(new ReviewResolvedNotification($event->review, $event->proyek));
        }
    }
}
