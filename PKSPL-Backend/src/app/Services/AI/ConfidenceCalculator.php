<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Log;

/**
 * Hitung confidence AI berdasarkan sumber referensi.
 */
class ConfidenceCalculator
{
    /**
     * @param array<int, array<string, mixed>> $references
     */
    public function calculate(array $references, string $source): int
    {
        Log::info('AI confidence calculation started', [
            'source' => $source,
            'reference_count' => count($references),
        ]);

        if ($source === 'database') {
            return 100;
        }

        if (empty($references)) {
            return 20;
        }

        $scores = array_map([$this, 'scoreReference'], $references);
        $confidence = max($scores);

        Log::info('AI confidence calculation completed', ['confidence' => $confidence]);

        return $confidence;
    }

    /**
     * Hitung skor untuk satu referensi.
     *
     * @param array<string, mixed> $reference
     */
    private function scoreReference(array $reference): int
    {
        $type = strtolower((string) ($reference['type'] ?? 'website'));
        $publisher = strtolower((string) ($reference['publisher'] ?? ''));

        return match ($type) {
            'government' => 95,
            'journal' => $this->scoreJournal($publisher),
            'publication' => 80,
            'website' => $this->scoreWebsite($publisher),
            default => 50,
        };
    }

    private function scoreJournal(string $publisher): int
    {
        if ($this->containsAny($publisher, ['scopus', 'science', 'springer', 'nature', 'elsevier'])) {
            return 90;
        }

        return 85;
    }

    private function scoreWebsite(string $publisher): int
    {
        if ($this->containsAny($publisher, ['gov', 'un', 'world bank', 'bank indonesia', 'klhk', 'brin', 'bps', 'fa0'])) {
            return 80;
        }

        if ($this->containsAny($publisher, ['news', 'tribun', 'kompas', 'cnn', 'bbc', 'tempo'])) {
            return 70;
        }

        return 50;
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }
}
