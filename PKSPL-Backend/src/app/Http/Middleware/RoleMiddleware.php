<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware authorisasi berbasis role pengguna.
 */
class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  $roles
     * @return \Illuminate\Http\JsonResponse|mixed
     */
    public function handle(Request $request, Closure $next, string $roles)
    {
        $user = $request->user();
        $allowedRoles = array_map(fn (string $role): string => \App\Models\Role::normalize($role), array_map('trim', explode(',', $roles)));
        $userRoleName = optional($user->role)->nama_role;

        if (! $user || ! $userRoleName || ! in_array($userRoleName, $allowedRoles, true)) {
            return response()->json([
                'message' => 'Forbidden. You do not have permission to access this resource.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
