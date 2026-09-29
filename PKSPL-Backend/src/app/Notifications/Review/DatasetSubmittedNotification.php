<?php

declare(strict_types=1);

namespace App\Notifications\Review;

use App\Models\Proyek;
use App\Models\User;
use App\Mail\Review\DatasetSubmittedMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class DatasetSubmittedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Proyek $proyek,
        public readonly User $submitter
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'dataset_submitted',
            'proyek_id' => $this->proyek->id_proyek,
            'proyek_name' => $this->proyek->nama_proyek,
            'submitter' => $this->submitter->nama ?? '',
            'message' => "Dataset '{$this->proyek->nama_proyek}' has been submitted for review."
        ];
    }

    public function toMail(object $notifiable)
    {
        return (new DatasetSubmittedMail($this->proyek, $this->submitter))
            ->to($notifiable->email);
    }
}
