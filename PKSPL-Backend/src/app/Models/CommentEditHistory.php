<?php
declare(strict_types=1);
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommentEditHistory extends Model
{
    public $timestamps = false;
    protected $table = 'comment_edit_histories';
    protected $primaryKey = 'id_history';
    protected $fillable = ['id_comment','id_user','body_before','body_after','edited_at'];
    protected function casts(): array { return ['edited_at' => 'datetime']; }
    public function getRouteKeyName(): string { return 'id_history'; }
    public function comment(): BelongsTo { return $this->belongsTo(ReviewComment::class,'id_comment','id_comment'); }
    public function user(): BelongsTo { return $this->belongsTo(User::class,'id_user','id_user'); }
}
