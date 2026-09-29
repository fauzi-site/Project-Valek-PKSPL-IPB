<?php

declare(strict_types=1);

namespace Tests\Feature\Chat;

use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\ChatMessage;
use App\Models\Proyek;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use DatabaseTransactions;

    protected User $analyst;
    protected User $peneliti;
    protected User $thirdParty;

    protected function setUp(): void
    {
        parent::setUp();

        $roleAnalyst = Role::firstOrCreate(['nama_role' => 'Analyst'], ['deskripsi' => 'Analyst']);
        $rolePeneliti = Role::firstOrCreate(['nama_role' => 'Peneliti'], ['deskripsi' => 'Peneliti']);
        $roleGuest = Role::firstOrCreate(['nama_role' => 'Guest'], ['deskripsi' => 'Guest']);

        $this->analyst = User::factory()->create(['id_role' => $roleAnalyst->id_role]);
        $this->peneliti = User::factory()->create(['id_role' => $rolePeneliti->id_role]);
        $this->thirdParty = User::factory()->create(['id_role' => $roleGuest->id_role]);
    }

    public function test_analyst_can_access_chat_directory(): void
    {
        $response = $this->actingAs($this->analyst)->getJson('/api/v1/chat/directory');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name', 'email', 'role', 'isOnline', 'lastSeen']
            ]
        ]);
    }

    public function test_analyst_can_create_conversation_with_peneliti(): void
    {
        $response = $this->actingAs($this->analyst)->postJson('/api/v1/conversations', [
            'recipient_id' => $this->peneliti->id_user,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.type', 'direct');
        $this->assertDatabaseHas('conversations', [
            'created_by' => $this->analyst->id_user,
        ]);
    }

    public function test_analyst_can_send_message_in_conversation(): void
    {
        Notification::fake();

        // 1. Create conversation
        $convResponse = $this->actingAs($this->analyst)->postJson('/api/v1/conversations', [
            'recipient_id' => $this->peneliti->id_user,
        ]);
        $convId = $convResponse->json('data.id');

        // 2. Send message
        $response = $this->actingAs($this->analyst)->postJson("/api/v1/conversations/{$convId}/messages", [
            'message' => 'Halo Peneliti, mohon klarifikasi data mangrove.',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.text', 'Halo Peneliti, mohon klarifikasi data mangrove.');
        $msgId = (int) $response->json('data.id');
        $this->assertDatabaseHas('messages', [
            'id_conversation' => $convId,
            'id_sender' => $this->analyst->id_user,
        ]);
        $rawDb = \Illuminate\Support\Facades\DB::table('messages')->where('id_message', $msgId)->value('message');
        $this->assertNotEquals('Halo Peneliti, mohon klarifikasi data mangrove.', $rawDb);
        $this->assertEquals('Halo Peneliti, mohon klarifikasi data mangrove.', ChatMessage::find($msgId)->message);

        Notification::assertSentTo($this->peneliti, \App\Notifications\Chat\NewChatMessageNotification::class);
    }

    public function test_analyst_can_send_message_with_attachment(): void
    {
        Storage::fake('public');

        $convResponse = $this->actingAs($this->analyst)->postJson('/api/v1/conversations', [
            'recipient_id' => $this->peneliti->id_user,
        ]);
        $convId = $convResponse->json('data.id');

        $fakePdf = UploadedFile::fake()->create('Catatan_Telaah.pdf', 1500, 'application/pdf');

        $response = $this->actingAs($this->analyst)->postJson("/api/v1/conversations/{$convId}/messages", [
            'message' => 'Berikut berkas telaah:',
            'file' => $fakePdf,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.attachments.0.fileName', 'Catatan_Telaah.pdf');
        $response->assertJsonPath('data.attachments.0.fileType', 'pdf');
        $this->assertDatabaseHas('message_attachments', [
            'file_name' => 'Catatan_Telaah.pdf',
            'file_type' => 'pdf',
        ]);
    }

    public function test_peneliti_can_read_messages(): void
    {
        $convResponse = $this->actingAs($this->analyst)->postJson('/api/v1/conversations', [
            'recipient_id' => $this->peneliti->id_user,
        ]);
        $convId = $convResponse->json('data.id');

        $this->actingAs($this->analyst)->postJson("/api/v1/conversations/{$convId}/messages", [
            'message' => 'Pesan dari analyst',
        ]);

        $response = $this->actingAs($this->peneliti)->getJson("/api/v1/conversations/{$convId}/messages");

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_unauthorized_user_cannot_access_conversation_anti_idor(): void
    {
        $convResponse = $this->actingAs($this->analyst)->postJson('/api/v1/conversations', [
            'recipient_id' => $this->peneliti->id_user,
        ]);
        $convId = $convResponse->json('data.id');

        // Third party attempts to read conversation
        $response = $this->actingAs($this->thirdParty)->getJson("/api/v1/conversations/{$convId}");
        $response->assertStatus(403);

        // Third party attempts to read messages
        $msgResponse = $this->actingAs($this->thirdParty)->getJson("/api/v1/conversations/{$convId}/messages");
        $msgResponse->assertStatus(403);

        // Third party attempts to send message
        $sendResponse = $this->actingAs($this->thirdParty)->postJson("/api/v1/conversations/{$convId}/messages", [
            'message' => 'Pesan ilegal',
        ]);
        $sendResponse->assertStatus(403);
    }

    public function test_user_can_mark_conversation_as_read(): void
    {
        $convResponse = $this->actingAs($this->analyst)->postJson('/api/v1/conversations', [
            'recipient_id' => $this->peneliti->id_user,
        ]);
        $convId = $convResponse->json('data.id');

        $this->actingAs($this->analyst)->postJson("/api/v1/conversations/{$convId}/messages", [
            'message' => 'Pesan belum dibaca',
        ]);

        $readResponse = $this->actingAs($this->peneliti)->postJson("/api/v1/conversations/{$convId}/read");
        $readResponse->assertStatus(200);

        $participant = ConversationParticipant::where('id_conversation', $convId)
            ->where('id_user', $this->peneliti->id_user)
            ->first();

        $this->assertNotNull($participant->last_read_at);
    }

    public function test_user_can_manage_notification_preferences(): void
    {
        $getResponse = $this->actingAs($this->analyst)->getJson('/api/v1/notification-preferences');
        $getResponse->assertStatus(200);

        $updateResponse = $this->actingAs($this->analyst)->putJson('/api/v1/notification-preferences', [
            'email_chat' => false,
            'email_revision' => true,
        ]);

        $updateResponse->assertStatus(200);
        $updateResponse->assertJsonPath('preferences.email_chat', false);
    }

    public function test_user_can_send_typing_indicator(): void
    {
        $convResponse = $this->actingAs($this->analyst)->postJson('/api/v1/conversations', [
            'recipient_id' => $this->peneliti->id_user,
        ]);
        $convId = $convResponse->json('data.id');

        $typingResponse = $this->actingAs($this->analyst)->postJson("/api/v1/conversations/{$convId}/typing", [
            'is_typing' => true,
        ]);
        $typingResponse->assertStatus(200);
        $typingResponse->assertJsonPath('success', true);
        $typingResponse->assertJsonPath('is_typing', true);

        // Anti-IDOR: unauthorized user cannot trigger typing in this conversation
        $unauthorized = $this->thirdParty;
        $unauthResponse = $this->actingAs($unauthorized)->postJson("/api/v1/conversations/{$convId}/typing", [
            'is_typing' => true,
        ]);
        $unauthResponse->assertStatus(403);
    }

    public function test_user_can_send_heartbeat(): void
    {
        $adminRole = Role::firstOrCreate(['nama_role' => Role::SUPER_ADMIN]);
        $user = User::factory()->create(['id_role' => $adminRole->id_role]);

        $response = $this->actingAs($user)->postJson('/api/v1/chat/heartbeat');

        $response->assertStatus(200);
        $response->assertJsonPath('is_online', true);
        $this->assertNotNull($response->json('last_seen_at'));

        $user->refresh();
        $this->assertNotNull($user->last_seen_at);
        $this->assertNotNull($user->last_online_at);
    }

    public function test_mark_read_broadcasts_messages_read_and_updates_status(): void
    {
        \Illuminate\Support\Facades\Event::fake([\App\Events\MessagesRead::class]);

        $penelitiRole = Role::firstOrCreate(['nama_role' => Role::PENELITI]);
        $adminRole = Role::firstOrCreate(['nama_role' => Role::SUPER_ADMIN]);

        $peneliti = User::factory()->create(['id_role' => $penelitiRole->id_role]);
        $admin = User::factory()->create(['id_role' => $adminRole->id_role]);

        $conversation = Conversation::create([
            'type' => 'direct',
            'created_by' => $admin->id_user,
        ]);

        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $admin->id_user,
            'joined_at' => now(),
            'last_read_at' => now(),
        ]);

        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $peneliti->id_user,
            'joined_at' => now(),
            'last_read_at' => null,
        ]);

        // Admin sends message
        $msg = ChatMessage::create([
            'id_conversation' => $conversation->id_conversation,
            'id_sender' => $admin->id_user,
            'message' => 'Halo Peneliti',
            'message_type' => 'text',
        ]);

        // Peneliti marks conversation as read
        $readResponse = $this->actingAs($peneliti)->postJson("/api/v1/conversations/{$conversation->id_conversation}/read");
        $readResponse->assertStatus(200);

        \Illuminate\Support\Facades\Event::assertDispatched(\App\Events\MessagesRead::class, function ($event) use ($conversation, $peneliti) {
            return (int) $event->conversationId === (int) $conversation->id_conversation
                && (int) $event->readerId === (int) $peneliti->id_user;
        });

        // Fetch messages as Analyst and verify status is 'read'
        $fetchResponse = $this->actingAs($analyst)->getJson("/api/v1/conversations/{$conversation->id_conversation}/messages");
        $fetchResponse->assertStatus(200);
        $fetchResponse->assertJsonPath('data.0.status', 'read');
        $fetchResponse->assertJsonPath('data.0.isRead', true);
    }

    public function test_user_can_edit_own_message(): void
    {
        \Illuminate\Support\Facades\Event::fake([\App\Events\ChatMessageUpdated::class]);

        $conversation = Conversation::create([
            'type' => 'direct',
            'created_by' => $this->analyst->id_user,
        ]);
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $this->analyst->id_user,
        ]);
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $this->peneliti->id_user,
        ]);

        $message = ChatMessage::create([
            'id_conversation' => $conversation->id_conversation,
            'id_sender' => $this->analyst->id_user,
            'message' => 'Teks awal sebelum diedit',
            'message_type' => 'text',
        ]);

        $response = $this->actingAs($this->analyst)->putJson(
            "/api/v1/conversations/{$conversation->id_conversation}/messages/{$message->id_message}",
            ['message' => 'Teks sudah direvisi']
        );

        $response->assertStatus(200);
        $response->assertJsonPath('data.message', 'Teks sudah direvisi');
        $response->assertJsonPath('data.isEdited', true);

        $this->assertDatabaseHas('messages', [
            'id_message' => $message->id_message,
        ]);
        $rawDb = \Illuminate\Support\Facades\DB::table('messages')->where('id_message', $message->id_message)->value('message');
        $this->assertNotEquals('Teks sudah direvisi', $rawDb);
        $this->assertEquals('Teks sudah direvisi', ChatMessage::find($message->id_message)->message);

        \Illuminate\Support\Facades\Event::assertDispatched(\App\Events\ChatMessageUpdated::class);
    }

    public function test_user_cannot_edit_other_user_message_forbidden(): void
    {
        $conversation = Conversation::create([
            'type' => 'direct',
            'created_by' => $this->analyst->id_user,
        ]);
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $this->analyst->id_user,
        ]);
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $this->peneliti->id_user,
        ]);

        $message = ChatMessage::create([
            'id_conversation' => $conversation->id_conversation,
            'id_sender' => $this->analyst->id_user,
            'message' => 'Pesan asli analis',
            'message_type' => 'text',
        ]);

        // Peneliti attempts to edit analyst's message
        $response = $this->actingAs($this->peneliti)->putJson(
            "/api/v1/conversations/{$conversation->id_conversation}/messages/{$message->id_message}",
            ['message' => 'Pembajakan pesan']
        );

        $response->assertStatus(403);
    }

    public function test_user_can_delete_own_message_soft_deletes(): void
    {
        \Illuminate\Support\Facades\Event::fake([\App\Events\ChatMessageDeleted::class]);

        $conversation = Conversation::create([
            'type' => 'direct',
            'created_by' => $this->analyst->id_user,
        ]);
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $this->analyst->id_user,
        ]);
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $this->peneliti->id_user,
        ]);

        $message = ChatMessage::create([
            'id_conversation' => $conversation->id_conversation,
            'id_sender' => $this->analyst->id_user,
            'message' => 'Pesan yang akan dihapus',
            'message_type' => 'text',
        ]);

        $response = $this->actingAs($this->analyst)->deleteJson(
            "/api/v1/conversations/{$conversation->id_conversation}/messages/{$message->id_message}"
        );

        $response->assertStatus(200);

        // Soft deleted in DB (deleted_at not null)
        $this->assertSoftDeleted('messages', ['id_message' => $message->id_message]);

        \Illuminate\Support\Facades\Event::assertDispatched(\App\Events\ChatMessageDeleted::class);

        // When retrieved via index, shows tombstone
        $listResponse = $this->actingAs($this->peneliti)->getJson(
            "/api/v1/conversations/{$conversation->id_conversation}/messages"
        );
        $listResponse->assertStatus(200);
        $listResponse->assertJsonPath('data.0.text', 'Pesan telah dihapus');
        $listResponse->assertJsonPath('data.0.isDeleted', true);
    }

    public function test_user_cannot_delete_other_user_message_forbidden(): void
    {
        $conversation = Conversation::create([
            'type' => 'direct',
            'created_by' => $this->analyst->id_user,
        ]);
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $this->analyst->id_user,
        ]);
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $this->peneliti->id_user,
        ]);

        $message = ChatMessage::create([
            'id_conversation' => $conversation->id_conversation,
            'id_sender' => $this->analyst->id_user,
            'message' => 'Pesan penting',
            'message_type' => 'text',
        ]);

        // Peneliti attempts to delete analyst's message
        $response = $this->actingAs($this->peneliti)->deleteJson(
            "/api/v1/conversations/{$conversation->id_conversation}/messages/{$message->id_message}"
        );

        $response->assertStatus(403);
    }

    public function test_peneliti_can_edit_own_message(): void
    {
        \Illuminate\Support\Facades\Event::fake([\App\Events\ChatMessageUpdated::class]);

        $conversation = Conversation::create([
            'type' => 'direct',
            'created_by' => $this->peneliti->id_user,
        ]);
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $this->peneliti->id_user,
        ]);
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $this->analyst->id_user,
        ]);

        $message = ChatMessage::create([
            'id_conversation' => $conversation->id_conversation,
            'id_sender' => $this->peneliti->id_user,
            'message' => 'Pesan asli peneliti sebelum diedit',
            'message_type' => 'text',
        ]);

        $response = $this->actingAs($this->peneliti)->putJson(
            "/api/v1/conversations/{$conversation->id_conversation}/messages/{$message->id_message}",
            ['message' => 'Pesan peneliti yang sudah diperbarui']
        );

        $response->assertStatus(200);
        $response->assertJsonPath('data.message', 'Pesan peneliti yang sudah diperbarui');
        $response->assertJsonPath('data.isEdited', true);

        $this->assertDatabaseHas('messages', [
            'id_message' => $message->id_message,
        ]);
        $rawDb = \Illuminate\Support\Facades\DB::table('messages')->where('id_message', $message->id_message)->value('message');
        $this->assertNotEquals('Pesan peneliti yang sudah diperbarui', $rawDb);
        $this->assertEquals('Pesan peneliti yang sudah diperbarui', ChatMessage::find($message->id_message)->message);

        \Illuminate\Support\Facades\Event::assertDispatched(\App\Events\ChatMessageUpdated::class);
    }

    public function test_peneliti_can_delete_own_message(): void
    {
        \Illuminate\Support\Facades\Event::fake([\App\Events\ChatMessageDeleted::class]);

        $conversation = Conversation::create([
            'type' => 'direct',
            'created_by' => $this->peneliti->id_user,
        ]);
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $this->peneliti->id_user,
        ]);
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $this->analyst->id_user,
        ]);

        $message = ChatMessage::create([
            'id_conversation' => $conversation->id_conversation,
            'id_sender' => $this->peneliti->id_user,
            'message' => 'Pesan peneliti yang akan dihapus',
            'message_type' => 'text',
        ]);

        $response = $this->actingAs($this->peneliti)->deleteJson(
            "/api/v1/conversations/{$conversation->id_conversation}/messages/{$message->id_message}"
        );

        $response->assertStatus(200);
        $this->assertSoftDeleted('messages', ['id_message' => $message->id_message]);

        \Illuminate\Support\Facades\Event::assertDispatched(\App\Events\ChatMessageDeleted::class);
    }

    public function test_participant_can_download_attachment(): void
    {
        Storage::fake('public');
        $filePath = 'chat-attachments/test/doc.pdf';
        Storage::disk('public')->put($filePath, 'PDF-CONTENT-TEST');

        $conversation = Conversation::create([
            'type' => 'direct',
            'created_by' => $this->peneliti->id_user,
        ]);
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $this->peneliti->id_user,
        ]);
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $this->analyst->id_user,
        ]);

        $message = ChatMessage::create([
            'id_conversation' => $conversation->id_conversation,
            'id_sender' => $this->peneliti->id_user,
            'message' => 'Berkas laporan',
            'message_type' => 'attachment',
        ]);

        $attachment = \App\Models\MessageAttachment::create([
            'id_message' => $message->id_message,
            'file_name' => 'laporan.pdf',
            'file_path' => $filePath,
            'file_size' => 16,
            'mime_type' => 'application/pdf',
            'file_type' => 'pdf',
        ]);

        $response = $this->actingAs($this->analyst)->get(
            "/api/v1/conversations/{$conversation->id_conversation}/messages/{$message->id_message}/attachments/{$attachment->id_attachment}/download"
        );

        $response->assertStatus(200);
        $response->assertHeader('content-disposition');
    }

    public function test_non_participant_cannot_download_attachment_anti_idor(): void
    {
        Storage::fake('public');
        $filePath = 'chat-attachments/test/secret.pdf';
        Storage::disk('public')->put($filePath, 'SECRET-PDF-CONTENT');

        $conversation = Conversation::create([
            'type' => 'direct',
            'created_by' => $this->peneliti->id_user,
        ]);
        ConversationParticipant::create([
            'id_conversation' => $conversation->id_conversation,
            'id_user' => $this->peneliti->id_user,
        ]);

        $message = ChatMessage::create([
            'id_conversation' => $conversation->id_conversation,
            'id_sender' => $this->peneliti->id_user,
            'message' => 'Berkas rahasia',
            'message_type' => 'attachment',
        ]);

        $attachment = \App\Models\MessageAttachment::create([
            'id_message' => $message->id_message,
            'file_name' => 'secret.pdf',
            'file_path' => $filePath,
            'file_size' => 18,
            'mime_type' => 'application/pdf',
            'file_type' => 'pdf',
        ]);

        $response = $this->actingAs($this->analyst)->get(
            "/api/v1/conversations/{$conversation->id_conversation}/messages/{$message->id_message}/attachments/{$attachment->id_attachment}/download"
        );

        $response->assertStatus(403);
    }
}