<?php

namespace App\Services\AI;

use RuntimeException;

class AIServiceFactory
{
    public function make(?string $provider = null): AIServiceInterface
    {
        $provider = strtolower($provider ?? config('ai.provider', 'gemini'));

        return match ($provider) {
            'gemini' => new GeminiAIService(
                config('ai.gemini.key', ''),
                config('ai.gemini.model', 'gemini-2.5-flash')
            ),
            'openai' => new OpenAIService(
                config('ai.openai.key', ''),
                config('ai.openai.model', 'gpt-5')
            ),
            default => throw new RuntimeException(sprintf('AI provider tidak dikenal: %s', $provider)),
        };
    }
}
