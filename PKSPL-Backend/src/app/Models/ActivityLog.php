<?php
declare(strict_types=1);
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    use HasFactory;
    public $timestamps = false;
    const CREATED_AT = 'created_at';
    protected $table = 'activity_logs';
    protected $primaryKey = 'id_log';
    protected $fillable = ['id_user','id_proyek','id_review','id_comment','action','description','meta'];
    protected function casts(): array {
        return [
            'meta' => 'array',
            'created_at' => 'datetime',
        ];
    }
    // Action constants
    const ACTION_SUBMIT_DATASET = 'submit_dataset';
    const ACTION_APPROVE = 'approve';
    const ACTION_REJECT = 'reject';
    const ACTION_NEED_REVISION = 'need_revision';
    const ACTION_CREATE_COMMENT = 'create_comment';
    const ACTION_REPLY = 'reply';
    const ACTION_RESOLVE = 'resolve';
    const ACTION_REOPEN = 'reopen';
    const ACTION_CLOSE = 'close';
    const ACTION_DELETE_COMMENT = 'delete_comment';
    const ACTION_EDIT_COMMENT = 'edit_comment';
    const ACTION_MENTION = 'mention';
    const ACTION_UPLOAD_ATTACHMENT = 'upload_attachment';
    const ACTION_DELETE_ATTACHMENT = 'delete_attachment';
    
    public function getRouteKeyName(): string { return 'id_log'; }
    public function user(): BelongsTo { return $this->belongsTo(User::class,'id_user','id_user'); }
    public function proyek(): BelongsTo { return $this->belongsTo(Proyek::class,'id_proyek','id_proyek'); }
    public function review(): BelongsTo { return $this->belongsTo(Review::class,'id_review','id_review'); }
    public function comment(): BelongsTo { return $this->belongsTo(ReviewComment::class,'id_comment','id_comment'); }
}
