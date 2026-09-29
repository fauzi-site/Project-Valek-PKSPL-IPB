<?php declare(strict_types=1);

namespace App\Repositories;

use App\Models\Review;
use App\Repositories\Contracts\ReviewRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ReviewRepository implements ReviewRepositoryInterface
{
    public function all(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Review::with(['reviewer', 'proyek']);

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->paginate($perPage);
    }

    public function find(int $id): ?Review
    {
        return Review::with(['reviewer', 'proyek'])->find($id);
    }

    public function findOrFail(int $id): Review
    {
        return Review::with(['reviewer', 'proyek'])->findOrFail($id);
    }

    public function findByProyek(int $proyekId, int $perPage = 15): LengthAwarePaginator
    {
        return Review::with(['reviewer'])
            ->where('id_proyek', $proyekId)
            ->paginate($perPage);
    }

    public function create(array $data): Review
    {
        return Review::create($data);
    }

    public function update(Review $review, array $data): Review
    {
        $review->update($data);
        return $review->refresh();
    }

    public function delete(Review $review): bool
    {
        return $review->delete() ?? false;
    }
}
