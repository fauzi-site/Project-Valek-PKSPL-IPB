<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Menyimpan catatan aktivitas pengguna pada proyek. */
class Histori extends Model
{
    protected $table = 'histori';
    protected $primaryKey = 'id_histori';
    public const UPDATED_AT = null;
    protected $fillable = ['id_user', 'id_proyek', 'aktivitas', 'keterangan'];

    /** Menggunakan primary key schema untuk route model binding. */
    public function getRouteKeyName(): string
    {
        return 'id_histori';
    }

    /** Histori dicatat oleh satu pengguna. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    /** Histori terkait dengan satu proyek. */
    public function proyek(): BelongsTo
    {
        return $this->belongsTo(Proyek::class, 'id_proyek', 'id_proyek');
    }
}
