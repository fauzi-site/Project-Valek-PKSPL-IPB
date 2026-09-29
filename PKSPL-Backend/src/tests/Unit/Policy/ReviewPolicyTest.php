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
        
        Role::create(['id_role' => 1, 'nama_role' => 'Super Admin']);
        Role::create(['id_role' => 3, 'nama_role' => 'Peneliti']);
    }

    public function test_super_admin_can_create_review(): void
    {
        $admin = User::factory()->create(['id_role' => 1]);
        $proyek = Proyek::factory()->create();

        $this->assertTrue($this->policy->create($admin, $proyek));
    }

    public function test_peneliti_cannot_create_review(): void
    {
        $peneliti = User::factory()->create(['id_role' => 3]);
        $proyek = Proyek::factory()->create();

        $this->assertFalse($this->policy->create($peneliti, $proyek));
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
        $peneliti = User::factory()->create(['id_role' => 1]);
        $proyek = Proyek::factory()->create(['id_user' => $peneliti->id_user]);
        $review = Review::factory()->create(['id_proyek' => $proyek->id_proyek]);

        $this->assertTrue($this->policy->view($peneliti, $review));
    }
}
