<?php declare(strict_types=1);

namespace App\Repositories;

use App\Models\ActivityLog;
use App\Repositories\Contracts\ActivityLogRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ActivityLogRepository implements ActivityLogRepositoryInterface
{
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = ActivityLog::with(['user']);

        if (isset($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (isset($filters['id_user'])) {
            $query->where('id_user', $filters['id_user']);
        }

        return $query->latest('created_at')->paginate($perPage);
    }

    public function forProyek(int $proyekId, int $perPage = 15): LengthAwarePaginator
    {
        return ActivityLog::with(['user'])
            ->where('id_proyek', $proyekId)
            ->latest('created_at')
            ->paginate($perPage);
    }

    public function forReview(int $reviewId, int $perPage = 15): LengthAwarePaginator
    {
        return ActivityLog::with(['user'])
            ->where('id_review', $reviewId)
            ->latest('created_at')
            ->paginate($perPage);
    }

    public function create(array $data): ActivityLog
    {
        return ActivityLog::create($data);
    }
}
