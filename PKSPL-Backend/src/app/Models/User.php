<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Pengguna aplikasi yang selalu terhubung ke satu role.
 */
class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $primaryKey = 'id_user';

    protected $fillable = ['id_role', 'nama', 'email', 'password', 'google_id', 'foto', 'status', 'email_verified_at', 'last_online_at', 'last_seen_at'];

    protected $hidden = ['password', 'remember_token', 'google_id'];

    /**
     * Cast password field to hashed value automatically.
     */
    protected $casts = [
        'password' => 'hashed',
        'email_verified_at' => 'datetime',
        'last_online_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];

    public function getRouteKeyName(): string
    {
        return 'id_user';
    }

    /**
     * Send password reset notification using custom PKSPL notification.
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    /**
     * Foreign key role menggunakan nama kolom custom pada schema.
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'id_role', 'id_role');
    }

    public function proyek(): HasMany
    {
        return $this->hasMany(Proyek::class, 'id_user', 'id_user');
    }

    public function analisisAi(): HasMany
    {
        return $this->hasMany(AnalisisAi::class, 'id_user', 'id_user');
    }

    public function histori(): HasMany
    {
        return $this->hasMany(Histori::class, 'id_user', 'id_user');
    }

    // ===== Review & Discussion Module (additive) =====

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'id_reviewer', 'id_user');
    }

    public function reviewComments(): HasMany
    {
        return $this->hasMany(ReviewComment::class, 'id_user', 'id_user');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class, 'id_user', 'id_user');
    }

    // ===== Chat & Messaging Module (additive) =====

    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(Conversation::class, 'conversation_participants', 'id_user', 'id_conversation')
            ->withPivot('joined_at', 'last_read_at')
            ->withTimestamps();
    }

    public function conversationParticipants(): HasMany
    {
        return $this->hasMany(ConversationParticipant::class, 'id_user', 'id_user');
    }

    public function chatMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'id_sender', 'id_user');
    }

    public function notificationPreference(): HasOne
    {
        return $this->hasOne(NotificationPreference::class, 'id_user', 'id_user');
    }
}
