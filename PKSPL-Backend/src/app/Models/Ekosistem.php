<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Menyimpan master data ekosistem. */
class Ekosistem extends Model
{
    protected $table = 'ekosistem';
    protected $primaryKey = 'id_ekosistem';
    protected $fillable = ['nama_ekosistem', 'deskripsi', 'status'];

    /** Menggunakan primary key schema untuk route model binding. */
    public function getRouteKeyName(): string
    {
        return 'id_ekosistem';
    }

    /** Satu ekosistem dapat memiliki banyak area terdampak. */
    public function areaTerdampak(): HasMany
    {
        return $this->hasMany(AreaTerdampak::class, 'id_ekosistem', 'id_ekosistem');
    }
}
