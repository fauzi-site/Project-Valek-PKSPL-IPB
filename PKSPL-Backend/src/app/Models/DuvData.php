<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DuvData extends Model
{
    protected $table = 'duv_data';
    protected $primaryKey = 'id_duv';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'id_proyek',
        'id_module',
        'value_type',
        'description',
        'quantity',
        'unit',
        'unit_price',
        'production_cost',
        'net_value',
        'source',
    ];

    protected $casts = [
        'id_proyek' => 'integer',
        'id_module' => 'integer',
        'quantity' => 'decimal:4',
        'unit_price' => 'decimal:2',
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
