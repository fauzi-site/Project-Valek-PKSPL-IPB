<?php

namespace App\Policies\Review;

use App\Models\Role;
use App\Models\User;
use App\Models\ReviewComment;

class ReviewCommentPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, ReviewComment $comment): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
        return in_array($roleName, [Role::SUPER_ADMIN, Role::PENELITI], true);
    }

    public function update(User $user, ReviewComment $comment): bool
    {
        if ($comment->deleted_at !== null) {
            return false;
        }
        return $comment->id_user === $user->id_user;
    }

    public function delete(User $user, ReviewComment $comment): bool
    {
        if ($comment->deleted_at !== null) {
            return false;
        }
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
        return $comment->id_user === $user->id_user || $roleName === Role::SUPER_ADMIN;
    }

    public function reply(User $user, ReviewComment $comment): bool
    {
        if ($comment->deleted_at !== null) {
            return false;
        }
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
        return in_array($roleName, [Role::SUPER_ADMIN, Role::PENELITI], true);
    }
}
