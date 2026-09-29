<?php declare(strict_types=1);

namespace App\Repositories;

use App\Models\ReviewComment;
use App\Repositories\Contracts\ReviewCommentRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;

class ReviewCommentRepository implements ReviewCommentRepositoryInterface
{
    public function forReview(int $reviewId, int $perPage = 15): LengthAwarePaginator
    {
        return ReviewComment::with([
                'user',
                'attachments',
                'mentions.user',
                'replies' => function ($query) {
                    $query->whereNull('deleted_at')
                        ->with(['user', 'attachments', 'mentions.user']);
                }
            ])
            ->where('id_review', $reviewId)
            ->whereNull('id_parent')
            ->whereNull('deleted_at')
            ->paginate($perPage);
    }

    public function find(int $id): ?ReviewComment
    {
        return ReviewComment::with(['user', 'attachments', 'mentions.user'])->find($id);
    }

    public function findOrFail(int $id): ReviewComment
    {
        return ReviewComment::with(['user', 'attachments', 'mentions.user'])->findOrFail($id);
    }

    public function create(array $data): ReviewComment
    {
        return ReviewComment::create($data);
    }

    public function update(ReviewComment $comment, array $data): ReviewComment
    {
        $comment->update($data);
        return $comment->refresh();
    }

    public function softDelete(ReviewComment $comment): ReviewComment
    {
        $comment->deleted_at = Carbon::now();
        $comment->save();
        return $comment;
    }

    public function repliesFor(int $commentId, int $perPage = 15): LengthAwarePaginator
    {
        return ReviewComment::with(['user', 'attachments', 'mentions.user'])
            ->where('id_parent', $commentId)
            ->whereNull('deleted_at')
            ->paginate($perPage);
    }
}
