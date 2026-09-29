<?php

declare(strict_types=1);

namespace App\Mail\Chat;

use App\Models\ChatMessage;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewChatMessageMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ChatMessage $message,
        public Conversation $conversation,
        public User $sender,
        public User $recipient
    ) {}

    public function envelope(): Envelope
    {
        $subject = "[PKSPL Diskusi] Pesan baru dari {$this->sender->nama}";
        if ($this->message->proyek) {
            $subject .= " - {$this->message->proyek->nama_proyek}";
        }

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.chat.new_message',
            with: [
                'sender' => $this->sender,
                'recipient' => $this->recipient,
                'chatMessage' => $this->message,
                'conversation' => $this->conversation,
                'proyek' => $this->message->proyek,
                'frontendUrl' => rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/'),
            ]
        );
    }
}