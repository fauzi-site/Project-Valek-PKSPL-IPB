<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ValuationModule extends Model
{
    protected $table = 'valuation_modules';
    protected $primaryKey = 'id_module';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'id_proyek',
        'module_type',
        'name',
        'description',
        'configuration',
        'calculation_result',
    ];

    protected $casts = [
        'id_proyek' => 'integer',
        'configuration' => 'array',
        'calculation_result' => 'array',
    ];

    public function proyek(): BelongsTo
    {
        return $this->belongsTo(Proyek::class, 'id_proyek', 'id_proyek');
    }

    public function eopData(): HasMany
    {
        return $this->hasMany(EopData::class, 'id_module', 'id_module');
    }

    public function tcmData(): HasMany
    {
        return $this->hasMany(TcmData::class, 'id_module', 'id_module');
    }

    public function cvmData(): HasMany
    {
        return $this->hasMany(CvmData::class, 'id_module', 'id_module');
    }

    // You can add more relations (hpm, abm, ce, etc) here as needed.
}
