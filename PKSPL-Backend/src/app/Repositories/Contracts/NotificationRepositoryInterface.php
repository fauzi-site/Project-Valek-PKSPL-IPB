<?php declare(strict_types=1);

namespace App\Repositories\Contracts;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface NotificationRepositoryInterface
{
    public function forUser(User $user, int $perPage = 15): LengthAwarePaginator;
    public function unreadCount(User $user): int;
    public function markAsRead(User $user, string $notificationId): bool;
    public function markAllAsRead(User $user): int;
}
