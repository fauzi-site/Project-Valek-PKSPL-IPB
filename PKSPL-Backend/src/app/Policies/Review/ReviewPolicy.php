<?php

namespace App\Policies\Review;

use App\Models\Role;
use App\Models\User;
use App\Models\Review;

class ReviewPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Review $review): bool
    {
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
        return $roleName === Role::SUPER_ADMIN || $review->proyek->id_user === $user->id_user;
    }

    public function create(User $user): bool
    {
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
        return $roleName === Role::SUPER_ADMIN;
    }

    public function update(User $user, Review $review): bool
    {
        if ($review->status === 'Closed') {
            return false;
        }
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
        return $review->id_reviewer === $user->id_user || $roleName === Role::SUPER_ADMIN;
    }

    public function resolve(User $user, Review $review): bool
    {
        if ($review->status !== 'Open') {
            return false;
        }
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
        return $roleName === Role::SUPER_ADMIN;
    }

    public function reopen(User $user, Review $review): bool
    {
        if ($review->status !== 'Resolved') {
            return false;
        }
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
        return $roleName === Role::SUPER_ADMIN;
    }

    public function close(User $user, Review $review): bool
    {
        if ($review->status === 'Closed') {
            return false;
        }
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
        return $roleName === Role::SUPER_ADMIN;
    }
}
