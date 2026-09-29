<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Master data kecamatan Indonesia.
 */
class Kecamatan extends Model
{
    protected $table = 'kecamatan';

    protected $primaryKey = 'id_kecamatan';

    protected $fillable = ['id_kabupaten_kota', 'kode_kecamatan', 'nama_kecamatan'];

    /**
     * Menggunakan primary key schema untuk route model binding.
     */
    public function getRouteKeyName(): string
    {
        return 'id_kecamatan';
    }

    /**
     * Kecamatan berada pada satu kabupaten atau kota.
     */
    public function kabupatenKota(): BelongsTo
    {
        return $this->belongsTo(KabupatenKota::class, 'id_kabupaten_kota', 'id_kabupaten_kota');
    }

    /**
     * Kecamatan memiliki banyak desa atau kelurahan.
     */
    public function desaKelurahan(): HasMany
    {
        return $this->hasMany(DesaKelurahan::class, 'id_kecamatan', 'id_kecamatan');
    }

    /**
     * Kecamatan dapat direferensikan oleh banyak proyek.
     */
    public function proyek(): HasMany
    {
        return $this->hasMany(Proyek::class, 'id_kecamatan', 'id_kecamatan');
    }
}
