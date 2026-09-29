<?php

declare(strict_types=1);

namespace App\Mail\Review;

use App\Models\ReviewComment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MentionMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ReviewComment $comment
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You were mentioned in a comment'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.review.mention',
        );
    }
}
