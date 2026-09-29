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
    protected User $analyst;
    protected User $guest;
    protected Review $review;

    protected function setUp(): void
    {
        parent::setUp();

        Role::create(['id_role' => 1, 'nama_role' => 'Peneliti']);
        Role::create(['id_role' => 2, 'nama_role' => 'Analyst']);
        Role::create(['id_role' => 3, 'nama_role' => 'Guest']);

        $this->peneliti = User::factory()->create(['id_role' => 1]);
        $this->analyst = User::factory()->create(['id_role' => 2]);
        $this->guest = User::factory()->create(['id_role' => 3]);

        $proyek = Proyek::factory()->create(['id_user' => $this->peneliti->id_user]);
        $this->review = Review::factory()->create([
            'id_proyek' => $proyek->id_proyek,
            'id_reviewer' => $this->analyst->id_user
        ]);
    }

    public function test_peneliti_can_create_comment(): void
    {
        $response = $this->actingAs($this->peneliti)->postJson("/api/v1/reviews/{$this->review->id_review}/comments", [
            'body' => 'Test comment from peneliti'
        ]);
        $response->assertStatus(201);
        $this->assertDatabaseHas('review_comments', ['body' => 'Test comment from peneliti']);
    }

    public function test_analyst_can_create_comment(): void
    {
        $response = $this->actingAs($this->analyst)->postJson("/api/v1/reviews/{$this->review->id_review}/comments", [
            'body' => 'Test comment from analyst'
        ]);
        $response->assertStatus(201);
    }

    public function test_guest_cannot_create_comment(): void
    {
        $response = $this->actingAs($this->guest)->postJson("/api/v1/reviews/{$this->review->id_review}/comments", [
            'body' => 'Test comment from guest'
        ]);
        $response->assertStatus(403);
    }

    public function test_can_list_comments(): void
    {
        ReviewComment::factory()->count(3)->create(['id_review' => $this->review->id_review]);
        $response = $this->actingAs($this->analyst)->getJson("/api/v1/reviews/{$this->review->id_review}/comments");
        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_owner_can_edit_own_comment(): void
    {
        $comment = ReviewComment::factory()->create([
            'id_review' => $this->review->id_review,
            'id_user' => $this->peneliti->id_user
        ]);

        $response = $this->actingAs($this->peneliti)->patchJson("/api/v1/comments/{$comment->id_comment}", [
            'body' => 'Edited body'
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('review_comments', ['id_comment' => $comment->id_comment, 'body' => 'Edited body', 'is_edited' => true]);
    }

    public function test_user_cannot_edit_others_comment(): void
    {
        $comment = ReviewComment::factory()->create([
            'id_review' => $this->review->id_review,
            'id_user' => $this->peneliti->id_user
        ]);

        $response = $this->actingAs($this->analyst)->patchJson("/api/v1/comments/{$comment->id_comment}", [
            'body' => 'Hacked body'
        ]);
        $response->assertStatus(403);
    }

    public function test_owner_can_delete_own_comment(): void
    {
        $comment = ReviewComment::factory()->create([
            'id_review' => $this->review->id_review,
            'id_user' => $this->peneliti->id_user
        ]);

        $response = $this->actingAs($this->peneliti)->deleteJson("/api/v1/comments/{$comment->id_comment}");
        $response->assertStatus(200);
        
        $this->assertSoftDeleted('review_comments', ['id_comment' => $comment->id_comment]);
    }

    public function test_deleted_comment_body_shows_placeholder(): void
    {
        $comment = ReviewComment::factory()->create([
            'id_review' => $this->review->id_review,
            'id_user' => $this->peneliti->id_user,
            'deleted_at' => now()
        ]);

        $response = $this->actingAs($this->analyst)->getJson("/api/v1/reviews/{$this->review->id_review}/comments");
        
        // Assert that the body is masked or we check how resource handles it
        // Depending on Resource implementation. Assuming Resource does: $this->deleted_at ? '[deleted]' : $this->body
        $response->assertStatus(200);
        $this->assertStringContainsString('[deleted]', $response->getContent());
    }
}
