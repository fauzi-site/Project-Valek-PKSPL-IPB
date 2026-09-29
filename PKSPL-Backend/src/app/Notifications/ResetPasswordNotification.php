<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    /**
     * Token reset password.
     */
    public string $token;

    public function __construct(string $token)
    {
        $this->token = $token;
    }

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
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $resetUrl = $frontendUrl . '/reset-password?' . http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);

        $expire = config('auth.passwords.users.expire', 60);

        return (new MailMessage)
            ->subject('Reset Password Akun PKSPL IPB')
            ->greeting('Halo ' . $notifiable->nama . ',')
            ->line('Anda menerima email ini karena kami menerima permintaan pengaturan ulang password untuk akun PKSPL Anda.')
            ->action('Reset Password', $resetUrl)
            ->line('Link reset password ini berlaku selama ' . $expire . ' menit.')
            ->line('Jika Anda tidak meminta pengaturan ulang password, Anda dapat mengabaikan email ini dengan aman. Password Anda tidak akan berubah.');
    }
}
