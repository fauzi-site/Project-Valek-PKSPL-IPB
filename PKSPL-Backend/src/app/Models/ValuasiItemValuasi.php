<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Item detail valuasi ekonomi per jasa ekosistem. */
class ValuasiItemValuasi extends Model
{
    protected $table = 'valuasi_item_valuasis';

    protected $fillable = [
        'valuasi_kategori_jasa_id',
        'no',
        'nama_item',
        'nama_latin',
        'nama_daerah',
        'total_nilai_ekonomi',
        'kategori',
    ];

    protected function casts(): array
    {
        return [
            'total_nilai_ekonomi' => 'decimal:2',
        ];
    }

    /** Item milik satu kategori jasa. */
    public function kategoriJasa(): BelongsTo
    {
        return $this->belongsTo(ValuasiKategoriJasa::class, 'valuasi_kategori_jasa_id');
    }
}

