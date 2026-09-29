<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Master data provinsi Indonesia.
 */
class Provinsi extends Model
{
    protected $table = 'provinsi';

    protected $primaryKey = 'id_provinsi';

    protected $fillable = ['kode_provinsi', 'nama_provinsi'];

    /**
     * Menggunakan primary key schema untuk route model binding.
     */
    public function getRouteKeyName(): string
    {
        return 'id_provinsi';
    }

    /**
     * Satu provinsi memiliki banyak kabupaten atau kota.
     */
    public function kabupatenKota(): HasMany
    {
        return $this->hasMany(KabupatenKota::class, 'id_provinsi', 'id_provinsi');
    }

    /**
     * Satu provinsi dapat direferensikan oleh banyak proyek.
     */
    public function proyek(): HasMany
    {
        return $this->hasMany(Proyek::class, 'id_provinsi', 'id_provinsi');
    }
}
