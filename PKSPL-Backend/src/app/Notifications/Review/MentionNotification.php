<?php

declare(strict_types=1);

namespace App\Notifications\Review;

use App\Models\ReviewComment;
use App\Mail\Review\MentionMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class MentionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly ReviewComment $comment
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'mention',
            'comment_id' => $this->comment->id_comment,
            'review_id' => $this->comment->id_review,
            'mentioned_by' => $this->comment->user->nama ?? '',
            'message' => "You were mentioned in a comment."
        ];
    }

    public function toMail(object $notifiable)
    {
        return (new MentionMail($this->comment))
            ->to($notifiable->email);
    }
}
