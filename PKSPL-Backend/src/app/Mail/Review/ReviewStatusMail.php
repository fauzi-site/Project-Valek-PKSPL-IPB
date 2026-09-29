<?php

declare(strict_types=1);

namespace App\Mail\Review;

use App\Models\Proyek;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReviewStatusMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param Proyek $proyek Proyek terkait
     * @param string $statusType 'DALAM_REVIEW' | 'REVISI' | 'SELESAI'
     * @param string $reviewer Nama reviewer/analyst yang sedang menelaah
     * @param string|null $notes Catatan telaah atau alasan revisi
     * @param array $comments Daftar catatan/komentar review terpilih
     * @param User|null $recipient Pengguna peneliti penerima
     */
    public function __construct(
        public Proyek $proyek,
        public string $statusType,
        public string $reviewer,
        public ?string $notes = null,
        public array $comments = [],
        public ?User $recipient = null
    ) {}

    public function envelope(): Envelope
    {
        $code = $this->proyek->kode_proyek ?: "PRJ-{$this->proyek->id_proyek}";

        $subject = match (strtoupper($this->statusType)) {
            'DALAM_REVIEW' => "[PKSPL Review] Proyek {$code} Sedang Ditelaah oleh {$this->reviewer}",
            'REVISI', 'NEED REVISION', 'NEED_REVISION' => "[PKSPL Revisi] Permintaan Perbaikan Proyek {$code} oleh {$this->reviewer}",
            'SELESAI', 'APPROVED' => "[PKSPL Validasi] Proyek {$code} Dinyatakan Selesai & Disetujui oleh {$this->reviewer}",
            default => "[PKSPL Review] Pembaruan Status Proyek {$code}",
        };

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/');
        $code = $this->proyek->kode_proyek ?: "PRJ-{$this->proyek->id_proyek}";
        $actionUrl = "{$frontendUrl}/peneliti/projects/{$code}/review";

        return new Content(
            view: 'emails.review.review_status',
            with: [
                'proyek' => $this->proyek,
                'statusType' => strtoupper($this->statusType),
                'reviewer' => $this->reviewer,
                'notes' => $this->notes,
                'comments' => $this->comments,
                'recipient' => $this->recipient ?? $this->proyek->user,
                'projectCode' => $code,
                'actionUrl' => $actionUrl,
                'frontendUrl' => $frontendUrl,
            ]
        );
    }
}
