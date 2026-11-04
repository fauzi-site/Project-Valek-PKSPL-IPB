<?php

namespace App\Mail\Auth;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NewResearcherApplicationAdminMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $applicant)
    {
    }

    public function build(): self
    {
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $adminDashboardUrl = rtrim($frontendUrl, '/') . '/admin/researcher-applications';

        return $this->subject('[PKSPL IPB] Permohonan Akun Baru - Calon Peneliti')
            ->view('emails.auth.new_researcher_application_admin', [
                'applicant' => $this->applicant,
                'adminDashboardUrl' => $adminDashboardUrl,
            ]);
    }
}
