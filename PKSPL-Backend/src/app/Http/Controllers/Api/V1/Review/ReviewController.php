<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Review;

use App\Http\Controllers\Controller;
use App\Http\Requests\Review\StoreReviewRequest;
use App\Http\Requests\Review\UpdateReviewRequest;
use App\Http\Requests\Review\ResolveReviewRequest;
use App\Http\Requests\Review\CloseReviewRequest;
use App\Http\Resources\Review\ReviewResource;
use App\Models\Proyek;
use App\Models\Review;
use App\Repositories\Contracts\ReviewRepositoryInterface;
use App\Services\Review\ReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class ReviewController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly ReviewRepositoryInterface $reviewRepo,
        private readonly ReviewService $reviewService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = (int) $request->input('per_page', 15);
        $filters = $request->except('per_page');
        $reviews = $this->reviewRepo->all($filters, $perPage);

        return ReviewResource::collection($reviews);
    }

    public function show(Review $review): ReviewResource
    {
        $review->load(['reviewer', 'proyek'])->loadCount('comments');
        return new ReviewResource($review);
    }

    public function store(StoreReviewRequest $request, Proyek $proyek): JsonResponse
    {
        $this->authorize('create', Review::class);
        $review = $this->reviewService->createReview($proyek, $request->user(), $request->validated());
        
        return response()->json(new ReviewResource($review), 201);
    }

    public function update(UpdateReviewRequest $request, Review $review): ReviewResource
    {
        $this->authorize('update', $review);
        $updatedReview = $this->reviewService->updateReview($review, $request->validated());
        
        return new ReviewResource($updatedReview);
    }

    public function resolve(ResolveReviewRequest $request, Review $review): JsonResponse
    {
        $this->authorize('resolve', $review);
        $this->reviewService->resolve($review, $request->user());
        
        return response()->json([
            'message' => 'Discussion resolved.',
            'review' => new ReviewResource($review->fresh())
        ]);
    }

    public function reopen(Request $request, Review $review): JsonResponse
    {
        $this->authorize('reopen', $review);
        $this->reviewService->reopen($review, $request->user());
        
        return response()->json([
            'message' => 'Discussion reopened.'
        ]);
    }

    public function close(CloseReviewRequest $request, Review $review): JsonResponse
    {
        $this->authorize('close', $review);
        $this->reviewService->close($review, $request->user());
        
        return response()->json([
            'message' => 'Discussion closed.'
        ]);
    }
}
