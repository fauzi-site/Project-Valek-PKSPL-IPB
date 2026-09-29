<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AbmData extends Model
{
    protected $table = 'abm_data';
    protected $primaryKey = 'id_abm';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'id_proyek',
        'id_module',
        'risk_type',
        'averting_expenditure',
        'lost_income',
        'affected_households',
        'total_value',
        'notes',
    ];

    protected $casts = [
        'id_proyek' => 'integer',
        'id_module' => 'integer',
        'averting_expenditure' => 'decimal:2',
        'lost_income' => 'decimal:2',
        'affected_households' => 'integer',
        'total_value' => 'decimal:2',
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
