<?php

declare(strict_types=1);

namespace App\Events;

use App\Http\Resources\Chat\ChatMessageResource;
use App\Models\ChatMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatMessageDeleted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public ChatMessage $message
    ) {}

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('conversation.' . $this->message->id_conversation),
        ];

        $this->message->loadMissing('conversation.participants');
        if ($this->message->conversation) {
            foreach ($this->message->conversation->participants as $participant) {
                $channels[] = new PrivateChannel('user.' . $participant->id_user);
            }
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'ChatMessageDeleted';
    }

    public function broadcastWith(): array
    {
        $this->message->loadMissing(['sender.role', 'proyek', 'conversation.participants']);
        return [
            'conversation_id' => $this->message->id_conversation,
            'message_id' => $this->message->id_message,
            'message' => (new ChatMessageResource($this->message))->resolve(),
        ];
    }
}
