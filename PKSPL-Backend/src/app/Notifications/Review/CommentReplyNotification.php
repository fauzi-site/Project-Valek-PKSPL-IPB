<?php

declare(strict_types=1);

namespace App\Notifications\Review;

use App\Models\Review;
use App\Models\ReviewComment;
use App\Mail\Review\CommentReplyMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class CommentReplyNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly ReviewComment $reply,
        public readonly ReviewComment $parent,
        public readonly Review $review
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'comment_reply',
            'reply_id' => $this->reply->id_comment,
            'parent_id' => $this->parent->id_comment,
            'review_id' => $this->review->id_review,
            'replier' => $this->reply->user->nama ?? '',
            'message' => "Someone replied to your comment."
        ];
    }

    public function toMail(object $notifiable)
    {
        return (new CommentReplyMail($this->reply, $this->parent, $this->review))
            ->to($notifiable->email);
    }
}
