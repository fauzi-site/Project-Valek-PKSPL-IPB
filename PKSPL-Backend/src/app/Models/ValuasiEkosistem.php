<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Master data valuasi per tipe ekosistem. */
class ValuasiEkosistem extends Model
{
    protected $table = 'valuasi_ekosistems';

    protected $fillable = [
        'nama_ekosistem',
        'tev_ekosistem',
    ];

    protected function casts(): array
    {
        return [
            'tev_ekosistem' => 'decimal:2',
        ];
    }

    /** Satu ekosistem memiliki banyak kategori jasa. */
    public function kategoriJasas(): HasMany
    {
        return $this->hasMany(ValuasiKategoriJasa::class, 'valuasi_ekosistem_id');
    }
}

