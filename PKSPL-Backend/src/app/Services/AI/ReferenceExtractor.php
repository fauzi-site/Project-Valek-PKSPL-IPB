<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Log;

/**
 * Validasi dan normalisasi referensi yang dihasilkan AI.
 */
class ReferenceExtractor
{
    /**
     * Validasi daftar referensi dan kembalikan referensi yang sudah distandar.
     *
     * @param array<int, array<string, mixed>> $references
     * @return array<int, array<string, mixed>>
     */
    public function extract(array $references): array
    {
        Log::info('AI reference extraction started', ['count' => count($references)]);

        $validated = [];

        foreach ($references as $reference) {
            $title = trim((string) ($reference['title'] ?? ''));
            $url = trim((string) ($reference['url'] ?? ''));
            $publisher = trim((string) ($reference['publisher'] ?? ''));
            $year = $this->normalizeYear($reference['year'] ?? null);
            $type = $this->normalizeType((string) ($reference['type'] ?? 'website'));
            $status = $url === '' ? 'unverified' : 'verified';

            $validated[] = [
                'title' => $title,
                'url' => $url,
                'publisher' => $publisher,
                'year' => $year,
                'type' => $type,
                'status' => $status,
            ];
        }

        Log::info('AI reference extraction completed', ['validated' => count($validated)]);

        return $validated;
    }

    /**
     * Normalisasi tipe referensi.
     */
    private function normalizeType(string $type): string
    {
        $type = strtolower(trim($type));

        return match ($type) {
            'journal', 'government', 'publication', 'website' => $type,
            default => 'website',
        };
    }

    /**
     * Normalisasi tahun referensi.
     *
     * @param mixed $value
     */
    private function normalizeYear(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        $year = filter_var($value, FILTER_VALIDATE_INT);

        return $year === false ? null : $year;
    }
}
