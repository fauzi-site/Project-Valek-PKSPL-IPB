<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Review;

use App\Http\Controllers\Controller;
use App\Http\Requests\Review\SubmitDatasetRequest;
use App\Models\Proyek;
use App\Services\Review\ReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class DatasetSubmissionController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly ReviewService $reviewService
    ) {}

    public function submit(SubmitDatasetRequest $request, Proyek $proyek): JsonResponse
    {
        $this->authorize('update', $proyek);

        $this->reviewService->submit($proyek, $request->user()->id_user);

        return response()->json([
            'message' => 'Dataset submitted for review.',
            'status' => $proyek->fresh()->status
        ], 200);
    }
}
