<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectValuationSetting extends Model
{
    protected $table = 'project_valuation_settings';
    protected $primaryKey = 'id_setting';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'id_proyek',
        'base_year',
        'discount_rate',
        'currency',
        'analysis_period',
        'eop_value_basis',
    ];

    protected $casts = [
        'id_proyek' => 'integer',
        'base_year' => 'integer',
        'discount_rate' => 'decimal:4',
        'analysis_period' => 'integer',
    ];

    public function proyek(): BelongsTo
    {
        return $this->belongsTo(Proyek::class, 'id_proyek', 'id_proyek');
    }
}
