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

    public function test_submit_creates_open_review(): void
    {
        $proyek = Proyek::factory()->create();
        $user = User::factory()->create();

        $result = $this->service->submit($proyek, $user->id_user);

        $this->assertInstanceOf(Proyek::class, $result);
        $this->assertDatabaseHas('reviews', [
            'id_proyek' => $proyek->id_proyek,
            'status' => 'Open',
        ]);
    }

    public function test_create_review_creates_review_record(): void
    {
        $proyek = Proyek::factory()->create();
        $reviewer = User::factory()->create();

        $review = $this->service->createReview($proyek, $reviewer, [
            'decision' => 'Need Revision',
            'notes' => 'Please fix issues',
        ]);

        $this->assertEquals('Open', $review->status);
        $this->assertEquals('Need Revision', $review->decision);
        $this->assertEquals('Please fix issues', $review->notes);
    }

    public function test_resolve_changes_status_to_resolved(): void
    {
        $review = Review::factory()->create(['status' => 'Open']);
        $user = User::factory()->create();

        $this->service->resolve($review, $user);

        $this->assertEquals('Resolved', $review->fresh()->status);
    }

    public function test_cannot_resolve_closed_review(): void
    {
        $this->expectException(\DomainException::class);
        $review = Review::factory()->create(['status' => 'Closed']);
        $user = User::factory()->create();

        $this->service->resolve($review, $user);
    }

    public function test_cannot_reopen_open_review(): void
    {
        $this->expectException(\DomainException::class);
        $review = Review::factory()->create(['status' => 'Open']);
        $user = User::factory()->create();

        $this->service->reopen($review, $user);
    }
}
