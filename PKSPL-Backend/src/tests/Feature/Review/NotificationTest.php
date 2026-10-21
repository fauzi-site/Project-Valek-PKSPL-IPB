<?php

declare(strict_types=1);

namespace Tests\Feature\Review;

use App\Models\Proyek;
use App\Models\Role;
use App\Models\User;
use App\Notifications\Review\DatasetSubmittedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $peneliti;
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        
        Role::firstOrCreate(['id_role' => 1], ['nama_role' => Role::SUPER_ADMIN, 'deskripsi' => 'Super Admin']);
        Role::firstOrCreate(['id_role' => 2], ['nama_role' => Role::PENELITI, 'deskripsi' => 'Peneliti']);

        $this->peneliti = User::factory()->create(['id_role' => 2]);
        $this->admin = User::factory()->create(['id_role' => 1]);
    }

    public function test_submission_creates_database_notification(): void
    {
        Notification::fake();
        $proyek = Proyek::factory()->create(['id_user' => $this->peneliti->id_user]);

        $this->actingAs($this->peneliti)->postJson("/api/v1/proyek/{$proyek->id_proyek}/submit");

        Notification::assertSentTo(
            User::where('id_role', 1)->get(),
            DatasetSubmittedNotification::class
        );
    }

    public function test_can_list_notifications(): void
    {
        $this->admin->notifications()->create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'type' => 'App\Notifications\Review\DatasetSubmittedNotification',
            'data' => ['message' => 'New dataset submitted'],
            'read_at' => null,
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/notifications");
        $response->assertStatus(200)->assertJsonStructure(['data', 'links', 'meta']);
    }

    public function test_can_get_unread_count(): void
    {
        $this->admin->notifications()->create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'type' => 'TestNotification',
            'data' => [],
            'read_at' => null,
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/notifications/unread-count");
        $response->assertStatus(200)->assertJson(['unread_count' => 1]);
    }

    public function test_can_mark_notification_as_read(): void
    {
        $id = \Illuminate\Support\Str::uuid()->toString();
        $this->admin->notifications()->create([
            'id' => $id,
            'type' => 'TestNotification',
            'data' => [],
            'read_at' => null,
        ]);

        $response = $this->actingAs($this->admin)->postJson("/api/v1/notifications/{$id}/read");
        $response->assertStatus(200);
        $this->assertNotNull($this->admin->notifications()->first()->read_at);
    }

    public function test_can_mark_all_notifications_as_read(): void
    {
        $this->admin->notifications()->create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'type' => 'TestNotification',
            'data' => [],
            'read_at' => null,
        ]);

        $response = $this->actingAs($this->admin)->postJson("/api/v1/notifications/read-all");
        $response->assertStatus(200);
        $this->assertEquals(0, $this->admin->unreadNotifications()->count());
    }
}
