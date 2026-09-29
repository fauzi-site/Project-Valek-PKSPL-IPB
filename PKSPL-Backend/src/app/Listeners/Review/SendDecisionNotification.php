<?php

declare(strict_types=1);

namespace App\Listeners\Review;

use App\Events\Review\ReviewDecisionMade;
use App\Notifications\Review\ReviewDecisionNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendDecisionNotification implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(ReviewDecisionMade $event): void
    {
        if ($event->proyek->user) {
            $event->proyek->user->notify(new ReviewDecisionNotification($event->review, $event->proyek));
        }
    }
}
