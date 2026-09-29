<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Cost extends Model
{
    protected $table = 'costs';
    protected $primaryKey = 'id_cost';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'id_proyek',
        'category',
        'subcategory',
        'activity_group',
        'value',
        'year_applied',
        'pv_value',
        'description',
    ];

    protected $casts = [
        'id_proyek' => 'integer',
        'value' => 'decimal:2',
        'year_applied' => 'integer',
        'pv_value' => 'decimal:2',
    ];

    public function proyek(): BelongsTo
    {
        return $this->belongsTo(Proyek::class, 'id_proyek', 'id_proyek');
    }
}
