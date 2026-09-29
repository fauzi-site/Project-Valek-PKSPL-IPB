<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EopData extends Model
{
    protected $table = 'eop_data';
    protected $primaryKey = 'id_eop';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'id_proyek',
        'id_module',
        'commodity',
        'quantity_before',
        'quantity_after',
        'output_price',
        'production_cost',
        'net_value',
        'estimation_method',
    ];

    protected $casts = [
        'id_proyek' => 'integer',
        'id_module' => 'integer',
        'quantity_before' => 'decimal:4',
        'quantity_after' => 'decimal:4',
        'output_price' => 'decimal:2',
        'production_cost' => 'decimal:2',
        'net_value' => 'decimal:2',
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
