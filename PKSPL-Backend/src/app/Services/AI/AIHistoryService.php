<?php

namespace App\Services\AI;

use App\Models\AIHistory;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Menyimpan histori AI untuk permintaan database dan eksternal.
 */
class AIHistoryService
{
    /**
     * Simpan riwayat pencarian yang ditemukan di database.
     *
     * @param string $prompt
     * @param array<string, mixed> $response
     * @return void
     */
    public function storeDatabase(string $prompt, array $response): void
    {
        $user = Auth::user();
        $userId = $user?->id_user;

        Log::info('AI history store database started', ['prompt' => $prompt, 'user_id' => $userId]);

        AIHistory::create([
            'prompt' => $prompt,
            'provider' => 'database',
            'source' => 'database',
            'confidence' => 100,
            'response' => json_encode($response, JSON_UNESCAPED_UNICODE),
            'references' => json_encode([], JSON_UNESCAPED_UNICODE),
        ]);

        Log::info('AI history store database completed', ['prompt' => $prompt]);
    }

    /**
     * Simpan riwayat yang dihasilkan dari Gemini.
     *
     * @param string $prompt
     * @param array<string, mixed> $generated
     * @param array<string, mixed> $response
     * @param array<int, array<string, mixed>> $references
     * @param int $confidence
     * @return void
     */
    public function storeExternal(
        string $prompt,
        array $generated,
        array $response,
        array $references,
        int $confidence
    ): void {
        $user = Auth::user();
        $userId = $user?->id_user;

        Log::info('AI history store external started', ['prompt' => $prompt, 'user_id' => $userId]);

        AIHistory::create([
            'prompt' => $prompt,
            'provider' => $generated['provider'] ?? 'gemini',
            'source' => 'gemini',
            'confidence' => $confidence,
            'response' => json_encode($response, JSON_UNESCAPED_UNICODE),
            'references' => json_encode($references, JSON_UNESCAPED_UNICODE),
        ]);

        Log::info('AI history store external completed', ['prompt' => $prompt, 'confidence' => $confidence]);
    }
}
