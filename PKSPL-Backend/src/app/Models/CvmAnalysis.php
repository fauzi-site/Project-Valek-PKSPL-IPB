<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CvmAnalysis extends Model
{
    protected $table = 'cvm_analyses';
    protected $primaryKey = 'id_cvm_analysis';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'id_proyek',
        'id_module',
        'analysis_type',
        'population',
        'independent_variables',
        'coefficients',
        'median_wtp',
        'mean_wtp',
        'total_wtp',
        'n',
        'notes',
    ];

    protected $casts = [
        'id_proyek' => 'integer',
        'id_module' => 'integer',
        'population' => 'integer',
        'independent_variables' => 'array',
        'coefficients' => 'array',
        'median_wtp' => 'decimal:2',
        'mean_wtp' => 'decimal:2',
        'total_wtp' => 'decimal:2',
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
