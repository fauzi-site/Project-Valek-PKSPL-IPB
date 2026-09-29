<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HpmData extends Model
{
    protected $table = 'hpm_data';
    protected $primaryKey = 'id_hpm';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'id_proyek',
        'id_module',
        'property_id',
        'transaction_price',
        'env_quality',
        'lot_size',
        'rooms',
        'characteristics',
    ];

    protected $casts = [
        'id_proyek' => 'integer',
        'id_module' => 'integer',
        'transaction_price' => 'decimal:2',
        'env_quality' => 'decimal:6',
        'lot_size' => 'decimal:4',
        'rooms' => 'integer',
        'characteristics' => 'array',
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
