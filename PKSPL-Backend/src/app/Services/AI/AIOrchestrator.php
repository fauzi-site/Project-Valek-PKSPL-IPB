<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Log;

final class AIOrchestrator
{
    public function __construct(
        private AIServiceFactory $factory,
        private ConfidenceCalculator $confidenceCalculator,
        private ReferenceExtractor $referenceExtractor,
        private GeminiResponseParser $responseParser,
    ) {
    }

    public function generate(string $prompt, array $options = []): AIResponseData
    {
        $aiService = $this->factory->make();
        $rawResponse = $aiService->generate($prompt, $options);

        if (! $rawResponse->success) {
            return $rawResponse;
        }

        $parsedResponse = $this->responseParser->parse($rawResponse);

        $validatedReferences = $this->referenceExtractor->extract($parsedResponse->references);
        $confidence = $this->confidenceCalculator->calculate($validatedReferences, $parsedResponse->provider);

        Log::info('AIOrchestrator generated AI response', [
            'provider' => $parsedResponse->provider,
            'model' => $parsedResponse->model,
            'confidence' => $confidence,
        ]);

        return $parsedResponse->withConfidence($confidence);
    }
}
