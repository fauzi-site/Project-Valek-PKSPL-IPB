<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CvmData extends Model
{
    protected $table = 'cvm_data';
    protected $primaryKey = 'id_cvm';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'id_proyek',
        'id_module',
        'respondent_id',
        'elicitation_format',
        'bid_amount',
        'willingness_to_pay',
        'wtp_amount',
        'socioeconomic_data',
    ];

    protected $casts = [
        'id_proyek' => 'integer',
        'id_module' => 'integer',
        'bid_amount' => 'decimal:2',
        'willingness_to_pay' => 'boolean',
        'wtp_amount' => 'decimal:2',
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
