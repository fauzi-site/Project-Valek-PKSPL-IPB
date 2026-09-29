<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Review;

use App\Http\Controllers\Controller;
use App\Mail\Review\ReviewStatusMail;
use App\Models\Proyek;
use App\Models\Review;
use App\Models\User;
use App\Services\Review\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ReviewStatusNotificationController extends Controller
{
    public function __construct(
        private readonly ActivityLogService $activityLogService
    ) {}

    /**
     * Memperbarui status review proyek dan mengirimkan notifikasi email ke Peneliti jika offline.
     * POST /api/v1/proyek/{proyek}/review-status
     */
    public function updateStatus(Request $request, Proyek $proyek): JsonResponse
    {
        $raw = $request->getContent();
        $payload = $request->json()->all() ?: $request->all();
        if (empty($payload) && !empty($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $payload = $decoded;
            }
        }

        $statusInput = strtoupper(trim((string) ($payload['status'] ?? $request->input('status') ?? 'DALAM_REVIEW')));
        $currentUser = $request->user() ?? $request->user('sanctum') ?? auth('sanctum')->user();
        $reviewer = $payload['reviewer'] ?? $request->input('reviewer') ?? $currentUser?->nama ?? 'Dr. Benny Nababan';
        $notes = $payload['reason'] ?? $payload['notes'] ?? $request->input('reason') ?? $request->input('notes') ?? null;
        $comments = $payload['comments'] ?? $request->input('comments') ?? [];

        // 1. Catatan: status proyek pada tabel proyek telah ditiadakan sesuai arsitektur baru.

        // 2. Buat atau perbarui record Review di database
        try {
            $review = Review::where('id_proyek', $proyek->id_proyek)->latest()->first();
            if (! $review) {
                $review = new Review();
                $review->id_proyek = $proyek->id_proyek;
            }

            if ($currentUser) {
                $review->id_reviewer = $currentUser->id_user;
            }

            if (in_array($statusInput, ['REVISI', 'NEED REVISION', 'NEED_REVISION'])) {
                $review->status = 'Open';
                $review->decision = 'Need Revision';
                $review->notes = $notes;
            } elseif (in_array($statusInput, ['SELESAI', 'APPROVED'])) {
                $review->status = 'Resolved';
                $review->decision = 'Approved';
                $review->reviewed_at = now();
            } else {
                $review->status = 'Open';
            }
            $review->save();

            // Log aktivitas review
            $actorId = $currentUser?->id_user ?? $review->id_reviewer ?? 3; // fallback 3 = Dr. Benny Nababan
            $this->activityLogService->log(
                userId: $actorId,
                proyekId: $proyek->id_proyek,
                reviewId: $review->id_review,
                commentId: null,
                action: 'review_status_' . strtolower($statusInput),
                description: "Status telaah proyek diubah ke {$statusInput} oleh {$reviewer}."
            );
        } catch (\Throwable $e) {
            Log::warning('Review database sync notice: ' . $e->getMessage());
        }

        // 3. Tentukan apakah Peneliti sedang OFFLINE
        $proyek->loadMissing('user');
        $researcher = $proyek->user;

        // Cek presence database Peneliti: jika tidak aktif dalam 3 menit terakhir atau null, Peneliti adalah offline
        $dbResearcherOffline = true;
        if ($researcher && $researcher->last_seen_at) {
            $diffMinutes = $researcher->last_seen_at->diffInMinutes(now());
            $dbResearcherOffline = $diffMinutes > 3;
        }

        $explicitOffline = isset($payload['is_offline']) ? (bool) $payload['is_offline'] : null;
        $isOffline = ($explicitOffline === true) || $dbResearcherOffline;

        // Permintaan revisi selalu wajib kirim email, begitu pula perubahan status jika peneliti offline
        $isRevision = in_array($statusInput, ['REVISI', 'NEED REVISION', 'NEED_REVISION']);
        $forceEmail = (bool) ($payload['force_email'] ?? $request->input('force_email') ?? false);
        $shouldSendEmail = $isOffline || $isRevision || $forceEmail;

        // 4. Kirim Email Notifikasi via SMTP Mailpit ke Peneliti & salinan ke Analyst
        $emailSent = false;
        $primaryEmail = $payload['recipient_email'] ?? $request->input('recipient_email') ?? $researcher?->email ?? 'peneliti@gmail.com';
        $analystEmail = $currentUser?->email ?? 'analyst@gmail.com';

        // Daftar penerima email (Peneliti dan Analyst pengirim agar keduanya tercatat di Mailpit)
        $recipients = array_unique(array_filter([$primaryEmail, $analystEmail]));

        if ($shouldSendEmail && ! empty($recipients)) {
            foreach ($recipients as $recipientEmail) {
                try {
                    $recipientUser = ($recipientEmail === $primaryEmail) ? $researcher : $currentUser;
                    $mailable = new ReviewStatusMail(
                        proyek: $proyek,
                        statusType: $statusInput,
                        reviewer: $reviewer,
                        notes: $notes,
                        comments: $comments,
                        recipient: $recipientUser
                    );

                    Mail::to($recipientEmail)->send($mailable);
                    $emailSent = true;
                } catch (\Throwable $e) {
                    Log::error('Gagal mengirim email review status ke Mailpit: ' . $e->getMessage(), [
                        'proyek' => $proyek->id_proyek,
                        'status' => $statusInput,
                        'recipient' => $recipientEmail,
                    ]);
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Status proyek berhasil diperbarui ke {$statusInput}.",
            'data' => [
                'id_proyek' => $proyek->id_proyek,
                'kode_proyek' => $proyek->kode_proyek,
                'reviewer' => $reviewer,
                'is_offline' => $isOffline,
                'email_dispatched' => $emailSent,
                'recipient_email' => $recipientEmail,
                'notes' => $notes,
            ],
        ]);
    }

    /**
     * Endpoint langsung untuk mengirim email offline (dipanggil oleh offlineEmailService jika ada alert).
     * POST /api/v1/review/send-offline-email
     */
    public function sendOfflineEmail(Request $request): JsonResponse
    {
        $raw = $request->getContent();
        $payload = $request->json()->all() ?: $request->all();
        if (empty($payload) && !empty($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $payload = $decoded;
            }
        }

        $projectIdentifier = $payload['project_id'] ?? $payload['project_code'] ?? $request->input('project_id') ?? $request->input('project_code') ?? null;
        $proyek = null;
        if ($projectIdentifier) {
            $proyek = Proyek::where('id_proyek', is_numeric($projectIdentifier) ? (int) $projectIdentifier : 0)
                ->orWhere('kode_proyek', (string) $projectIdentifier)
                ->first();
        }

        if (! $proyek) {
            $proyek = new Proyek([
                'id_proyek' => 1,
                'kode_proyek' => $payload['project_code'] ?? $request->input('project_code') ?? 'PRJ-001',
                'nama_proyek' => $payload['project_name'] ?? $request->input('project_name') ?? 'Revitalisasi Mangrove Teluk Benoa',
            ]);
        }

        $recipientEmail = $payload['recipient_email'] ?? $request->input('recipient_email') ?? $proyek->user?->email ?? 'peneliti@gmail.com';
        $analystEmail = 'analyst@gmail.com';
        $reviewer = $payload['reviewer'] ?? $request->input('reviewer') ?? 'Dr. Benny Nababan';
        $statusType = strtoupper(trim((string) ($payload['type'] ?? $request->input('type') ?? 'DALAM_REVIEW')));
        $notes = $payload['notes'] ?? $request->input('notes') ?? null;
        $comments = $payload['comments'] ?? $request->input('comments') ?? [];

        $recipients = array_unique(array_filter([$recipientEmail, $analystEmail]));

        try {
            foreach ($recipients as $targetEmail) {
                $mailable = new ReviewStatusMail(
                    proyek: $proyek,
                    statusType: $statusType,
                    reviewer: $reviewer,
                    notes: $notes,
                    comments: $comments,
                    recipient: $proyek->user
                );

                Mail::to($targetEmail)->send($mailable);
            }

            return response()->json([
                'success' => true,
                'message' => "Email offline {$statusType} berhasil dikirim ke " . implode(', ', $recipients),
                'email_dispatched' => true,
                'recipients' => $recipients,
            ]);
        } catch (\Throwable $e) {
            Log::error('sendOfflineEmail error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengirim email: ' . $e->getMessage(),
            ], 500);
        }
    }
}
