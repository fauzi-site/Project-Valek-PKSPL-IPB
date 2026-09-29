<?php

namespace App\Http\Controllers\Api\V1\Project;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\Project\AreaTerdampakRequest;
use App\Http\Resources\Project\AreaTerdampakResource;
use App\Models\AreaTerdampak;
use Illuminate\Http\Request;

/** Menangani endpoint CRUD area terdampak. */
class AreaTerdampakController extends ApiResourceController
{
    protected string $model = AreaTerdampak::class;
    protected string $resource = AreaTerdampakResource::class;

    // Meneruskan operasi CRUD ke helper dengan request yang sudah tervalidasi.
    public function index(Request $request) { return $this->indexResource($request); }
    public function store(AreaTerdampakRequest $request) { return $this->storeResource($request->validated()); }
    public function show(AreaTerdampak $areaTerdampak) { return $this->showResource($areaTerdampak); }
    public function update(AreaTerdampakRequest $request, AreaTerdampak $areaTerdampak) { return $this->updateResource($areaTerdampak, $request->validated()); }
    public function destroy(AreaTerdampak $areaTerdampak) { return $this->destroyResource($areaTerdampak); }
}
