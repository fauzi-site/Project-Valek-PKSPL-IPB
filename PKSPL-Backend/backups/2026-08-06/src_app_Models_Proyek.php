<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Proyek extends Model
{
    protected $table = 'proyek';

    protected $primaryKey = 'id_proyek';

    protected $fillable = [
        'id_user',
        'id_provinsi',
        'id_kabupaten_kota',
        'id_kecamatan',
        'id_desa_kelurahan',
        'nama_proyek',
        'tujuan_valuasi',
        'alamat_lengkap',
        'latitude',
        'longitude',
        'tahun',
        'deskripsi',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'tahun' => 'integer',
            'latitude' => 'decimal:6',
            'longitude' => 'decimal:6',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'id_proyek';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    /**
     * Proyek berada pada satu provinsi.
     */
    public function provinsi(): BelongsTo
    {
        return $this->belongsTo(Provinsi::class, 'id_provinsi', 'id_provinsi');
    }

    /**
     * Proyek berada pada satu kabupaten atau kota.
     */
    public function kabupatenKota(): BelongsTo
    {
        return $this->belongsTo(KabupatenKota::class, 'id_kabupaten_kota', 'id_kabupaten_kota');
    }

    /**
     * Proyek berada pada satu kecamatan.
     */
    public function kecamatan(): BelongsTo
    {
        return $this->belongsTo(Kecamatan::class, 'id_kecamatan', 'id_kecamatan');
    }

    /**
     * Proyek berada pada satu desa atau kelurahan.
     */
    public function desaKelurahan(): BelongsTo
    {
        return $this->belongsTo(DesaKelurahan::class, 'id_desa_kelurahan', 'id_desa_kelurahan');
    }

    public function areaTerdampak(): HasMany
    {
        return $this->hasMany(AreaTerdampak::class, 'id_proyek', 'id_proyek');
    }

    public function analisisAi(): HasMany
    {
        return $this->hasMany(AnalisisAi::class, 'id_proyek', 'id_proyek');
    }

    public function histori(): HasMany
    {
        return $this->hasMany(Histori::class, 'id_proyek', 'id_proyek');
    }
}
