<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CeData extends Model
{
    protected $table = 'ce_data';
    protected $primaryKey = 'id_ce';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'id_proyek',
        'id_module',
        'respondent_id',
        'scenario_title',
        'chosen_alternative',
        'attributes',
        'coefficient',
        'cost_coefficient',
        'implicit_price',
    ];

    protected $casts = [
        'id_proyek' => 'integer',
        'id_module' => 'integer',
        'attributes' => 'array',
        'coefficient' => 'decimal:6',
        'cost_coefficient' => 'decimal:6',
        'implicit_price' => 'decimal:2',
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

