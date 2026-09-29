<?php declare(strict_types=1);

namespace App\Repositories\Contracts;

use App\Models\ReviewComment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface ReviewCommentRepositoryInterface
{
    public function forReview(int $reviewId, int $perPage = 15): LengthAwarePaginator;
    public function find(int $id): ?ReviewComment;
    public function findOrFail(int $id): ReviewComment;
    public function create(array $data): ReviewComment;
    public function update(ReviewComment $comment, array $data): ReviewComment;
    public function softDelete(ReviewComment $comment): ReviewComment;
    public function repliesFor(int $commentId, int $perPage = 15): LengthAwarePaginator;
}
