<?php
declare(strict_types=1);

// Controller modul review untuk diskusi, notifikasi, dan jejak aktivitas.
use App\Http\Controllers\Api\V1\Review\ActivityLogController;
use App\Http\Controllers\Api\V1\Review\CommentAttachmentController;
use App\Http\Controllers\Api\V1\Review\CommentReplyController;
use App\Http\Controllers\Api\V1\Review\DatasetSubmissionController;
use App\Http\Controllers\Api\V1\Review\NotificationController;
use App\Http\Controllers\Api\V1\Review\ReviewCommentController;
use App\Http\Controllers\Api\V1\Review\ReviewController;
use App\Http\Controllers\Api\V1\Review\ReviewStatusNotificationController;
use Illuminate\Support\Facades\Route;

// ============================================================
// BAB 7. REVIEW DAN DISKUSI
// Seluruh endpoint menggunakan prefiks API v1 dan autentikasi Sanctum.
// ============================================================
Route::prefix('v1')->middleware('auth:sanctum')->group(function (): void {

    // ------------------------------------------------------------
    // 7.1 PENGAJUAN DATASET
    // Mengirim dataset proyek untuk proses review.
    // ------------------------------------------------------------
    // 7.1.1 Parameter {proyek} menentukan proyek yang mengajukan dataset.
    Route::post('proyek/{proyek}/submit', [DatasetSubmissionController::class, 'submit'])
        ->name('proyek.submit');

    // ============================================================
    // 7.2 REVIEW
    // Mengelola review proyek serta perubahan status review.
    // ============================================================

    // 7.2.1 Menampilkan seluruh review yang dapat diakses pengguna.
    Route::get('reviews', [ReviewController::class, 'index'])->name('reviews.index');

    // 7.2.2 Membuat review untuk proyek pada parameter {proyek}.
    Route::post('proyek/{proyek}/reviews', [ReviewController::class, 'store'])->name('reviews.store');

    // 7.2.3 Menampilkan detail review berdasarkan parameter {review}.
    Route::get('reviews/{review}', [ReviewController::class, 'show'])->name('reviews.show');

    // 7.2.4 Memperbarui informasi review berdasarkan parameter {review}.
    Route::patch('reviews/{review}', [ReviewController::class, 'update'])->name('reviews.update');

    // 7.2.5 Menandai review pada parameter {review} sebagai selesai.
    Route::post('reviews/{review}/resolve', [ReviewController::class, 'resolve'])->name('reviews.resolve');

    // 7.2.6 Membuka kembali review yang telah diselesaikan.
    Route::post('reviews/{review}/reopen', [ReviewController::class, 'reopen'])->name('reviews.reopen');

    // 7.2.7 Menutup review berdasarkan parameter {review}.
    Route::post('reviews/{review}/close', [ReviewController::class, 'close'])->name('reviews.close');

    // ============================================================
    // 7.3 KOMENTAR REVIEW
    // Menyediakan CRUD komentar yang melekat pada review tertentu.
    // ============================================================

    // 7.3.1 Menampilkan komentar untuk review pada parameter {review}.
    Route::get('reviews/{review}/comments', [ReviewCommentController::class, 'index'])->name('reviews.comments.index');

    // 7.3.2 Menambahkan komentar ke review pada parameter {review}.
    Route::post('reviews/{review}/comments', [ReviewCommentController::class, 'store'])->name('reviews.comments.store');

    // 7.3.3 Menampilkan komentar pada parameter {comment} dalam review terkait.
    Route::get('reviews/{review}/comments/{comment}', [ReviewCommentController::class, 'show'])->name('reviews.comments.show');

    // 7.3.4 Memperbarui komentar pada parameter {comment} dalam review terkait.
    Route::patch('reviews/{review}/comments/{comment}', [ReviewCommentController::class, 'update'])->name('reviews.comments.update');

    // 7.3.5 Menghapus komentar pada parameter {comment} dalam review terkait.
    Route::delete('reviews/{review}/comments/{comment}', [ReviewCommentController::class, 'destroy'])->name('reviews.comments.destroy');

    // ------------------------------------------------------------
    // 7.4 BALASAN KOMENTAR
    // Menambahkan balasan pada komentar review yang dipilih.
    // ------------------------------------------------------------
    // 7.4.1 Parameter {review} dan {comment} menjaga konteks diskusi bertingkat.
    Route::post('reviews/{review}/comments/{comment}/replies', [CommentReplyController::class, 'store'])->name('reviews.comments.replies.store');

    // ------------------------------------------------------------
    // 7.5 LAMPIRAN KOMENTAR
    // Mengelola berkas pendukung untuk komentar review.
    // ------------------------------------------------------------
    // 7.5.1 Menambahkan lampiran pada komentar dalam konteks review terkait.
    Route::post('reviews/{review}/comments/{comment}/attachments', [CommentAttachmentController::class, 'store'])->name('reviews.comments.attachments.store');

    // 7.5.2 Menghapus lampiran pada parameter {attachment} dari komentar terkait.
    Route::delete('reviews/{review}/comments/{comment}/attachments/{attachment}', [CommentAttachmentController::class, 'destroy'])->name('reviews.comments.attachments.destroy');

    // ============================================================
    // 7.6 NOTIFIKASI
    // Menyediakan daftar dan pengelolaan status baca notifikasi pengguna.
    // ============================================================

    // 7.6.1 Menampilkan notifikasi milik pengguna terautentikasi.
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');

    // 7.6.2 Mengembalikan jumlah notifikasi yang belum dibaca.
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');

    // 7.6.3 Menandai notifikasi pada parameter {notification} sebagai telah dibaca.
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('notifications.mark-read');

    // 7.6.4 Menandai seluruh notifikasi pengguna sebagai telah dibaca.
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');

    // ------------------------------------------------------------
    // 7.7 JEJAK AKTIVITAS
    // Menampilkan riwayat aktivitas yang terkait dengan proses review.
    // ------------------------------------------------------------
    // 7.7.1 Menampilkan riwayat aktivitas review.
    Route::get('activity-logs', [ActivityLogController::class, 'index'])->name('activity-logs.index');
});

// ============================================================
// 7.8 NOTIFIKASI REVIEW & EMAIL STATUS (Mendukung sesi aktif & fallback direct)
// ============================================================
Route::prefix('v1')->group(function (): void {
    // 7.8.1 Mengirim email notifikasi review offline secara langsung
    Route::post('review/send-offline-email', [ReviewStatusNotificationController::class, 'sendOfflineEmail'])
        ->name('review.send-offline-email');
});

