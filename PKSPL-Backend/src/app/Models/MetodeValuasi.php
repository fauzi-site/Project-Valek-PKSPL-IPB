<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Menyimpan master metode yang digunakan dalam valuasi. */
class MetodeValuasi extends Model
{
    protected $table = 'metode_valuasi';
    protected $primaryKey = 'id_metode';
    protected $fillable = ['nama_metode', 'deskripsi', 'formula', 'parameter', 'status'];

    /** Menggunakan primary key schema untuk route model binding. */
    public function getRouteKeyName(): string
    {
        return 'id_metode';
    }

    /** Satu metode valuasi dapat digunakan oleh banyak hasil valuasi. */
    public function hasilValuasi(): HasMany
    {
        return $this->hasMany(HasilValuasi::class, 'id_metode', 'id_metode');
    }
}
