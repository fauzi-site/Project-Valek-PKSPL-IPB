<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Review;

use App\Http\Controllers\Controller;
use App\Http\Requests\Review\StoreReplyRequest;
use App\Http\Resources\Review\ReviewCommentResource;
use App\Models\Review;
use App\Models\ReviewComment;
use App\Services\Review\ReviewCommentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class CommentReplyController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly ReviewCommentService $commentService
    ) {}

    public function store(StoreReplyRequest $request, Review $review, ReviewComment $comment): JsonResponse
    {
        $this->authorize('reply', $comment);

        if ($review->status === 'Closed') {
            abort(422, 'Cannot comment on a closed review.');
        }

        if ($comment->deleted_at !== null) {
            abort(422, 'Cannot reply to a deleted comment.');
        }

        $reply = $this->commentService->createReply($comment, $request->user(), $request->validated());

        return response()->json(new ReviewCommentResource($reply), 201);
    }
}
