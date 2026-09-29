<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Menyimpan satu baris data valuasi (setara satu baris Excel) untuk metode tertentu. */
class ValuationRow extends Model
{
    protected $table = 'valuation_rows';

    protected $fillable = [
        'id_jenis_tutupan_lahan',
        'service_id',
        'method_id',
        'biota',
        'row_order',
        'row_data',
        'total_nilai',
    ];

    /** Mengubah kolom JSON dan numerik ke tipe yang sesuai. */
    protected function casts(): array
    {
        return [
            'row_data'    => 'array',
            'total_nilai' => 'decimal:2',
        ];
    }

    /** Baris data terkait dengan satu jenis tutupan lahan. */
    public function jenisTutupanLahan(): BelongsTo
    {
        return $this->belongsTo(JenisTutupanLahan::class, 'id_jenis_tutupan_lahan', 'id_jenis_tutupan_lahan');
    }
}
