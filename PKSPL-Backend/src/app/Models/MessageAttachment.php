<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class MessageAttachment extends Model
{
    use HasFactory;

    protected $table = 'message_attachments';

    protected $primaryKey = 'id_attachment';

    protected $fillable = [
        'id_message',
        'file_name',
        'file_path',
        'file_size',
        'mime_type',
        'file_type',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    protected $appends = ['url'];

    public function getRouteKeyName(): string
    {
        return 'id_attachment';
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(ChatMessage::class, 'id_message', 'id_message');
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->file_path);
    }
}