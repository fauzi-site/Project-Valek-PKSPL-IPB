<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class GeminiAIService implements AIServiceInterface
{
    private const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent';

    public function __construct(
        private string $apiKey,
        private string $model = 'gemini-3.5-flash',
    ) {
    }

    public function generate(string $prompt, array $options = []): AIResponseData
    {
        $responseData = $this->sendRequest($prompt, $options);

        if (isset($responseData['error']) && $responseData['error'] === true) {
            return AIResponseData::error('gemini', $this->model, $responseData['message'] ?? 'Permintaan ke Gemini API gagal.');
        }

        if (! isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
            return AIResponseData::error('gemini', $this->model, 'Tidak ada output dari Gemini API');
        }

        $rawContent = trim((string) $responseData['candidates'][0]['content']['parts'][0]['text']);

        $finishReason = $responseData['candidates'][0]['finishReason'] ?? null;

        Log::info('Gemini Finish Reason', [

        'finishReason' => $finishReason

]);

        if ($rawContent === '') {
            return AIResponseData::error('gemini', $this->model, 'Gemini API mengembalikan konten kosong');
        }

        Log::info('RAW GEMINI', ['raw' => $rawContent]);

        return AIResponseData::success(
            'gemini',
            $this->model,
            '',
            $rawContent,
            [],
            '',
            null,
        );
    }

    private function sendRequest(string $prompt, array $options): array
{
    $endpoint = sprintf(self::ENDPOINT, $this->model);

    $url = $endpoint.'?'.http_build_query([
        'key' => $this->apiKey,
    ]);

    $requestBody = [

        'contents' => [[

            'parts' => [[

                'text' => $prompt

            ]]

        ]],

        'generationConfig' => [

            'temperature' => $options['temperature'] ?? 0.2,

            'candidateCount' => 1,

            'maxOutputTokens' => $options['max_output_tokens'] ?? 4096,

            'responseMimeType' => 'application/json'

        ]

    ];

    Log::info('Gemini Request', $requestBody);

    $response = Http::timeout(60)

        ->acceptJson()

        ->contentType('application/json')

        ->post($url, $requestBody);

    if (!$response->successful()) {

        Log::error('Gemini Error', [

            'status' => $response->status(),

            'body' => $response->body()

        ]);

        return [

            'error' => true,

            'message' => $response->json('error.message')

                ?? 'Gemini API Error'

        ];

    }

    Log::info('Gemini Response', [

        'response' => $response->json()

    ]);

    return $response->json();
}

}
