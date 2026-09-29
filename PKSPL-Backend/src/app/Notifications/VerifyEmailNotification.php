<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends Notification
{
    use Queueable;

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        return ['mail'];
    }

    /**
     * Build the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        $verificationUrl = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('Verifikasi Email Akun PKSPL IPB')
            ->greeting('Halo ' . $notifiable->nama . ',')
            ->line('Pendaftaran akun PKSPL Anda telah berhasil dibuat.')
            ->line('Silakan klik tombol di bawah ini untuk memverifikasi alamat email Anda dan mengaktifkan akun Anda:')
            ->action('Verifikasi Email Saya', $verificationUrl)
            ->line('Link verifikasi ini berlaku selama 60 menit.')
            ->line('Jika Anda tidak merasa mendaftar di sistem PKSPL, tidak ada tindakan lebih lanjut yang diperlukan.');
    }

    /**
     * Generate signed verification URL pointing to Frontend callback.
     */
    protected function verificationUrl($notifiable): string
    {
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');

        $signedUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );

        // Parse query params (expires & signature) from Laravel signed URL
        $parsed = parse_url($signedUrl);
        $queryString = $parsed['query'] ?? '';

        return $frontendUrl . '/auth/email/verify/' . $notifiable->getKey() . '/' . sha1($notifiable->getEmailForVerification()) . '?' . $queryString;
    }
}
