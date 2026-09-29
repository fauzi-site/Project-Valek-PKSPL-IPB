<?php

declare(strict_types=1);

namespace App\Notifications\Review;

use App\Models\Proyek;
use App\Models\Review;
use App\Mail\Review\ReviewClosedMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class ReviewClosedNotification extends Notification implements ShouldQueue
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
            'type' => 'review_closed',
            'review_id' => $this->review->id_review,
            'proyek_id' => $this->proyek->id_proyek,
            'proyek_name' => $this->proyek->nama_proyek,
            'message' => "Discussion on '{$this->proyek->nama_proyek}' has been closed."
        ];
    }

    public function toMail(object $notifiable)
    {
        return (new ReviewClosedMail($this->review, $this->proyek))
            ->to($notifiable->email);
    }
}
