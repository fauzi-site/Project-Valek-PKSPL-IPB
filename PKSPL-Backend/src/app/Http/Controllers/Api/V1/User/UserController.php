<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\User\UserRequest;
use App\Http\Resources\User\UserResource;
use App\Models\User;
use Illuminate\Http\Request;

/** Menangani endpoint CRUD pengguna. */
class UserController extends ApiResourceController
{
    protected string $model = User::class;
    protected string $resource = UserResource::class;

    // Menampilkan daftar pengguna beserta relasi role untuk kebutuhan panel admin.
    public function index(Request $request)
    {
        $validated = $request->validate(['per_page' => ['nullable', 'integer', 'min:1', 'max:100']]);

        return $this->resource::collection(User::query()->with('role')->paginate($validated['per_page'] ?? 15));
    }

    public function store(UserRequest $request)
    {
        $user = User::query()->create($request->validated());

        $user->load('role');

        return (new $this->resource($user))->response()->setStatusCode(201);
    }

    public function show(User $user)
    {
        $user->load('role');

        return $this->showResource($user);
    }

    public function update(UserRequest $request, User $user)
    {
        $user->update($request->validated());
        $user->refresh();
        $user->load('role');

        return new $this->resource($user);
    }

    public function destroy(User $user)
    {
        $user->delete();

        return response()->noContent();
    }
}
