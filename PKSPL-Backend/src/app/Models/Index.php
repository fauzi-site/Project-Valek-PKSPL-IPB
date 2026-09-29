<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Index extends Model
{
    protected $table = 'indexes';

    protected $primaryKey = 'id_index';

    protected $fillable = ['id_proyek', 'nama_index', 'kode_index', 'luas', 'satuan_luas', 'geometry', 'deskripsi'];

    protected function casts(): array
    {
        return ['luas' => 'decimal:2', 'geometry' => 'array'];
    }

    public function getRouteKeyName(): string
    {
        return 'id_index';
    }

    public function proyek(): BelongsTo
    {
        return $this->belongsTo(Proyek::class, 'id_proyek', 'id_proyek');
    }

    public function jenisTutupanLahan(): HasMany
    {
        return $this->hasMany(JenisTutupanLahan::class, 'id_index', 'id_index');
    }
}
