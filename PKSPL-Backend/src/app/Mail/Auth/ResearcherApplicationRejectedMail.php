<?php

namespace App\Mail\Auth;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ResearcherApplicationRejectedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $reason
    ) {
    }

    public function build(): self
    {
        return $this->subject('[PKSPL IPB] Informasi Hasil Permohonan Akun Peneliti')
            ->view('emails.auth.researcher_application_rejected', [
                'user' => $this->user,
                'reason' => $this->reason,
            ]);
    }
}
