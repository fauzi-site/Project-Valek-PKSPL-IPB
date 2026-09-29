<?php

namespace App\Services\AI;

interface AIServiceInterface
{
    /**
     * Menghasilkan respon AI dari prompt dan opsi tambahan.
     *
     * @param string $prompt
     * @param array<string, mixed> $options
     */
    public function generate(string $prompt, array $options = []): AIResponseData;
}
