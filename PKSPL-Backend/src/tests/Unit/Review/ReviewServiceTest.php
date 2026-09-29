<?php

declare(strict_types=1);

namespace Tests\Unit\Review;

use App\Models\Proyek;
use App\Models\Review;
use App\Models\User;
use App\Services\Review\ReviewService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ReviewServiceTest extends TestCase
{
    use RefreshDatabase;

    protected ReviewService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(ReviewService::class);
    }

    public function test_submit_changes_proyek_status_to_submitted(): void
    {
        $proyek = Proyek::factory()->create(['status' => 'Draft']);
        $user = User::factory()->create();

        $this->service->submitDataset($proyek, $user);

        $this->assertEquals('Submitted', $proyek->fresh()->status);
    }

    public function test_submit_throws_when_already_submitted(): void
    {
        $this->expectException(\DomainException::class);
        $proyek = Proyek::factory()->create(['status' => 'Submitted']);
        $user = User::factory()->create();

        $this->service->submitDataset($proyek, $user);
    }

    public function test_create_review_with_need_revision_changes_proyek_status(): void
    {
        $proyek = Proyek::factory()->create(['status' => 'Submitted']);
        $reviewer = User::factory()->create();

        $review = Review::factory()->create([
            'id_proyek' => $proyek->id_proyek,
            'id_reviewer' => $reviewer->id_user,
            'status' => 'Open'
        ]);

        $this->service->closeReview($review, 'Need Revision', 'Please fix', $reviewer);

        $this->assertEquals('Revision Required', $proyek->fresh()->status);
    }

    public function test_create_review_with_approved_changes_proyek_status(): void
    {
        $proyek = Proyek::factory()->create(['status' => 'Submitted']);
        $reviewer = User::factory()->create();

        $review = Review::factory()->create([
            'id_proyek' => $proyek->id_proyek,
            'id_reviewer' => $reviewer->id_user,
            'status' => 'Open'
        ]);

        $this->service->closeReview($review, 'Approved', 'Looks good', $reviewer);

        $this->assertEquals('Approved', $proyek->fresh()->status);
    }

    public function test_resolve_changes_status_to_resolved(): void
    {
        $review = Review::factory()->create(['status' => 'Open']);
        $user = User::factory()->create();

        $this->service->resolveReview($review, $user);

        $this->assertEquals('Resolved', $review->fresh()->status);
    }

    public function test_cannot_resolve_closed_review(): void
    {
        $this->expectException(\DomainException::class);
        $review = Review::factory()->create(['status' => 'Closed']);
        $user = User::factory()->create();

        $this->service->resolveReview($review, $user);
    }

    public function test_cannot_reopen_open_review(): void
    {
        $this->expectException(\DomainException::class);
        $review = Review::factory()->create(['status' => 'Open']);
        $user = User::factory()->create();

        $this->service->reopenReview($review, $user);
    }
}
