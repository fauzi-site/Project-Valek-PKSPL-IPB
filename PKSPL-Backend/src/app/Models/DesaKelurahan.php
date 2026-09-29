<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Master data desa atau kelurahan Indonesia.
 */
class DesaKelurahan extends Model
{
    protected $table = 'desa_kelurahan';

    protected $primaryKey = 'id_desa_kelurahan';

    protected $fillable = ['id_kecamatan', 'kode_desa_kelurahan', 'nama_desa_kelurahan', 'tipe'];

    /**
     * Menggunakan primary key schema untuk route model binding.
     */
    public function getRouteKeyName(): string
    {
        return 'id_desa_kelurahan';
    }

    /**
     * Desa atau kelurahan berada pada satu kecamatan.
     */
    public function kecamatan(): BelongsTo
    {
        return $this->belongsTo(Kecamatan::class, 'id_kecamatan', 'id_kecamatan');
    }

    /**
     * Desa atau kelurahan dapat direferensikan oleh banyak proyek.
     */
    public function proyek(): HasMany
    {
        return $this->hasMany(Proyek::class, 'id_desa_kelurahan', 'id_desa_kelurahan');
    }
}
