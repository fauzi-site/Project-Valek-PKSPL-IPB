<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    use HasFactory;

    protected $table = 'notification_preferences';

    protected $primaryKey = 'id_preference';

    protected $fillable = [
        'id_user',
        'email_chat',
        'email_revision',
        'email_status_review',
        'app_notification',
    ];

    protected function casts(): array
    {
        return [
            'email_chat' => 'boolean',
            'email_revision' => 'boolean',
            'email_status_review' => 'boolean',
            'app_notification' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    public static function getOrCreateForUser(int $userId): self
    {
        return static::firstOrCreate(
            ['id_user' => $userId],
            [
                'email_chat' => true,
                'email_revision' => true,
                'email_status_review' => true,
                'app_notification' => true,
            ]
        );
    }
}