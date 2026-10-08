<?php

declare(strict_types=1);

namespace Tests\Feature\Review;

use App\Models\Proyek;
use App\Models\Review;
use App\Models\ReviewComment;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewCommentTest extends TestCase
{
    use RefreshDatabase;

    protected User $peneliti;
    protected User $admin;
    protected User $guest;
    protected Review $review;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['id_role' => 1], ['nama_role' => Role::SUPER_ADMIN, 'deskripsi' => 'Super Admin']);
        Role::firstOrCreate(['id_role' => 2], ['nama_role' => Role::PENELITI, 'deskripsi' => 'Peneliti']);
        Role::firstOrCreate(['id_role' => 3], ['nama_role' => Role::GUEST, 'deskripsi' => 'Guest']);

        $this->peneliti = User::factory()->create(['id_role' => 2]);
        $this->admin = User::factory()->create(['id_role' => 1]);
        $this->guest = User::factory()->create(['id_role' => 3]);

        $proyek = Proyek::factory()->create(['id_user' => $this->peneliti->id_user]);
        $this->review = Review::factory()->create([
            'id_proyek' => $proyek->id_proyek,
            'id_reviewer' => $this->admin->id_user,
            'status' => 'Open',
        ]);
    }

    public function test_peneliti_can_create_comment(): void
    {
        $response = $this->actingAs($this->peneliti)->postJson("/api/v1/reviews/{$this->review->id_review}/comments", [
            'body' => 'Test comment from peneliti',
        ]);
        $response->assertStatus(201);
        $this->assertDatabaseHas('review_comments', ['body' => 'Test comment from peneliti']);
    }

    public function test_admin_can_create_comment(): void
    {
        $response = $this->actingAs($this->admin)->postJson("/api/v1/reviews/{$this->review->id_review}/comments", [
            'body' => 'Test comment from admin',
        ]);
        $response->assertStatus(201);
    }

    public function test_guest_cannot_create_comment(): void
    {
        $response = $this->actingAs($this->guest)->postJson("/api/v1/reviews/{$this->review->id_review}/comments", [
            'body' => 'Test comment from guest',
        ]);
        $response->assertStatus(403);
    }

    public function test_can_list_comments(): void
    {
        ReviewComment::factory()->count(3)->create(['id_review' => $this->review->id_review]);
        $response = $this->actingAs($this->admin)->getJson("/api/v1/reviews/{$this->review->id_review}/comments");
        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_owner_can_edit_own_comment(): void
    {
        $comment = ReviewComment::factory()->create([
            'id_review' => $this->review->id_review,
            'id_user' => $this->peneliti->id_user,
        ]);

        $response = $this->actingAs($this->peneliti)->patchJson("/api/v1/reviews/{$this->review->id_review}/comments/{$comment->id_comment}", [
            'body' => 'Edited body',
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('review_comments', ['id_comment' => $comment->id_comment, 'body' => 'Edited body', 'is_edited' => true]);
    }

    public function test_user_cannot_edit_others_comment(): void
    {
        $comment = ReviewComment::factory()->create([
            'id_review' => $this->review->id_review,
            'id_user' => $this->peneliti->id_user,
        ]);

        $otherPeneliti = User::factory()->create(['id_role' => 2]);

        $response = $this->actingAs($otherPeneliti)->patchJson("/api/v1/reviews/{$this->review->id_review}/comments/{$comment->id_comment}", [
            'body' => 'Hacked body',
        ]);
        $response->assertStatus(403);
    }

    public function test_owner_can_delete_own_comment(): void
    {
        $comment = ReviewComment::factory()->create([
            'id_review' => $this->review->id_review,
            'id_user' => $this->peneliti->id_user,
        ]);

        $response = $this->actingAs($this->peneliti)->deleteJson("/api/v1/reviews/{$this->review->id_review}/comments/{$comment->id_comment}");
        $response->assertStatus(200);
        
        $this->assertSoftDeleted('review_comments', ['id_comment' => $comment->id_comment]);
    }

    public function test_deleted_comment_body_shows_placeholder(): void
    {
        $comment = ReviewComment::factory()->create([
            'id_review' => $this->review->id_review,
            'id_user' => $this->peneliti->id_user,
            'deleted_at' => now(),
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/reviews/{$this->review->id_review}/comments/{$comment->id_comment}");
        
        $response->assertStatus(200);
        $this->assertStringContainsString('[deleted]', $response->getContent());
    }
}
