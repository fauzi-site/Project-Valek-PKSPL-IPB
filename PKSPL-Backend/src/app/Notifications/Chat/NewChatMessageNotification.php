<?php

declare(strict_types=1);

namespace App\Notifications\Chat;

use App\Mail\Chat\NewChatMessageMail;
use App\Models\ChatMessage;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class NewChatMessageNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public ChatMessage $message,
        public Conversation $conversation,
        public User $sender
    ) {}

    public function via(object $notifiable): array
    {
        $channels = [];

        // Check in-app notification preference
        $appNotifEnabled = $notifiable->notificationPreference ? $notifiable->notificationPreference->app_notification : true;
        if ($appNotifEnabled) {
            $channels[] = 'database';
        }

        // Check email preference and whether recipient was actively viewing the chat recently
        $emailChatEnabled = $notifiable->notificationPreference ? $notifiable->notificationPreference->email_chat : true;
        
        $this->conversation->loadMissing('participants');
        $participant = $this->conversation->participants->firstWhere('id_user', $notifiable->id_user);
        
        // If participant was active in this conversation in the last 60 seconds, skip email to prevent spam
        $isActivelyReading = false;
        if ($participant && $participant->last_read_at) {
            $isActivelyReading = $participant->last_read_at->diffInSeconds(now()) < 60;
        }

        if ($emailChatEnabled && !$isActivelyReading && !empty($notifiable->email)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toDatabase(object $notifiable): array
    {
        $senderRole = $this->sender->role?->nama_role ?? 'User';
        $hasAttachment = $this->message->attachments()->count() > 0;
        $summary = $hasAttachment
            ? "📎 {$this->sender->nama} mengirim berkas lampiran."
            : "Pesan baru dari {$this->sender->nama}";

        return [
            'type' => 'chat_message',
            'conversation_id' => $this->conversation->id_conversation,
            'message_id' => $this->message->id_message,
            'sender_id' => $this->sender->id_user,
            'sender_name' => $this->sender->nama,
            'sender_role' => $senderRole,
            'message' => $summary,
            'project_name' => $this->message->proyek?->nama_proyek,
            'action_url' => '/analyst/discussions',
        ];
    }

    public function toMail(object $notifiable)
    {
        return (new NewChatMessageMail($this->message, $this->conversation, $this->sender, $notifiable))
            ->to($notifiable->email);
    }
}