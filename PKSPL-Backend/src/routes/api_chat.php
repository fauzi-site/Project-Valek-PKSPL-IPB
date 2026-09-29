<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Chat\ChatDirectoryController;
use App\Http\Controllers\Api\V1\Chat\ChatMessageController;
use App\Http\Controllers\Api\V1\Chat\ConversationController;
use App\Http\Controllers\Api\V1\Chat\NotificationPreferenceController;
use Illuminate\Support\Facades\Route;

// ============================================================
// BAB 9. SISTEM CHAT DAN DISKUSI INTERAKTIF
// Seluruh endpoint menggunakan prefiks API v1 dan autentikasi Sanctum.
// ============================================================
Route::prefix('v1')->middleware('auth:sanctum')->group(function (): void {
    // 9.1 Direktori Kontak Chat & Heartbeat
    Route::get('chat/directory', [ChatDirectoryController::class, 'index'])->name('chat.directory');
    Route::post('chat/heartbeat', [ChatDirectoryController::class, 'heartbeat'])->name('chat.heartbeat');

    // 9.2 Percakapan (Conversations)
    Route::get('conversations', [ConversationController::class, 'index'])->name('conversations.index');
    Route::post('conversations', [ConversationController::class, 'store'])->name('conversations.store');
    Route::get('conversations/{conversation}', [ConversationController::class, 'show'])->name('conversations.show');
    Route::post('conversations/{conversation}/read', [ConversationController::class, 'markRead'])->name('conversations.mark-read');
    Route::post('conversations/{conversation}/typing', [ConversationController::class, 'typing'])->name('conversations.typing');

    // 9.3 Pesan Obrolan (Messages)
    Route::get('conversations/{conversation}/messages', [ChatMessageController::class, 'index'])->name('conversations.messages.index');
    Route::post('conversations/{conversation}/messages', [ChatMessageController::class, 'store'])->name('conversations.messages.store');
    Route::put('conversations/{conversation}/messages/{message}', [ChatMessageController::class, 'update'])->name('conversations.messages.update');
    Route::delete('conversations/{conversation}/messages/{message}', [ChatMessageController::class, 'destroy'])->name('conversations.messages.destroy');
    Route::get('conversations/{conversation}/messages/{message}/attachments/{attachment}/download', [ChatMessageController::class, 'downloadAttachment'])->name('conversations.messages.attachments.download');

    // 9.4 Preferensi Notifikasi Pengguna
    Route::get('notification-preferences', [NotificationPreferenceController::class, 'show'])->name('notification-preferences.show');
    Route::put('notification-preferences', [NotificationPreferenceController::class, 'update'])->name('notification-preferences.update');
});