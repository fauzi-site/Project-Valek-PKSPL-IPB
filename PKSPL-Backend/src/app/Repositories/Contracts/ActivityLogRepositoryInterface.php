<?php declare(strict_types=1);

namespace App\Repositories\Contracts;

use App\Models\ActivityLog;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface ActivityLogRepositoryInterface
{
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator;
    public function forProyek(int $proyekId, int $perPage = 15): LengthAwarePaginator;
    public function forReview(int $reviewId, int $perPage = 15): LengthAwarePaginator;
    public function create(array $data): ActivityLog;
}
