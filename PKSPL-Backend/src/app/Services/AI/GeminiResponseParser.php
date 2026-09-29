<?php

namespace App\Services\AI;

final class GeminiResponseParser
{
    public function parse(AIResponseData $response): AIResponseData
    {
        if (! $response->success || $response->provider !== 'gemini') {
            return $response;
        }

        $rawContent = trim($response->answer);

        if ($rawContent === '') {
            return AIResponseData::success(
                'gemini',
                $response->model,
                '',
                '',
                [],
                '',
                null
            );
        }

        $content = $this->stripMarkdownFence($rawContent);

        $decoded = $this->decodeJsonContent($content);

        if (! is_array($decoded)) {
            // Bukan JSON, anggap sebagai plain text
            return AIResponseData::success(
                'gemini',
                $response->model,
                '',
                $content,
                [],
                '',
                null
            );
        }

        $decoded = $this->normalizeNestedAnswerPayload($decoded);

        return AIResponseData::success(
            'gemini',
            $response->model,
            $this->string($decoded['summary'] ?? ''),
            $this->string($decoded['answer'] ?? ''),
            $this->normalizeReferences($decoded['references'] ?? []),
            $this->string($decoded['limitations'] ?? ''),
            $this->normalizeConfidence($decoded['confidence'] ?? null),
        );
    }

    private function stripMarkdownFence(string $text): string
    {
        $text = preg_replace('/^\xEF\xBB\xBF/', '', $text);
        $text = trim($text);

        if (str_starts_with($text, '```')) {
            $text = preg_replace('/^```(?:json)?/i', '', $text);
            $text = preg_replace('/```$/', '', $text);
        }

        return trim($text);
    }

    private function decodeJsonContent(string $content): ?array
    {
        $decoded = json_decode($content, true);

        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }

        return null;
    }

    private function normalizeNestedAnswerPayload(array $decoded): array
    {
        if (!isset($decoded['answer'])) {
            return $decoded;
        }

        if (!is_string($decoded['answer'])) {
            return $decoded;
        }

        $answer = trim($decoded['answer']);

        if ($answer === '') {
            return $decoded;
        }

        // jika answer berisi JSON string
        $nested = json_decode($answer, true);

        if (json_last_error() === JSON_ERROR_NONE && is_array($nested)) {

            if (isset($nested['summary'])) {
                $decoded['summary'] = $nested['summary'];
            }

            if (isset($nested['answer'])) {
                $decoded['answer'] = $nested['answer'];
            }

            if (isset($nested['references'])) {
                $decoded['references'] = $nested['references'];
            }

            if (isset($nested['limitations'])) {
                $decoded['limitations'] = $nested['limitations'];
            }

            if (isset($nested['confidence'])) {
                $decoded['confidence'] = $nested['confidence'];
            }
        }

        return $decoded;
    }

    private function string(mixed $value): string
    {
        return is_string($value)
            ? trim($value)
            : '';
    }

    private function normalizeReferences(mixed $references): array
    {
        if (!is_array($references)) {
            return [];
        }

        $result = [];

        foreach ($references as $ref) {

            if (!is_array($ref)) {
                continue;
            }

            $result[] = [
                'title' => $this->string($ref['title'] ?? ''),
                'url' => $this->string($ref['url'] ?? ''),
                'type' => $this->string($ref['type'] ?? 'website'),
                'publisher' => $this->string($ref['publisher'] ?? ''),
                'year' => isset($ref['year']) && is_numeric($ref['year'])
                    ? (int)$ref['year']
                    : null,
            ];
        }

        return $result;
    }

    private function normalizeConfidence(mixed $confidence): ?int
    {
        if ($confidence === null || $confidence === '') {
            return null;
        }

        return is_numeric($confidence)
            ? (int)$confidence
            : null;
    }
}
