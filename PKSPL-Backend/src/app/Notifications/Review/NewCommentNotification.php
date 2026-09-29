<?php

declare(strict_types=1);

namespace App\Notifications\Review;

use App\Models\Proyek;
use App\Models\Review;
use App\Models\ReviewComment;
use App\Mail\Review\NewCommentMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class NewCommentNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly ReviewComment $comment,
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
            'type' => 'new_comment',
            'comment_id' => $this->comment->id_comment,
            'review_id' => $this->review->id_review,
            'proyek_id' => $this->proyek->id_proyek,
            'commenter' => $this->comment->user->nama ?? '',
            'message' => "New comment on your dataset '{$this->proyek->nama_proyek}'"
        ];
    }

    public function toMail(object $notifiable)
    {
        return (new NewCommentMail($this->comment, $this->review, $this->proyek))
            ->to($notifiable->email);
    }
}
