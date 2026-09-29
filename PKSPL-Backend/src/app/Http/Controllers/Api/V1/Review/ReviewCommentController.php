<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Review;

use App\Http\Controllers\Controller;
use App\Http\Requests\Review\StoreCommentRequest;
use App\Http\Requests\Review\UpdateCommentRequest;
use App\Http\Resources\Review\ReviewCommentResource;
use App\Models\Review;
use App\Models\ReviewComment;
use App\Repositories\Contracts\ReviewCommentRepositoryInterface;
use App\Services\Review\ReviewCommentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class ReviewCommentController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly ReviewCommentRepositoryInterface $commentRepo,
        private readonly ReviewCommentService $commentService
    ) {}

    public function index(Request $request, Review $review): AnonymousResourceCollection
    {
        $perPage = (int) $request->input('per_page', 15);
        if ($perPage < 1 || $perPage > 100) {
            $perPage = 15;
        }

        $comments = $this->commentRepo->forReview($review->id_review, $perPage);

        return ReviewCommentResource::collection($comments);
    }

    public function show(Review $review, ReviewComment $comment): ReviewCommentResource
    {
        $comment->load(['user', 'attachments', 'mentions.user', 'replies', 'editHistories.user']);
        return new ReviewCommentResource($comment);
    }

    public function store(StoreCommentRequest $request, Review $review): JsonResponse
    {
        $this->authorize('create', ReviewComment::class);

        if ($review->status === 'Closed') {
            abort(422, 'Cannot comment on a closed review.');
        }

        $comment = $this->commentService->createComment($review, $request->user(), $request->validated());

        return response()->json(new ReviewCommentResource($comment), 201);
    }

    public function update(UpdateCommentRequest $request, Review $review, ReviewComment $comment): ReviewCommentResource
    {
        $this->authorize('update', $comment);

        $updatedComment = $this->commentService->updateComment($comment, $request->user(), $request->input('body'));

        return new ReviewCommentResource($updatedComment);
    }

    public function destroy(Request $request, Review $review, ReviewComment $comment): JsonResponse
    {
        $this->authorize('delete', $comment);

        $this->commentService->deleteComment($comment, $request->user());

        return response()->json(['message' => 'Comment deleted.']);
    }
}
