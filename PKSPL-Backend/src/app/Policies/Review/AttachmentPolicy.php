<?php

namespace App\Policies\Review;

use App\Models\Role;
use App\Models\User;
use App\Models\CommentAttachment;

class AttachmentPolicy
{
    public function create(User $user): bool
    {
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
        return in_array($roleName, [Role::SUPER_ADMIN, Role::PENELITI], true);
    }

    public function delete(User $user, CommentAttachment $attachment): bool
    {
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
        return $attachment->comment->id_user === $user->id_user || $roleName === Role::SUPER_ADMIN;
    }
}
