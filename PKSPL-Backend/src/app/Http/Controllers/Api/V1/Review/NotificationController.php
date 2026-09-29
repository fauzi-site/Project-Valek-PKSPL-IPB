<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Review;

use App\Http\Controllers\Controller;
use App\Http\Requests\Review\MarkNotificationReadRequest;
use App\Http\Resources\Review\NotificationResource;
use App\Repositories\Contracts\NotificationRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NotificationController extends Controller
{
    public function __construct(
        private readonly NotificationRepositoryInterface $notifRepo
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = (int) $request->input('per_page', 15);
        $notifications = $this->notifRepo->forUser($request->user(), $perPage);

        return NotificationResource::collection($notifications);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json(['unread_count' => $this->notifRepo->unreadCount($request->user())]);
    }

    public function markRead(MarkNotificationReadRequest $request, string $notification): JsonResponse
    {
        $this->notifRepo->markAsRead($request->user(), $notification);
        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $count = $this->notifRepo->markAllAsRead($request->user());
        return response()->json(['message' => "{$count} notifications marked as read."]);
    }
}
