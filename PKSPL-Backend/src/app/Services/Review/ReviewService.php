<?php declare(strict_types=1);

namespace App\Services\Review;

use App\Models\Proyek;
use App\Models\Review;
use App\Models\User;
use App\Repositories\Contracts\ReviewRepositoryInterface;
use App\Events\Review\DatasetSubmitted;
use App\Events\Review\ReviewDecisionMade;
use App\Events\Review\ReviewResolved;
use App\Events\Review\ReviewReopened;
use App\Events\Review\ReviewClosed;
use Illuminate\Support\Facades\DB;
use DomainException;

class ReviewService
{
    public function __construct(
        private ReviewRepositoryInterface $repository,
        private ActivityLogService $activityLogService,
        private NotificationDispatchService $notificationService
    ) {}

    public function submit(Proyek $proyek, int $actorId): Proyek
    {
        DB::transaction(function () use ($proyek, $actorId) {
            $proyek->status = 'Submitted';
            $proyek->save();

            $this->activityLogService->log(
                userId: $actorId,
                proyekId: $proyek->id_proyek,
                reviewId: null,
                commentId: null,
                action: 'submit_dataset',
                description: 'Dataset submitted for review'
            );
        });

        event(new DatasetSubmitted($proyek));
        $this->notificationService->notifyDatasetSubmitted($proyek);

        return $proyek->refresh();
    }

    public function createReview(Proyek $proyek, User $analyst, array $data): Review
    {
        if ($proyek->status !== 'Submitted') {
            throw new DomainException("Proyek must be in 'Submitted' status to create a review.");
        }

        $review = DB::transaction(function () use ($proyek, $analyst, $data) {
            $decision = $data['decision'] ?? null;
            
            $review = $this->repository->create([
                'id_proyek' => $proyek->id_proyek,
                'id_reviewer' => $analyst->id_user,
                'status' => 'Open',
                'decision' => $decision,
                'notes' => $data['notes'] ?? null,
                'reviewed_at' => $decision === 'Approved' ? now() : null,
            ]);

            if ($decision === 'Need Revision') {
                $proyek->status = 'Need Revision';
                $proyek->save();
            } elseif ($decision === 'Approved') {
                $proyek->status = 'Approved';
                $proyek->save();
            }

            $this->activityLogService->log(
                userId: $analyst->id_user,
                proyekId: $proyek->id_proyek,
                reviewId: $review->id_review,
                commentId: null,
                action: 'create_review',
                description: 'Review created with decision: ' . ($decision ?? 'None')
            );

            return $review;
        });

        event(new ReviewDecisionMade($review, $proyek));
        $this->notificationService->notifyDecision($review, $proyek);

        return $review->refresh();
    }

    public function updateReview(Review $review, array $data): Review
    {
        return DB::transaction(function () use ($review, $data) {
            $updated = $this->repository->update($review, [
                'notes' => $data['notes'] ?? $review->notes,
                'decision' => $data['decision'] ?? $review->decision,
            ]);

            $this->activityLogService->log(
                userId: auth()->id() ?? $review->id_reviewer,
                proyekId: $review->id_proyek,
                reviewId: $review->id_review,
                commentId: null,
                action: 'update_review',
                description: 'Review updated'
            );

            return $updated;
        });
    }

    public function resolve(Review $review, User $actor): Review
    {
        if ($review->status !== 'Open') {
            throw new DomainException("Only Open reviews can be resolved.");
        }

        $review = DB::transaction(function () use ($review, $actor) {
            $updated = $this->repository->update($review, [
                'status' => 'Resolved',
                'reviewed_at' => now(),
            ]);

            $this->activityLogService->log(
                userId: $actor->id_user,
                proyekId: $review->id_proyek,
                reviewId: $review->id_review,
                commentId: null,
                action: 'resolve_review',
                description: 'Review marked as resolved'
            );

            return $updated;
        });

        event(new ReviewResolved($review, $review->proyek));
        $this->notificationService->notifyResolved($review, $review->proyek);

        return $review;
    }

    public function reopen(Review $review, User $actor): Review
    {
        if ($review->status !== 'Resolved') {
            throw new DomainException("Only Resolved reviews can be reopened.");
        }

        $review = DB::transaction(function () use ($review, $actor) {
            $updated = $this->repository->update($review, [
                'status' => 'Open',
                'reviewed_at' => null,
            ]);

            $this->activityLogService->log(
                userId: $actor->id_user,
                proyekId: $review->id_proyek,
                reviewId: $review->id_review,
                commentId: null,
                action: 'reopen_review',
                description: 'Review reopened'
            );

            return $updated;
        });

        event(new ReviewReopened($review, $review->proyek));
        $this->notificationService->notifyReopened($review, $review->proyek);

        return $review;
    }

    public function close(Review $review, User $actor): Review
    {
        if ($review->status === 'Closed') {
            throw new DomainException("Review is already closed.");
        }

        $review = DB::transaction(function () use ($review, $actor) {
            $updated = $this->repository->update($review, [
                'status' => 'Closed',
            ]);

            $this->activityLogService->log(
                userId: $actor->id_user,
                proyekId: $review->id_proyek,
                reviewId: $review->id_review,
                commentId: null,
                action: 'close_review',
                description: 'Review closed'
            );

            return $updated;
        });

        event(new ReviewClosed($review, $review->proyek));
        $this->notificationService->notifyClosed($review, $review->proyek);

        return $review;
    }
}
