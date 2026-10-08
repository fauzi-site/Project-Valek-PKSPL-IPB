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

    protected User $admin;
    protected User $peneliti;
    protected Proyek $proyek;

    protected function setUp(): void
    {
        parent::setUp();
        
        Role::firstOrCreate(['id_role' => 1], ['nama_role' => Role::SUPER_ADMIN, 'deskripsi' => 'Super Admin']);
        Role::firstOrCreate(['id_role' => 2], ['nama_role' => Role::PENELITI, 'deskripsi' => 'Peneliti']);

        $this->admin = User::factory()->create(['id_role' => 1]);
        $this->peneliti = User::factory()->create(['id_role' => 2]);
        
        $this->proyek = Proyek::factory()->create([
            'id_user' => $this->peneliti->id_user,
        ]);
    }

    public function test_admin_can_create_review(): void
    {
        $response = $this->actingAs($this->admin)->postJson("/api/v1/proyek/{$this->proyek->id_proyek}/reviews", [
            'decision' => 'Approved',
            'notes' => 'Initial review notes',
        ]);
        $response->assertStatus(201);
    }

    public function test_peneliti_cannot_create_review(): void
    {
        $response = $this->actingAs($this->peneliti)->postJson("/api/v1/proyek/{$this->proyek->id_proyek}/reviews", [
            'decision' => 'Approved',
        ]);
        $response->assertStatus(403);
    }

    public function test_can_list_reviews(): void
    {
        Review::factory()->count(3)->create(['id_proyek' => $this->proyek->id_proyek]);
        
        $response = $this->actingAs($this->admin)->getJson("/api/v1/reviews");
        $response->assertStatus(200)->assertJsonStructure(['data']);
    }

    public function test_can_show_review(): void
    {
        $review = Review::factory()->create([
            'id_proyek' => $this->proyek->id_proyek,
            'id_reviewer' => $this->admin->id_user
        ]);
        
        $response = $this->actingAs($this->admin)->getJson("/api/v1/reviews/{$review->id_review}");
        $response->assertStatus(200);
    }

    public function test_admin_can_update_review(): void
    {
        $review = Review::factory()->create([
            'id_proyek' => $this->proyek->id_proyek,
            'id_reviewer' => $this->admin->id_user
        ]);
        
        $response = $this->actingAs($this->admin)->patchJson("/api/v1/reviews/{$review->id_review}", [
            'notes' => 'Updated notes'
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('reviews', ['id_review' => $review->id_review, 'notes' => 'Updated notes']);
    }

    public function test_admin_can_resolve_review(): void
    {
        $review = Review::factory()->create([
            'id_proyek' => $this->proyek->id_proyek,
            'id_reviewer' => $this->admin->id_user,
            'status' => 'Open'
        ]);
        
        $response = $this->actingAs($this->admin)->postJson("/api/v1/reviews/{$review->id_review}/resolve");
        $response->assertStatus(200);
        $this->assertDatabaseHas('reviews', ['id_review' => $review->id_review, 'status' => 'Resolved']);
    }

    public function test_admin_can_close_review(): void
    {
        $review = Review::factory()->create([
            'id_proyek' => $this->proyek->id_proyek,
            'id_reviewer' => $this->admin->id_user,
            'status' => 'Resolved'
        ]);
        
        $response = $this->actingAs($this->admin)->postJson("/api/v1/reviews/{$review->id_review}/close", [
            'decision' => 'Approved',
            'notes' => 'All good'
        ]);
        $response->assertStatus(200);
        $this->assertDatabaseHas('reviews', ['id_review' => $review->id_review, 'status' => 'Closed']);
    }

    public function test_admin_can_reopen_review(): void
    {
        $review = Review::factory()->create([
            'id_proyek' => $this->proyek->id_proyek,
            'id_reviewer' => $this->admin->id_user,
            'status' => 'Resolved'
        ]);
        
        $response = $this->actingAs($this->admin)->postJson("/api/v1/reviews/{$review->id_review}/reopen");
        $response->assertStatus(200);
        $this->assertDatabaseHas('reviews', ['id_review' => $review->id_review, 'status' => 'Open']);
    }
}
