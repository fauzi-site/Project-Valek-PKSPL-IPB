<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Ringkasan indeks valuasi ekosistem per kategori jasa. */
class IndexEkosistemSummary extends Model
{
    protected $table = 'index_ekosistem_summary';

    protected $fillable = [
        'nama_ekosistem',
        'kategori',
        'jumlah_rp',
        'tev_total',
    ];

    protected function casts(): array
    {
        return [
            'jumlah_rp' => 'decimal:2',
            'tev_total' => 'decimal:2',
        ];
    }
}

