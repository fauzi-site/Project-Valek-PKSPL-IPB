<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Mendefinisikan kolom input custom yang ditambahkan peneliti untuk metode valuasi tertentu. */
class ValuationCustomColumn extends Model
{
    protected $table = 'valuation_custom_columns';

    protected $fillable = [
        'id_jenis_tutupan_lahan',
        'service_id',
        'method_id',
        'biota',
        'column_key',
        'label',
        'type',
        'is_required',
        'col_order',
    ];

    /** Mengubah is_required ke tipe boolean. */
    protected function casts(): array
    {
        return ['is_required' => 'boolean'];
    }

    /** Kolom custom terkait dengan satu jenis tutupan lahan. */
    public function jenisTutupanLahan(): BelongsTo
    {
        return $this->belongsTo(JenisTutupanLahan::class, 'id_jenis_tutupan_lahan', 'id_jenis_tutupan_lahan');
    }
}
