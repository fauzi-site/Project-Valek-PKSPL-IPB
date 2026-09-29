<?php

declare(strict_types=1);

namespace Tests\Feature\Review;

use App\Models\Proyek;
use App\Models\Review;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewCrudTest extends TestCase
{
    use RefreshDatabase;

    protected User $analyst;
    protected User $peneliti;
    protected Proyek $proyek;

    protected function setUp(): void
    {
        parent::setUp();
        
        Role::firstOrCreate(['id_role' => 1], ['nama_role' => 'Peneliti']);
        Role::firstOrCreate(['id_role' => 2], ['nama_role' => 'Analyst']);

        $this->analyst = User::factory()->create(['id_role' => 2]);
        $this->peneliti = User::factory()->create(['id_role' => 1]);
        
        $this->proyek = Proyek::factory()->create([
            'id_user' => $this->peneliti->id_user,
            'status' => 'Submitted'
        ]);
    }

    public function test_analyst_can_create_review(): void
    {
        $response = $this->actingAs($this->analyst)->postJson("/api/v1/proyek/{$this->proyek->id_proyek}/reviews");
        $response->assertStatus(201);
    }

    public function test_peneliti_cannot_create_review(): void
    {
        $response = $this->actingAs($this->peneliti)->postJson("/api/v1/proyek/{$this->proyek->id_proyek}/reviews");
        $response->assertStatus(403);
    }

    public function test_can_list_reviews(): void
    {
        Review::factory()->count(3)->create(['id_proyek' => $this->proyek->id_proyek]);
        
        $response = $this->actingAs($this->analyst)->getJson("/api/v1/proyek/{$this->proyek->id_proyek}/reviews");
        $response->assertStatus(200)->assertJsonStructure(['data', 'links', 'meta']);
    }

    public function test_can_show_review(): void
    {
        $review = Review::factory()->create([
            'id_proyek' => $this->proyek->id_proyek,
            'id_reviewer' => $this->analyst->id_user
        ]);
        
        $response = $this->actingAs($this->analyst)->getJson("/api/v1/reviews/{$review->id_review}");
        $response->assertStatus(200);
    }

    public function test_analyst_can_update_review(): void
    {
        $review = Review::factory()->create([
            'id_proyek' => $this->proyek->id_proyek,
            'id_reviewer' => $this->analyst->id_user
        ]);
        
        $response = $this->actingAs($this->analyst)->patchJson("/api/v1/reviews/{$review->id_review}", [
            'notes' => 'Updated notes'
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('reviews', ['id_review' => $review->id_review, 'notes' => 'Updated notes']);
    }

    public function test_analyst_can_resolve_review(): void
    {
        $review = Review::factory()->create([
            'id_proyek' => $this->proyek->id_proyek,
            'id_reviewer' => $this->analyst->id_user,
            'status' => 'Open'
        ]);
        
        $response = $this->actingAs($this->analyst)->postJson("/api/v1/reviews/{$review->id_review}/resolve");
        $response->assertStatus(200);
        $this->assertDatabaseHas('reviews', ['id_review' => $review->id_review, 'status' => 'Resolved']);
    }

    public function test_analyst_can_close_review(): void
    {
        $review = Review::factory()->create([
            'id_proyek' => $this->proyek->id_proyek,
            'id_reviewer' => $this->analyst->id_user,
            'status' => 'Resolved'
        ]);
        
        $response = $this->actingAs($this->analyst)->postJson("/api/v1/reviews/{$review->id_review}/close", [
            'decision' => 'Approved',
            'notes' => 'All good'
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('reviews', ['id_review' => $review->id_review, 'status' => 'Closed', 'decision' => 'Approved']);
    }

    public function test_analyst_can_reopen_review(): void
    {
        $review = Review::factory()->create([
            'id_proyek' => $this->proyek->id_proyek,
            'id_reviewer' => $this->analyst->id_user,
            'status' => 'Resolved'
        ]);
        
        $response = $this->actingAs($this->analyst)->postJson("/api/v1/reviews/{$review->id_review}/reopen");
        $response->assertStatus(200);
        $this->assertDatabaseHas('reviews', ['id_review' => $review->id_review, 'status' => 'Open']);
    }
}
