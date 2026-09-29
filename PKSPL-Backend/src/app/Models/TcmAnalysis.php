<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TcmAnalysis extends Model
{
    protected $table = 'tcm_analyses';
    protected $primaryKey = 'id_tcm_analysis';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'id_proyek',
        'id_module',
        'model_type',
        'dependent_variable',
        'independent_variables',
        'coefficients',
        'consumer_surplus_per_visit',
        'total_recreation_value',
        'r_squared',
        'n',
        'notes',
    ];

    protected $casts = [
        'id_proyek' => 'integer',
        'id_module' => 'integer',
        'independent_variables' => 'array',
        'coefficients' => 'array',
        'consumer_surplus_per_visit' => 'decimal:2',
        'total_recreation_value' => 'decimal:2',
        'r_squared' => 'decimal:4',
        'n' => 'integer',
    ];

    public function proyek(): BelongsTo
    {
        return $this->belongsTo(Proyek::class, 'id_proyek', 'id_proyek');
    }

    public function valuationModule(): BelongsTo
    {
        return $this->belongsTo(ValuationModule::class, 'id_module', 'id_module');
    }
}
