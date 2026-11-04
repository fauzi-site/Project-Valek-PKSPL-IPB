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
 *
 * @property int $id_user
 * @property int $id_role
 * @property string $nama
 * @property string $email
 * @property string|null $foto
 * @property string|null $google_id
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $email_verified_at
 * @property \Illuminate\Support\Carbon|null $last_online_at
 * @property \Illuminate\Support\Carbon|null $last_seen_at
 * @property string|null $status_permohonan
 * @property \Illuminate\Support\Carbon|null $permohonan_at
 * @property int|null $reviewed_by
 * @property \Illuminate\Support\Carbon|null $reviewed_at
 * @property string|null $rejection_reason
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Role|null $role
 * @property-read \App\Models\User|null $reviewer
 */
class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    public const STATUS_PERMOHONAN_BELUM_DIAJUKAN = 'Belum diajukan';
    public const STATUS_PERMOHONAN_PENDING = 'Pending';
    public const STATUS_PERMOHONAN_APPROVED = 'Approved';
    public const STATUS_PERMOHONAN_REJECTED = 'Rejected';

    protected $primaryKey = 'id_user';

    protected $fillable = [
        'id_role',
        'nama',
        'email',
        'password',
        'google_id',
        'foto',
        'status',
        'email_verified_at',
        'last_online_at',
        'last_seen_at',
        'status_permohonan',
        'permohonan_at',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
    ];

    protected $hidden = ['password', 'remember_token', 'google_id'];

    /**
     * Cast password field to hashed value automatically.
     */
    protected $casts = [
        'password' => 'hashed',
        'email_verified_at' => 'datetime',
        'last_online_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'permohonan_at' => 'datetime',
        'reviewed_at' => 'datetime',
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
     * Admin yang menyetujui atau menolak permohonan akun peneliti.
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reviewed_by', 'id_user');
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
