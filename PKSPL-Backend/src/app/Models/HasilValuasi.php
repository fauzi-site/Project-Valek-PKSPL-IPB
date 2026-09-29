<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Menyimpan komponen Total Economic Value untuk suatu area. */
class HasilValuasi extends Model
{
    protected $table = 'hasil_valuasi';
    protected $primaryKey = 'id_hasil';
    protected $fillable = ['id_jenis_tutupan_lahan', 'id_metode', 'direct_use_value', 'indirect_use_value', 'option_value', 'existence_value', 'bequest_value', 'tev', 'tanggal_hitung', 'keterangan'];

    /** Mengubah komponen nilai dan tanggal hitung ke tipe data yang sesuai. */
    protected function casts(): array
    {
        return [
            'direct_use_value' => 'decimal:2',
            'indirect_use_value' => 'decimal:2',
            'option_value' => 'decimal:2',
            'existence_value' => 'decimal:2',
            'bequest_value' => 'decimal:2',
            'tev' => 'decimal:2',
            'tanggal_hitung' => 'datetime',
        ];
    }

    /** Menggunakan primary key schema untuk route model binding. */
    public function getRouteKeyName(): string
    {
        return 'id_hasil';
    }

    /** Hasil valuasi terkait dengan satu jenis tutupan lahan. */
    public function jenisTutupanLahan(): BelongsTo
    {
        return $this->belongsTo(JenisTutupanLahan::class, 'id_jenis_tutupan_lahan', 'id_jenis_tutupan_lahan');
    }

    /** Hasil valuasi menggunakan satu metode valuasi. */
    public function metodeValuasi(): BelongsTo
    {
        return $this->belongsTo(MetodeValuasi::class, 'id_metode', 'id_metode');
    }
}
