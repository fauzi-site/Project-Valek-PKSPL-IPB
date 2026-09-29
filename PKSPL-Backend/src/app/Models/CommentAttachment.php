<?php
declare(strict_types=1);
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommentAttachment extends Model
{
    use HasFactory;
    protected $table = 'comment_attachments';
    protected $primaryKey = 'id_attachment';
    protected $fillable = ['id_comment','original_name','stored_path','mime_type','size_bytes'];
    protected function casts(): array { return ['size_bytes' => 'integer']; }
    public function getRouteKeyName(): string { return 'id_attachment'; }
    public function comment(): BelongsTo { return $this->belongsTo(ReviewComment::class,'id_comment','id_comment'); }
}
