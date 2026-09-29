<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Menyimpan riwayat pertanyaan dan jawaban analisis AI per proyek. */
class AnalisisAi extends Model
{
    protected $table = 'analisis_ai';
    protected $primaryKey = 'id_analisis';
    public const UPDATED_AT = null;
    protected $fillable = ['id_proyek', 'id_user', 'pertanyaan', 'jawaban', 'sumber_data', 'tipe_analisis'];

    /** Menggunakan primary key schema untuk route model binding. */
    public function getRouteKeyName(): string
    {
        return 'id_analisis';
    }

    /** Analisis AI terkait dengan satu proyek. */
    public function proyek(): BelongsTo
    {
        return $this->belongsTo(Proyek::class, 'id_proyek', 'id_proyek');
    }

    /** Analisis AI dibuat oleh satu pengguna. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }
}
