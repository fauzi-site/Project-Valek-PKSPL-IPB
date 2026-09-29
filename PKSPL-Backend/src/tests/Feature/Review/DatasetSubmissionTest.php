<?php

declare(strict_types=1);

namespace Tests\Feature\Review;

use App\Models\Proyek;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatasetSubmissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Setup basic roles
        Role::create(['id_role' => 1, 'nama_role' => 'Peneliti']);
        Role::create(['id_role' => 2, 'nama_role' => 'Analyst']);
    }

    public function test_researcher_can_submit_own_dataset(): void
    {
        $peneliti = User::factory()->create(['id_role' => 1]);
        $proyek = Proyek::factory()->create(['id_user' => $peneliti->id_user, 'status' => 'Draft']);

        $response = $this->actingAs($peneliti)->postJson("/api/v1/proyek/{$proyek->id_proyek}/submit");

        $response->assertStatus(200);
        $this->assertDatabaseHas('proyek', [
            'id_proyek' => $proyek->id_proyek,
            'status' => 'Submitted'
        ]);
    }

    public function test_researcher_cannot_submit_another_users_dataset(): void
    {
        $peneliti1 = User::factory()->create(['id_role' => 1]);
        $peneliti2 = User::factory()->create(['id_role' => 1]);
        $proyek = Proyek::factory()->create(['id_user' => $peneliti2->id_user, 'status' => 'Draft']);

        $response = $this->actingAs($peneliti1)->postJson("/api/v1/proyek/{$proyek->id_proyek}/submit");

        $response->assertStatus(403);
    }

    public function test_unauthenticated_cannot_submit(): void
    {
        $proyek = Proyek::factory()->create();
        $response = $this->postJson("/api/v1/proyek/{$proyek->id_proyek}/submit");
        $response->assertStatus(401);
    }
}
