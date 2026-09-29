<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketPrice extends Model
{
    protected $table = 'market_prices';
    protected $primaryKey = 'id_price';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'id_proyek',
        'commodity_name',
        'unit',
        'price',
        'year',
        'source',
    ];

    protected $casts = [
        'id_proyek' => 'integer',
        'price' => 'decimal:2',
        'year' => 'integer',
    ];

    public function proyek(): BelongsTo
    {
        return $this->belongsTo(Proyek::class, 'id_proyek', 'id_proyek');
    }
}
