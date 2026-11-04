<?php

namespace App\Mail\Auth;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ResearcherApplicationApprovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user)
    {
    }

    public function build(): self
    {
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $loginUrl = rtrim($frontendUrl, '/') . '/login';

        return $this->subject('[PKSPL IPB] Permohonan Akun Peneliti Anda Disetujui')
            ->view('emails.auth.researcher_application_approved', [
                'user' => $this->user,
                'loginUrl' => $loginUrl,
            ]);
    }
}
