<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Menyimpan area ekosistem yang terdampak oleh proyek. */
class AreaTerdampak extends Model
{
    protected $table = 'area_terdampak';
    protected $primaryKey = 'id_area';
    protected $fillable = ['id_proyek', 'id_ekosistem', 'nama_area', 'latitude', 'longitude', 'luas', 'satuan_luas', 'deskripsi'];

    /** Mengubah koordinat dan luas ke presisi numerik yang sesuai. */
    protected function casts(): array
    {
        return ['latitude' => 'decimal:6', 'longitude' => 'decimal:6', 'luas' => 'decimal:2'];
    }

    /** Menggunakan primary key schema untuk route model binding. */
    public function getRouteKeyName(): string
    {
        return 'id_area';
    }

    /** Area terdampak terkait dengan satu proyek. */
    public function proyek(): BelongsTo
    {
        return $this->belongsTo(Proyek::class, 'id_proyek', 'id_proyek');
    }

    /** Area terdampak berada pada satu ekosistem. */
    public function ekosistem(): BelongsTo
    {
        return $this->belongsTo(Ekosistem::class, 'id_ekosistem', 'id_ekosistem');
    }

}
