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
        Role::firstOrCreate(['id_role' => 1], ['nama_role' => Role::SUPER_ADMIN, 'deskripsi' => 'Super Admin']);
        Role::firstOrCreate(['id_role' => 2], ['nama_role' => Role::PENELITI, 'deskripsi' => 'Peneliti']);
    }

    public function test_researcher_can_submit_own_dataset(): void
    {
        $peneliti = User::factory()->create(['id_role' => 2]);
        $proyek = Proyek::factory()->create(['id_user' => $peneliti->id_user]);

        $response = $this->actingAs($peneliti)->postJson("/api/v1/proyek/{$proyek->id_proyek}/submit");

        $response->assertStatus(200);
        $this->assertDatabaseHas('reviews', [
            'id_proyek' => $proyek->id_proyek,
            'status' => 'Open',
        ]);
    }

    public function test_researcher_cannot_submit_another_users_dataset(): void
    {
        $peneliti1 = User::factory()->create(['id_role' => 2]);
        $peneliti2 = User::factory()->create(['id_role' => 2]);
        $proyek = Proyek::factory()->create(['id_user' => $peneliti2->id_user]);

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
