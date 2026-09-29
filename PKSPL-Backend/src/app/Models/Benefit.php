<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Benefit extends Model
{
    protected $table = 'benefits';
    protected $primaryKey = 'id_benefit';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'id_proyek',
        'category',
        'subcategory',
        'ecosystem_service_group',
        'value',
        'period_year',
        'pv_value',
        'data_source',
        'source_module',
        'source_record_id',
        'description',
    ];

    protected $casts = [
        'id_proyek' => 'integer',
        'value' => 'decimal:2',
        'period_year' => 'integer',
        'pv_value' => 'decimal:2',
        'source_record_id' => 'integer',
    ];

    public function proyek(): BelongsTo
    {
        return $this->belongsTo(Proyek::class, 'id_proyek', 'id_proyek');
    }
}
