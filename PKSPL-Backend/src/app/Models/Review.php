<?php
declare(strict_types=1);
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Review extends Model
{
    use HasFactory;
    protected $table = 'reviews';
    protected $primaryKey = 'id_review';
    protected $fillable = ['id_proyek','id_reviewer','status','decision','notes','reviewed_at'];
    
    const STATUS_OPEN = 'Open';
    const STATUS_RESOLVED = 'Resolved';
    const STATUS_CLOSED = 'Closed';
    const DECISION_APPROVED = 'Approved';
    const DECISION_REJECTED = 'Rejected';
    const DECISION_NEED_REVISION = 'Need Revision';
    
    protected function casts(): array {
        return ['reviewed_at' => 'datetime'];
    }
    public function getRouteKeyName(): string { return 'id_review'; }
    public function proyek(): BelongsTo { return $this->belongsTo(Proyek::class,'id_proyek','id_proyek'); }
    public function reviewer(): BelongsTo { return $this->belongsTo(User::class,'id_reviewer','id_user'); }
    public function comments(): HasMany { return $this->hasMany(ReviewComment::class,'id_review','id_review'); }
    public function topLevelComments(): HasMany { return $this->hasMany(ReviewComment::class,'id_review','id_review')->whereNull('id_parent')->whereNull('deleted_at'); }
    public function activityLogs(): HasMany { return $this->hasMany(ActivityLog::class,'id_review','id_review'); }
}
