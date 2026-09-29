<?php

namespace App\Http\Controllers\Api\V1\AI;

use App\Http\Controllers\Controller;
use App\Http\Requests\AI\AIRequest;
use App\Services\AI\AIHistoryService;
use App\Services\AI\AIOrchestrator;
use App\Services\AI\AIResponseService;
use App\Services\AI\DatabaseSearchService;
use App\Services\AI\PromptBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class AIController extends Controller
{
    public function __construct(
        private AIOrchestrator $aiOrchestrator,
        private PromptBuilder $promptBuilder,
        private DatabaseSearchService $databaseSearchService,
        private AIHistoryService $historyService,
        private AIResponseService $responseService,
    ) {
    }

    public function test(Request $request): JsonResponse
    {
        $provider = config('ai.provider', 'gemini');
        $model = config('ai.' . $provider . '.model', 'gemini-2.5-flash');

        return response()->json([
            'success' => true,
            'provider' => $provider,
            'model' => $model,
            'status' => 'connected',
        ]);
    }

    public function health(Request $request): JsonResponse
    {
        $response = $this->aiOrchestrator->generate('Reply only OK.');

        if (! $response->success) {
            return response()->json([
                'success' => false,
                'message' => $response->message ?? 'AI health check gagal.',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        return response()->json([
            'success' => true,
            'reply' => $response->answer,
        ]);
    }

    public function generate(AIRequest $request): JsonResponse
    {
        $userPrompt = trim($request->input('prompt'));
        $databaseResult = $this->databaseSearchService->search($userPrompt);

        if ($databaseResult['found']) {
            $response = $this->responseService->database($databaseResult);
            $this->historyService->storeDatabase($userPrompt, $response);

            return response()->json($response);
        }

        $generated = $this->aiOrchestrator->generate($this->promptBuilder->build($userPrompt));

        if (! $generated->success) {
            return response()->json([
                'success' => false,
                'message' => $generated->message ?? 'AI generate gagal.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $response = $generated->toArray();

        Log::info('STEP 6 Final API response', ['response' => $response]);

        $this->historyService->storeExternal(
            $userPrompt,
            $response,
            $response,
            $response['references'] ?? [],
            $response['confidence'] ?? 0
        );

        return response()->json($response);
    }
}
