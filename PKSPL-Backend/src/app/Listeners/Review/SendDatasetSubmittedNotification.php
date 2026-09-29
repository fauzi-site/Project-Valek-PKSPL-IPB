<?php

declare(strict_types=1);

namespace App\Listeners\Review;

use App\Events\Review\DatasetSubmitted;
use App\Models\Role;
use App\Models\User;
use App\Notifications\Review\DatasetSubmittedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendDatasetSubmittedNotification implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(DatasetSubmitted $event): void
    {
        $superAdmins = User::whereHas('role', fn($q) => $q->whereIn('nama_role', [Role::SUPER_ADMIN, 'Admin', 'Administrator']))->get();

        foreach ($superAdmins as $admin) {
            $admin->notify(new DatasetSubmittedNotification($event->proyek, $event->submitter));
        }
    }
}
