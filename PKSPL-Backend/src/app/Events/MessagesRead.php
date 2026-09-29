<?php

declare(strict_types=1);

namespace App\Events;

use Carbon\CarbonInterface;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessagesRead implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int|string $conversationId;
    public int|string $readerId;
    public string $readAt;

    public function __construct(int|string $conversationId, int|string $readerId, ?CarbonInterface $readAt = null)
    {
        $this->conversationId = $conversationId;
        $this->readerId = $readerId;
        $this->readAt = $readAt ? $readAt->toIso8601String() : now()->toIso8601String();
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.' . $this->conversationId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'MessagesRead';
    }

    public function broadcastWith(): array
    {
        return [
            'conversationId' => (string) $this->conversationId,
            'readerId' => (string) $this->readerId,
            'readAt' => $this->readAt,
        ];
    }
}
