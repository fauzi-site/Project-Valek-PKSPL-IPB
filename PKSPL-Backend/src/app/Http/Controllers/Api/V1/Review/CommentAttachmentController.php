<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Review;

use App\Http\Controllers\Controller;
use App\Http\Requests\Review\StoreAttachmentRequest;
use App\Http\Resources\Review\CommentAttachmentResource;
use App\Models\CommentAttachment;
use App\Models\Review;
use App\Models\ReviewComment;
use App\Services\Review\AttachmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class CommentAttachmentController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly AttachmentService $attachmentService
    ) {}

    public function store(StoreAttachmentRequest $request, Review $review, ReviewComment $comment): JsonResponse
    {
        $this->authorize('create', CommentAttachment::class);

        if ($comment->deleted_at !== null) {
            abort(422, 'Cannot attach to a deleted comment.');
        }

        $attachment = $this->attachmentService->store($request->file('file'), $comment->id_comment);

        return response()->json(new CommentAttachmentResource($attachment), 201);
    }

    public function destroy(Request $request, Review $review, ReviewComment $comment, CommentAttachment $attachment): JsonResponse
    {
        $this->authorize('delete', $attachment);

        $this->attachmentService->destroy($attachment);

        return response()->json([], 204);
    }
}
