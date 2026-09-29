<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TcmData extends Model
{
    protected $table = 'tcm_data';
    protected $primaryKey = 'id_tcm';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'id_proyek',
        'id_module',
        'respondent_id',
        'distance',
        'total_travel_cost',
        'annual_visits',
        'time_cost',
        'consumer_surplus',
        'socioeconomic_data',
    ];

    protected $casts = [
        'id_proyek' => 'integer',
        'id_module' => 'integer',
        'distance' => 'decimal:4',
        'total_travel_cost' => 'decimal:2',
        'annual_visits' => 'integer',
        'time_cost' => 'decimal:2',
        'consumer_surplus' => 'decimal:2',
        'socioeconomic_data' => 'array',
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
