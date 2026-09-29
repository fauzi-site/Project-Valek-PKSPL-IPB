<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Pengguna aplikasi yang selalu terhubung ke satu role.
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $primaryKey = 'id_user';

    protected $fillable = ['id_role', 'nama', 'email', 'password', 'google_id', 'foto', 'status'];

    protected $hidden = ['password', 'remember_token', 'google_id'];

    /**
     * Cast password field to hashed value automatically.
     */
    protected $casts = [
        'password' => 'hashed',
    ];

    public function getRouteKeyName(): string
    {
        return 'id_user';
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

    public function validasiAnalyst(): HasMany
    {
        return $this->hasMany(ValidasiAnalyst::class, 'id_user', 'id_user');
    }
}
