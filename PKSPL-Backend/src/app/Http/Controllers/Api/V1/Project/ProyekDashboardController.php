<?php

namespace App\Http\Controllers\Api\V1\Project;

use App\Http\Resources\Project\ProyekResource;
use App\Models\Proyek;
use App\Models\Role;
use App\Services\Valuation\ProjectDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProyekDashboardController
{
    public function __invoke(Request $request, Proyek $proyek, ProjectDashboardService $dashboardService): JsonResponse
    {
        $user = $request->user() ?? $request->user('sanctum') ?? auth('sanctum')->user();
        if ($user) {
            $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
            if ($roleName === Role::PENELITI && (int) $proyek->id_user !== (int) $user->id_user) {
                return response()->json(['message' => 'Anda tidak memiliki akses ke proyek ini.'], 403);
            }
        }

        $dashboard = $dashboardService->build($proyek);

        return response()->json([
            'proyek' => new ProyekResource($dashboard['proyek']),
            'statistik' => $dashboard['statistik'],
            'indexes' => $dashboard['indexes'],
            'nilai' => $dashboard['nilai'],
        ]);
    }
}
