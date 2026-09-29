<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnvironmentalCoefficient extends Model
{
    protected $table = 'environmental_coefficients';
    protected $primaryKey = 'id_coefficient';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'category',
        'parameter',
        'value',
        'unit',
        'source',
    ];

    protected $casts = [
        'value' => 'decimal:6',
    ];
}
