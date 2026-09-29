<?php

declare(strict_types=1);

namespace App\Notifications\Review;

use App\Models\Proyek;
use App\Models\Review;
use App\Mail\Review\ReviewDecisionMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class ReviewDecisionNotification extends Notification implements ShouldQueue
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
            'type' => 'review_decision',
            'review_id' => $this->review->id_review,
            'proyek_id' => $this->proyek->id_proyek,
            'proyek_name' => $this->proyek->nama_proyek,
            'decision' => $this->review->decision,
            'message' => "Your dataset '{$this->proyek->nama_proyek}' has been reviewed: {$this->review->decision}"
        ];
    }

    public function toMail(object $notifiable)
    {
        return (new ReviewDecisionMail($this->review, $this->proyek))
            ->to($notifiable->email);
    }
}
