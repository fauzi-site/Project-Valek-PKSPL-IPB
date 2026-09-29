<?php declare(strict_types=1);

namespace App\Repositories\Contracts;

use App\Models\Review;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface ReviewRepositoryInterface
{
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator;
    public function find(int $id): ?Review;
    public function findOrFail(int $id): Review;
    public function findByProyek(int $proyekId, int $perPage = 15): LengthAwarePaginator;
    public function create(array $data): Review;
    public function update(Review $review, array $data): Review;
    public function delete(Review $review): bool;
}
