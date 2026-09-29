<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\User\RoleRequest;
use App\Http\Resources\User\RoleResource;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Endpoint CRUD untuk master data role.
 */
class RoleController extends ApiResourceController
{
    /** @var class-string<Role> */
    protected string $model = Role::class;

    /** @var class-string<RoleResource> */
    protected string $resource = RoleResource::class;

    /**
     * Menampilkan role secara paginated.
     */
    public function index(Request $request)
    {
        return $this->indexResource($request);
    }

    /**
     * Membuat role baru dari empat nama role yang diizinkan.
     */
    public function store(RoleRequest $request)
    {
        return $this->storeResource($request->validated());
    }

    /**
     * Menampilkan satu role berdasarkan primary key schema.
     */
    public function show(Role $role)
    {
        return $this->showResource($role);
    }

    /**
     * Memperbarui nama atau deskripsi role yang valid.
     */
    public function update(RoleRequest $request, Role $role)
    {
        return $this->updateResource($role, $request->validated());
    }

    /**
     * Menghapus role yang belum digunakan oleh user mana pun.
     *
     * Foreign key users.id_role bersifat restrict, sehingga role yang sedang
     * digunakan tidak boleh dihapus.
     */
    public function destroy(Role $role): JsonResponse|Response
    {
        if ($role->users()->exists()) {
            return response()->json([
                'message' => 'Role tidak dapat dihapus karena masih digunakan oleh user.',
            ], Response::HTTP_CONFLICT);
        }

        return $this->destroyResource($role);
    }
}
