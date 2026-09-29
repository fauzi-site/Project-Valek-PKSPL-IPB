<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Review;

use App\Http\Controllers\Controller;
use App\Http\Resources\Review\ActivityLogResource;
use App\Models\Role;
use App\Repositories\Contracts\ActivityLogRepositoryInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ActivityLogController extends Controller
{
    public function __construct(
        private readonly ActivityLogRepositoryInterface $logRepo
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : '';

        abort_if($roleName !== Role::SUPER_ADMIN, 403, 'Unauthorized.');

        $perPage = (int) $request->input('per_page', 15);
        $filters = $request->only(['action', 'id_proyek', 'id_review', 'id_user']);

        $logs = $this->logRepo->all($filters, $perPage);

        return ActivityLogResource::collection($logs);
    }
}
