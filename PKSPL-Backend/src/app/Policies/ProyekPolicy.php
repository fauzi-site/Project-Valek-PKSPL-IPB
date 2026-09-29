<?php

namespace App\Policies;

use App\Models\Proyek;
use App\Models\Role;
use App\Models\User;

class ProyekPolicy
{
    /**
     * Determine whether the user can view any projects.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the project.
     */
    public function view(User $user, Proyek $proyek): bool
    {
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
        if ($roleName === Role::PENELITI) {
            return (int) $proyek->id_user === (int) $user->id_user;
        }

        return true;
    }

    /**
     * Determine whether the user can create projects.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the project.
     */
    public function update(User $user, Proyek $proyek): bool
    {
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
        if ($roleName === Role::PENELITI) {
            return (int) $proyek->id_user === (int) $user->id_user;
        }

        return $roleName === Role::SUPER_ADMIN;
    }

    /**
     * Determine whether the user can delete the project.
     */
    public function delete(User $user, Proyek $proyek): bool
    {
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
        if ($roleName === Role::PENELITI) {
            return (int) $proyek->id_user === (int) $user->id_user;
        }

        return $roleName === Role::SUPER_ADMIN;
    }
}
