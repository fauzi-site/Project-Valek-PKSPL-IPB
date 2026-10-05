<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Master data kabupaten atau kota Indonesia.
 *
 * @property int $id_kabupaten_kota
 * @property int|null $id_provinsi
 * @property string|null $kode_kabupaten_kota
 * @property string|null $nama_kabupaten_kota
 * @property string|null $tipe
 * @property \Carbon\Carbon|null $created_at
 * @property \Carbon\Carbon|null $updated_at
 *
 * @property-read \App\Models\Provinsi|null $provinsi
 *
 * @mixin \Illuminate\Database\Eloquent\Builder
 * @method static \Illuminate\Database\Eloquent\Builder|KabupatenKota query()
 * @method static \Illuminate\Database\Eloquent\Builder|KabupatenKota where($column, $operator = null, $value = null, $boolean = 'and')
 */
class KabupatenKota extends Model
{
    protected $table = 'kabupaten_kota';

    protected $primaryKey = 'id_kabupaten_kota';

    protected $fillable = ['id_provinsi', 'kode_kabupaten_kota', 'nama_kabupaten_kota', 'tipe'];

    /**
     * Menggunakan primary key schema untuk route model binding.
     */
    public function getRouteKeyName(): string
    {
        return 'id_kabupaten_kota';
    }

    /**
     * Kabupaten atau kota berada pada satu provinsi.
     */
    public function provinsi(): BelongsTo
    {
        return $this->belongsTo(Provinsi::class, 'id_provinsi', 'id_provinsi');
    }

    /**
     * Kabupaten atau kota memiliki banyak kecamatan.
     */
    public function kecamatan(): HasMany
    {
        return $this->hasMany(Kecamatan::class, 'id_kabupaten_kota', 'id_kabupaten_kota');
    }

    /**
     * Kabupaten atau kota dapat direferensikan oleh banyak proyek.
     */
    public function proyek(): HasMany
    {
        return $this->hasMany(Proyek::class, 'id_kabupaten_kota', 'id_kabupaten_kota');
    }
}
