<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Menyimpan histori permintaan dan respons AI.
 */
class AIHistory extends Model
{
    protected $table = 'ai_history';
    protected $primaryKey = 'id_ai_history';
    public const UPDATED_AT = null;
    protected $fillable = [
        'id_user',
        'prompt',
        'provider',
        'source',
        'confidence',
        'response',
        'references',
    ];

    protected $casts = [
        'confidence' => 'integer',
    ];

    public function getRouteKeyName(): string
    {
        return 'id_ai_history';
    }
}
