<?php

namespace App\Providers;

use App\Policies\Review\AttachmentPolicy;
use App\Policies\Review\ReviewCommentPolicy;
use App\Policies\Review\ReviewPolicy;
use App\Repositories\ActivityLogRepository;
use App\Repositories\Contracts\ActivityLogRepositoryInterface;
use App\Repositories\Contracts\NotificationRepositoryInterface;
use App\Repositories\Contracts\ReviewCommentRepositoryInterface;
use App\Repositories\Contracts\ReviewRepositoryInterface;
use App\Repositories\NotificationRepository;
use App\Repositories\ReviewCommentRepository;
use App\Repositories\ReviewRepository;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Policy map for the Review & Discussion module.
     * Each policy is explicitly registered here so Laravel does not
     * rely on naming-convention discovery (which would not find
     * policies in sub-namespaces like App\Policies\Review\*).
     */
    protected $policies = [];

    /**
     * Register repository bindings for the Review & Discussion module.
     * All existing functionality is preserved; this block is purely additive.
     */
    public function register(): void
    {
        // Repository → Interface bindings (Review & Discussion module)
        $this->app->bind(ReviewRepositoryInterface::class, ReviewRepository::class);
        $this->app->bind(ReviewCommentRepositoryInterface::class, ReviewCommentRepository::class);
        $this->app->bind(ActivityLogRepositoryInterface::class, ActivityLogRepository::class);
        $this->app->bind(NotificationRepositoryInterface::class, NotificationRepository::class);
    }

    /**
     * Bootstrap any application services.
     * Register Review module policies via Gate::policy() so they work
     * regardless of namespace depth.
     */
    public function boot(): void
    {
        Gate::policy(\App\Models\Review::class, ReviewPolicy::class);
        Gate::policy(\App\Models\ReviewComment::class, ReviewCommentPolicy::class);
        Gate::policy(\App\Models\CommentAttachment::class, AttachmentPolicy::class);
        Gate::policy(\App\Models\Conversation::class, \App\Policies\ConversationPolicy::class);
        Gate::policy(\App\Models\ChatMessage::class, \App\Policies\ChatMessagePolicy::class);
    }
}

