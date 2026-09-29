<?php

declare(strict_types=1);

namespace App\Notifications\Review;

use App\Models\Proyek;
use App\Models\Review;
use App\Mail\Review\ReviewReopenedMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class ReviewReopenedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Review $review,
        public readonly Proyek $proyek
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'review_reopened',
            'review_id' => $this->review->id_review,
            'proyek_id' => $this->proyek->id_proyek,
            'proyek_name' => $this->proyek->nama_proyek,
            'message' => "Discussion on '{$this->proyek->nama_proyek}' has been reopened."
        ];
    }

    public function toMail(object $notifiable)
    {
        return (new ReviewReopenedMail($this->review, $this->proyek))
            ->to($notifiable->email);
    }
}
