<?php

declare(strict_types=1);

namespace App\Mail\Review;

use App\Models\Review;
use App\Models\ReviewComment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CommentReplyMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ReviewComment $reply,
        public readonly ReviewComment $parent,
        public readonly Review $review
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Someone replied to your comment'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.review.reply',
        );
    }
}
