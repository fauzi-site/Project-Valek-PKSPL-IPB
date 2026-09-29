<?php

declare(strict_types=1);

namespace App\Events\Review;

use App\Models\Proyek;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReviewReopened
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Review $review,
        public readonly Proyek $proyek,
        public readonly User $actor
    ) {
    }
}
