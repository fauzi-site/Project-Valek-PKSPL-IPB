<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\SafeEncryptedString;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChatMessage extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'messages';

    protected $primaryKey = 'id_message';

    protected $fillable = [
        'id_conversation',
        'id_sender',
        'id_proyek',
        'message',
        'edited_at',
        'message_type',
        'reply_to_id',
    ];

    protected $casts = [
        'message' => SafeEncryptedString::class,
        'edited_at' => 'datetime',
    ];

    public function getRouteKeyName(): string
    {
        return 'id_message';
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'id_conversation', 'id_conversation');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_sender', 'id_user');
    }

    public function proyek(): BelongsTo
    {
        return $this->belongsTo(Proyek::class, 'id_proyek', 'id_proyek');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(MessageAttachment::class, 'id_message', 'id_message');
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(ChatMessage::class, 'reply_to_id', 'id_message');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'reply_to_id', 'id_message');
    }
}