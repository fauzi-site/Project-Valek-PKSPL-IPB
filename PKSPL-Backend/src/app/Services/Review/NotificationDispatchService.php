<?php declare(strict_types=1);

namespace App\Services\Review;

use App\Models\Proyek;
use App\Models\Review;
use App\Models\ReviewComment;
use App\Models\User;
use App\Models\Role;
use App\Notifications\Review\DatasetSubmittedNotification;
use App\Notifications\Review\ReviewDecisionNotification;
use App\Notifications\Review\NewCommentNotification;
use App\Notifications\Review\CommentReplyNotification;
use App\Notifications\Review\MentionNotification;
use App\Notifications\Review\ReviewResolvedNotification;
use App\Notifications\Review\ReviewReopenedNotification;
use App\Notifications\Review\ReviewClosedNotification;

class NotificationDispatchService
{
    public function notifyDatasetSubmitted(Proyek $proyek): void
    {
        $analysts = User::whereHas('role', fn ($q) => $q->where('nama_role', 'ilike', '%analyst%'))
            ->orWhere('id_role', 2)
            ->get();
        foreach ($analysts as $analyst) {
            $analyst->notify(new DatasetSubmittedNotification($proyek));
        }
    }

    public function notifyDecision(Review $review, Proyek $proyek): void
    {
        if ($proyek->user) {
            $proyek->user->notify(new ReviewDecisionNotification($review, $proyek));
        }
    }

    public function notifyNewComment(ReviewComment $comment, Review $review, Proyek $proyek): void
    {
        $recipients = collect();
        
        if ($proyek->user && $proyek->user->id_user !== $comment->id_user) {
            $recipients->push($proyek->user);
        }
        
        if ($review->reviewer && $review->reviewer->id_user !== $comment->id_user) {
            if (!$recipients->contains('id_user', $review->reviewer->id_user)) {
                $recipients->push($review->reviewer);
            }
        }
        
        foreach ($recipients as $recipient) {
            $recipient->notify(new NewCommentNotification($comment, $review, $proyek));
        }
    }

    public function notifyReply(ReviewComment $reply, ReviewComment $parent, Review $review): void
    {
        if ($parent->user && $parent->user->id_user !== $reply->id_user) {
            $parent->user->notify(new CommentReplyNotification($reply, $parent, $review));
        }
    }

    public function notifyMentions(ReviewComment $comment, array $mentionedUsers): void
    {
        foreach ($mentionedUsers as $user) {
            if ($user instanceof User && $user->id_user !== $comment->id_user) {
                $user->notify(new MentionNotification($comment));
            }
        }
    }

    public function notifyResolved(Review $review, Proyek $proyek): void
    {
        if ($proyek->user) {
            $proyek->user->notify(new ReviewResolvedNotification($review, $proyek));
        }
    }

    public function notifyReopened(Review $review, Proyek $proyek): void
    {
        if ($proyek->user) {
            $proyek->user->notify(new ReviewReopenedNotification($review, $proyek));
        }
    }

    public function notifyClosed(Review $review, Proyek $proyek): void
    {
        if ($proyek->user) {
            $proyek->user->notify(new ReviewClosedNotification($review, $proyek));
        }
    }
}
