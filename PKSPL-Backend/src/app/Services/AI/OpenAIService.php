<?php

namespace App\Services\AI;

use RuntimeException;

class OpenAIService implements AIServiceInterface
{
    public function __construct(
        private string $apiKey = '',
        private string $model = 'gpt-5',
    ) {
    }

    public function generate(string $prompt, array $options = []): AIResponseData
    {
        throw new RuntimeException('OpenAI provider belum diimplementasikan.');
    }
}
