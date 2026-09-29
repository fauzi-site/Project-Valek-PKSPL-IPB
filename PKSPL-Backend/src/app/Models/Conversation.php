<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Conversation extends Model
{
    use HasFactory;

    protected $table = 'conversations';

    protected $primaryKey = 'id_conversation';

    protected $fillable = [
        'type',
        'id_proyek',
        'created_by',
        'title',
    ];

    public function getRouteKeyName(): string
    {
        return 'id_conversation';
    }

    public function participants(): HasMany
    {
        return $this->hasMany(ConversationParticipant::class, 'id_conversation', 'id_conversation');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'conversation_participants', 'id_conversation', 'id_user')
            ->withPivot('joined_at', 'last_read_at')
            ->withTimestamps();
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'id_conversation', 'id_conversation');
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(ChatMessage::class, 'id_conversation', 'id_conversation')
            ->latestOfMany('id_message');
    }

    public function proyek(): BelongsTo
    {
        return $this->belongsTo(Proyek::class, 'id_proyek', 'id_proyek');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'id_user');
    }

    public function unreadCountForUser(int $userId): int
    {
        $participant = $this->participants->firstWhere('id_user', $userId);
        $lastReadAt = $participant?->last_read_at;

        $query = $this->messages()->where('id_sender', '!=', $userId);

        if ($lastReadAt) {
            $query->where('created_at', '>', $lastReadAt);
        }

        return $query->count();
    }
}