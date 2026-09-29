<?php

declare(strict_types=1);

namespace App\Mail\Review;

use App\Models\Proyek;
use App\Models\Review;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReviewReopenedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Review $review,
        public readonly Proyek $proyek
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Discussion Reopened: {$this->proyek->nama_proyek}"
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.review.reopened',
        );
    }
}
