<?php

declare(strict_types=1);

namespace Tests\Unit\Policy;

use App\Models\Proyek;
use App\Models\Review;
use App\Models\Role;
use App\Models\User;
use App\Policies\Review\ReviewPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected ReviewPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new ReviewPolicy();
        
        Role::firstOrCreate(['id_role' => 1], ['nama_role' => Role::SUPER_ADMIN, 'deskripsi' => 'Super Admin']);
        Role::firstOrCreate(['id_role' => 2], ['nama_role' => Role::PENELITI, 'deskripsi' => 'Peneliti']);
    }

    public function test_super_admin_can_create_review(): void
    {
        $admin = User::factory()->create(['id_role' => 1]);

        $this->assertTrue($this->policy->create($admin));
    }

    public function test_peneliti_cannot_create_review(): void
    {
        $peneliti = User::factory()->create(['id_role' => 2]);

        $this->assertFalse($this->policy->create($peneliti));
    }

    public function test_super_admin_can_resolve_own_review(): void
    {
        $admin = User::factory()->create(['id_role' => 1]);
        $review = Review::factory()->create(['id_reviewer' => $admin->id_user, 'status' => 'Open']);

        $this->assertTrue($this->policy->resolve($admin, $review));
    }

    public function test_super_admin_cannot_resolve_closed_review(): void
    {
        $admin = User::factory()->create(['id_role' => 1]);
        $review = Review::factory()->create(['id_reviewer' => $admin->id_user, 'status' => 'Closed']);

        $this->assertFalse($this->policy->resolve($admin, $review));
    }

    public function test_researcher_can_view_own_review(): void
    {
        $peneliti = User::factory()->create(['id_role' => 2]);
        $proyek = Proyek::factory()->create(['id_user' => $peneliti->id_user]);
        $review = Review::factory()->create(['id_proyek' => $proyek->id_proyek]);

        $this->assertTrue($this->policy->view($peneliti, $review));
    }
}
