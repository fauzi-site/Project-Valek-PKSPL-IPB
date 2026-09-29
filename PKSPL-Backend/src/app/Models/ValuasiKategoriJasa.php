<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Kategori jasa ekosistem (Provisioning/Regulating/Supporting/Cultural) per ekosistem. */
class ValuasiKategoriJasa extends Model
{
    protected $table = 'valuasi_kategori_jasas';

    protected $fillable = [
        'valuasi_ekosistem_id',
        'nama_kategori',
        'kode_kategori',
        'subtotal_kategori',
    ];

    protected function casts(): array
    {
        return [
            'subtotal_kategori' => 'decimal:2',
        ];
    }

    /** Kategori jasa milik satu ekosistem. */
    public function valuasiEkosistem(): BelongsTo
    {
        return $this->belongsTo(ValuasiEkosistem::class, 'valuasi_ekosistem_id');
    }

    /** Satu kategori memiliki banyak item valuasi. */
    public function itemValuasis(): HasMany
    {
        return $this->hasMany(ValuasiItemValuasi::class, 'valuasi_kategori_jasa_id');
    }
}

