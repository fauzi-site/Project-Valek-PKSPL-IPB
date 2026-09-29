<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JenisTutupanLahan extends Model
{
    protected $table = 'jenis_tutupan_lahan';

    protected $primaryKey = 'id_jenis_tutupan_lahan';

    protected $fillable = ['id_index', 'nama_tutupan_lahan', 'kategori', 'luas', 'satuan_luas', 'geometry', 'deskripsi'];

    protected function casts(): array
    {
        return ['luas' => 'decimal:2', 'geometry' => 'array'];
    }

    public function getRouteKeyName(): string
    {
        return 'id_jenis_tutupan_lahan';
    }

    public function index(): BelongsTo
    {
        return $this->belongsTo(Index::class, 'id_index', 'id_index');
    }

    public function provisioningServices(): HasMany
    {
        return $this->hasMany(ProvisioningService::class, 'id_jenis_tutupan_lahan', 'id_jenis_tutupan_lahan');
    }

    public function regulatingServices(): HasMany
    {
        return $this->hasMany(RegulatingService::class, 'id_jenis_tutupan_lahan', 'id_jenis_tutupan_lahan');
    }

    public function supportingServices(): HasMany
    {
        return $this->hasMany(SupportingService::class, 'id_jenis_tutupan_lahan', 'id_jenis_tutupan_lahan');
    }

    public function culturalServices(): HasMany
    {
        return $this->hasMany(CulturalService::class, 'id_jenis_tutupan_lahan', 'id_jenis_tutupan_lahan');
    }

    public function hasilValuasi(): HasMany
    {
        return $this->hasMany(HasilValuasi::class, 'id_jenis_tutupan_lahan', 'id_jenis_tutupan_lahan');
    }

    /** Konfigurasi service valuasi per jenis tutupan lahan. */
    public function areaServiceConfigs(): HasMany
    {
        return $this->hasMany(AreaServiceConfig::class, 'id_jenis_tutupan_lahan', 'id_jenis_tutupan_lahan');
    }

    /** Baris data valuasi per jenis tutupan lahan. */
    public function valuationRows(): HasMany
    {
        return $this->hasMany(ValuationRow::class, 'id_jenis_tutupan_lahan', 'id_jenis_tutupan_lahan');
    }

    /** Kolom custom valuasi per jenis tutupan lahan. */
    public function valuationCustomColumns(): HasMany
    {
        return $this->hasMany(ValuationCustomColumn::class, 'id_jenis_tutupan_lahan', 'id_jenis_tutupan_lahan');
    }
}
