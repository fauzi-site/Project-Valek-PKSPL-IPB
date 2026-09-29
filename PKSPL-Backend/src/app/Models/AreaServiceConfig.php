<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Menyimpan konfigurasi service (aktif/nonaktif + metode) per area tutupan lahan. */
class AreaServiceConfig extends Model
{
    protected $table = 'area_service_configs';

    protected $fillable = [
        'id_jenis_tutupan_lahan',
        'service_id',
        'is_active',
        'method_id',
        'biota',
    ];

    /** Mengubah is_active ke tipe boolean. */
    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /** Konfigurasi service terkait dengan satu jenis tutupan lahan. */
    public function jenisTutupanLahan(): BelongsTo
    {
        return $this->belongsTo(JenisTutupanLahan::class, 'id_jenis_tutupan_lahan', 'id_jenis_tutupan_lahan');
    }
}
