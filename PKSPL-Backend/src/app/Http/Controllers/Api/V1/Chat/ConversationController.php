<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Chat;

use App\Events\MessagesRead;
use App\Events\UserTyping;
use App\Http\Controllers\Controller;
use App\Http\Resources\Chat\ConversationResource;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ConversationController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $conversations = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('id_user', $user->id_user))
            ->with([
                'participants.user.role',
                'participants.user.proyek',
                'latestMessage.attachments',
                'latestMessage.sender.role',
                'latestMessage.proyek',
                'proyek',
            ])
            ->orderByDesc('updated_at')
            ->get();

        return ConversationResource::collection($conversations);
    }

    public function show(Request $request, Conversation $conversation): ConversationResource
    {
        $this->authorize('view', $conversation);

        $conversation->load([
            'participants.user.role',
            'participants.user.proyek',
            'latestMessage.attachments',
            'latestMessage.sender.role',
            'latestMessage.proyek',
            'proyek',
        ]);

        return new ConversationResource($conversation);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'recipient_id' => ['required', 'integer', 'exists:users,id_user'],
            'id_proyek' => ['nullable', 'integer', 'exists:proyek,id_proyek'],
            'title' => ['nullable', 'string', 'max:255'],
        ]);

        $currentUser = $request->user();
        $recipientId = (int) $validated['recipient_id'];

        if ((int) $currentUser->id_user === $recipientId) {
            return response()->json(['message' => 'Tidak dapat membuat percakapan dengan diri sendiri.'], 422);
        }

        // Check if direct conversation between these 2 users already exists
        $existingConversation = Conversation::query()
            ->where('type', 'direct')
            ->whereHas('participants', fn ($q) => $q->where('id_user', $currentUser->id_user))
            ->whereHas('participants', fn ($q) => $q->where('id_user', $recipientId))
            ->first();

        if ($existingConversation) {
            $existingConversation->load([
                'participants.user.role',
                'participants.user.proyek',
                'latestMessage.attachments',
                'latestMessage.sender.role',
                'latestMessage.proyek',
                'proyek',
            ]);
            return (new ConversationResource($existingConversation))->response()->setStatusCode(200);
        }

        // Create new conversation
        $conversation = Conversation::create([
            'type' => 'direct',
            'id_proyek' => $validated['id_proyek'] ?? null,
            'created_by' => $currentUser->id_user,
            'title' => $validated['title'] ?? null,
        ]);

        // Attach participants
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $currentUser->id_user,
            'joined_at' => now(),
            'last_read_at' => now(),
        ]);

        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $recipientId,
            'joined_at' => now(),
            'last_read_at' => null,
        ]);

        $conversation->load([
            'participants.user.role',
            'participants.user.proyek',
            'latestMessage.attachments',
            'latestMessage.sender.role',
            'latestMessage.proyek',
            'proyek',
        ]);

        return (new ConversationResource($conversation))->response()->setStatusCode(201);
    }

    public function markRead(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('markRead', $conversation);

        $currentUser = $request->user();
        $now = now();

        ConversationParticipant::query()
            ->where('id_conversation', $conversation->id_conversation)
            ->where('id_user', $currentUser->id_user)
            ->update(['last_read_at' => $now]);

        try {
            broadcast(new MessagesRead(
                (int) $conversation->id_conversation,
                (int) $currentUser->id_user,
                $now
            ))->toOthers();
        } catch (\Throwable $e) {
            // Non-blocking broadcast
        }

        return response()->json([
            'message' => 'Percakapan berhasil ditandai telah dibaca.',
            'unread_count' => 0,
        ]);
    }

    public function typing(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $currentUser = $request->user();
        $isTyping = $request->boolean('is_typing', true);

        try {
            broadcast(new UserTyping(
                (int) $conversation->id_conversation,
                (int) $currentUser->id_user,
                $currentUser->nama,
                $isTyping
            ))->toOthers();
        } catch (\Throwable $e) {
            // Silently catch broadcast error if socket/reverb connection is in test environment
        }

        return response()->json([
            'success' => true,
            'is_typing' => $isTyping,
        ]);
    }
}