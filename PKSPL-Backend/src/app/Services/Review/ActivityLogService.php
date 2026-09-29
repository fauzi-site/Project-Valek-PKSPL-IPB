<?php declare(strict_types=1);

namespace App\Services\Review;

use App\Models\ActivityLog;
use App\Repositories\Contracts\ActivityLogRepositoryInterface;

class ActivityLogService
{
    public function __construct(
        private ActivityLogRepositoryInterface $repository
    ) {}

    public function log(
        ?int $userId,
        ?int $proyekId,
        ?int $reviewId,
        ?int $commentId,
        string $action,
        ?string $description = null,
        ?array $meta = null
    ): ActivityLog {
        return $this->repository->create([
            'id_user' => $userId,
            'id_proyek' => $proyekId,
            'id_review' => $reviewId,
            'id_comment' => $commentId,
            'action' => $action,
            'description' => $description,
            'meta' => $meta ? json_encode($meta) : null,
        ]);
    }
}
