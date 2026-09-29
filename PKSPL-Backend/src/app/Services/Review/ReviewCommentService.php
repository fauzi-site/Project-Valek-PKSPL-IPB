<?php declare(strict_types=1);

namespace App\Services\Review;

use App\Models\Review;
use App\Models\ReviewComment;
use App\Models\CommentMention;
use App\Models\CommentEditHistory;
use App\Models\User;
use App\Repositories\Contracts\ReviewCommentRepositoryInterface;
use App\Events\Review\CommentCreated;
use App\Events\Review\CommentReplied;
use App\Events\Review\UserMentioned;
use Illuminate\Support\Facades\DB;

class ReviewCommentService
{
    public function __construct(
        private ReviewCommentRepositoryInterface $repository,
        private AttachmentService $attachmentService,
        private ActivityLogService $activityLogService,
        private NotificationDispatchService $notificationService
    ) {}

    public function createComment(Review $review, User $user, array $data): ReviewComment
    {
        return DB::transaction(function () use ($review, $user, $data) {
            $body = $data['body'];
            $mentions = $this->parseMentions($body);

            $comment = $this->repository->create([
                'id_review' => $review->id_review,
                'id_user' => $user->id_user,
                'body' => $body,
                'id_parent' => null,
            ]);

            $mentionedUsers = [];
            if (!empty($mentions)) {
                $mentionedUsers = $this->processMentions($comment, $mentions);
            }

            $this->activityLogService->log(
                userId: $user->id_user,
                proyekId: $review->id_proyek,
                reviewId: $review->id_review,
                commentId: $comment->id_comment,
                action: 'create_comment',
                description: 'Created a new comment'
            );

            if (!empty($mentionedUsers)) {
                $this->activityLogService->log(
                    userId: $user->id_user,
                    proyekId: $review->id_proyek,
                    reviewId: $review->id_review,
                    commentId: $comment->id_comment,
                    action: 'mention_users',
                    description: 'Mentioned users in comment'
                );
                
                foreach ($mentionedUsers as $mentionedUser) {
                    event(new UserMentioned($comment, $mentionedUser));
                }
                $this->notificationService->notifyMentions($comment, $mentionedUsers);
            }

            event(new CommentCreated($comment, $review));
            $this->notificationService->notifyNewComment($comment, $review, $review->proyek);

            return $this->repository->findOrFail($comment->id_comment);
        });
    }

    public function createReply(ReviewComment $parent, User $user, array $data): ReviewComment
    {
        return DB::transaction(function () use ($parent, $user, $data) {
            $body = $data['body'];
            $mentions = $this->parseMentions($body);

            $reply = $this->repository->create([
                'id_review' => $parent->id_review,
                'id_user' => $user->id_user,
                'body' => $body,
                'id_parent' => $parent->id_comment,
            ]);

            $mentionedUsers = [];
            if (!empty($mentions)) {
                $mentionedUsers = $this->processMentions($reply, $mentions);
            }

            $this->activityLogService->log(
                userId: $user->id_user,
                proyekId: $parent->review->id_proyek ?? null,
                reviewId: $parent->id_review,
                commentId: $reply->id_comment,
                action: 'reply_comment',
                description: 'Replied to a comment'
            );

            if (!empty($mentionedUsers)) {
                foreach ($mentionedUsers as $mentionedUser) {
                    event(new UserMentioned($reply, $mentionedUser));
                }
                $this->notificationService->notifyMentions($reply, $mentionedUsers);
            }

            event(new CommentReplied($reply, $parent));
            if ($parent->review) {
                $this->notificationService->notifyReply($reply, $parent, $parent->review);
            }

            return $this->repository->findOrFail($reply->id_comment);
        });
    }

    public function updateComment(ReviewComment $comment, User $editor, string $newBody): ReviewComment
    {
        return DB::transaction(function () use ($comment, $editor, $newBody) {
            CommentEditHistory::create([
                'id_comment' => $comment->id_comment,
                'id_user' => $editor->id_user,
                'body_before' => $comment->body,
                'body_after' => $newBody,
                'edited_at' => now(),
            ]);

            $updated = $this->repository->update($comment, [
                'body' => $newBody,
                'is_edited' => true,
                'edited_at' => now(),
            ]);

            $this->activityLogService->log(
                userId: $editor->id_user,
                proyekId: $comment->review->id_proyek ?? null,
                reviewId: $comment->id_review,
                commentId: $comment->id_comment,
                action: 'edit_comment',
                description: 'Edited comment'
            );

            return $updated;
        });
    }

    public function deleteComment(ReviewComment $comment, User $actor): ReviewComment
    {
        return DB::transaction(function () use ($comment, $actor) {
            $deleted = $this->repository->softDelete($comment);

            $this->activityLogService->log(
                userId: $actor->id_user,
                proyekId: $comment->review->id_proyek ?? null,
                reviewId: $comment->id_review,
                commentId: $comment->id_comment,
                action: 'delete_comment',
                description: 'Deleted comment'
            );

            return $deleted;
        });
    }

    private function parseMentions(string $body): array
    {
        preg_match_all('/@(\w+)/', $body, $matches);
        return array_unique($matches[1]);
    }

    private function processMentions(ReviewComment $comment, array $usernames): array
    {
        $mentionedUsers = [];
        foreach ($usernames as $username) {
            $user = User::where('nama', $username)->first();
            if ($user) {
                CommentMention::create([
                    'id_comment' => $comment->id_comment,
                    'id_user' => $user->id_user,
                ]);
                $mentionedUsers[] = $user;
            }
        }
        return $mentionedUsers;
    }
}
