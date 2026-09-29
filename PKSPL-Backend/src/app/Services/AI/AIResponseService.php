<?php

namespace App\Services\AI;

/**
 * Standarisasi respons AI untuk hasil database dan eksternal.
 */
class AIResponseService
{
    /**
     * Format respons untuk jawaban yang ditemukan di database.
     *
     * @param array<string, mixed> $databaseResult
     * @return array<string, mixed>
     */
    public function database(array $databaseResult): array
    {
        return [
            'success' => true,
            'source' => 'database',
            'confidence' => 100,
            'data' => $databaseResult['data'] ?? [],
        ];
    }

    /**
     * Format respons untuk jawaban yang dihasilkan dari Gemini.
     *
     * @param array<string, mixed> $formatted
     * @param array<int, array<string, mixed>> $references
     * @param int $confidence
     * @return array<string, mixed>
     */
    public function external(array $formatted, array $references, int $confidence): array
    {
        return [
            'success' => true,
            'source' => 'gemini',
            'confidence' => $confidence,
            'summary' => $formatted['summary'] ?? '',
            'answer' => $formatted['answer'] ?? '',
            'references' => $references,
            'limitations' => $formatted['limitations'] ?? '',
        ];
    }
}
