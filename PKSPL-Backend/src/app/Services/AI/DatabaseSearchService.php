<?php

namespace App\Services\AI;

use App\Models\AnalisisAi;
use App\Models\BasisDataAi;
use App\Models\DatasetReferensi;
use Illuminate\Support\Facades\Log;

/**
 * Service untuk mencari data yang sudah tersedia di database PKSPL.
 */
class DatabaseSearchService
{
    /**
     * Cari informasi relevan dari tabel AI dan basis data.
     *
     * @param string $prompt
     * @return array<string, mixed>
     */
    public function search(string $prompt): array
    {
        $prompt = trim($prompt);

        Log::info('AI database search started', ['prompt' => $prompt]);

        if ($prompt === '') {
            return [
                'found' => false,
                'source' => 'database',
                'data' => [],
            ];
        }

        $searchTerm = '%' . str_replace(' ', '%', $prompt) . '%';

        $analisis = AnalisisAi::query()
            ->where('pertanyaan', 'like', $searchTerm)
            ->orWhere('jawaban', 'like', $searchTerm)
            ->limit(5)
            ->get()
            ->toArray();

        $dataset = DatasetReferensi::query()
            ->where('nama_dataset', 'like', $searchTerm)
            ->orWhere('sumber', 'like', $searchTerm)
            ->limit(5)
            ->get()
            ->toArray();

        $basisData = BasisDataAi::query()
            ->where('nama_basis', 'like', $searchTerm)
            ->orWhere('deskripsi', 'like', $searchTerm)
            ->limit(5)
            ->get()
            ->toArray();

        $data = [];

        if (! empty($analisis)) {
            $data['analisis_ai'] = $analisis;
        }

        if (! empty($dataset)) {
            $data['dataset_referensi'] = $dataset;
        }

        if (! empty($basisData)) {
            $data['basis_data_ai'] = $basisData;
        }

        $found = ! empty($data);

        Log::info('AI database search completed', [
            'prompt' => $prompt,
            'found' => $found,
            'matches' => array_map('count', $data),
        ]);

        return [
            'found' => $found,
            'source' => 'database',
            'data' => $data,
        ];
    }
}
