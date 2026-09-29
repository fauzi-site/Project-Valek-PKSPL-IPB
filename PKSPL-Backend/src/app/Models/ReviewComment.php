<?php
declare(strict_types=1);
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Manual soft-delete (deleted_at column) to keep compatibility with PostgreSQL.
// We do NOT use Illuminate\Database\Eloquent\SoftDeletes trait here because
// the global scope would complicate nested reply queries. We manage deleted_at manually.
class ReviewComment extends Model
{
    use HasFactory;
    protected $table = 'review_comments';
    protected $primaryKey = 'id_comment';
    protected $fillable = ['id_review','id_parent','id_user','body','is_edited','edited_at','deleted_at'];
    
    protected function casts(): array {
        return [
            'is_edited' => 'boolean',
            'edited_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }
    public function getRouteKeyName(): string { return 'id_comment'; }
    public function review(): BelongsTo { return $this->belongsTo(Review::class,'id_review','id_review'); }
    public function user(): BelongsTo { return $this->belongsTo(User::class,'id_user','id_user'); }
    public function parent(): BelongsTo { return $this->belongsTo(ReviewComment::class,'id_parent','id_comment'); }
    public function replies(): HasMany { return $this->hasMany(ReviewComment::class,'id_parent','id_comment')->whereNull('deleted_at'); }
    public function allReplies(): HasMany { return $this->hasMany(ReviewComment::class,'id_parent','id_comment'); }
    public function attachments(): HasMany { return $this->hasMany(CommentAttachment::class,'id_comment','id_comment'); }
    public function mentions(): HasMany { return $this->hasMany(CommentMention::class,'id_comment','id_comment'); }
    public function editHistories(): HasMany { return $this->hasMany(CommentEditHistory::class,'id_comment','id_comment'); }
    public function isDeleted(): bool { return $this->deleted_at !== null; }
}
