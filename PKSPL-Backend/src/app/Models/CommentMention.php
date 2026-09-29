<?php
declare(strict_types=1);
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommentMention extends Model
{
    public $timestamps = false;
    protected $table = 'comment_mentions';
    protected $primaryKey = 'id_mention';
    protected $fillable = ['id_comment','id_user'];
    const CREATED_AT = 'created_at';
    protected function casts(): array { return ['created_at' => 'datetime']; }
    public function getRouteKeyName(): string { return 'id_mention'; }
    public function comment(): BelongsTo { return $this->belongsTo(ReviewComment::class,'id_comment','id_comment'); }
    public function user(): BelongsTo { return $this->belongsTo(User::class,'id_user','id_user'); }
}
