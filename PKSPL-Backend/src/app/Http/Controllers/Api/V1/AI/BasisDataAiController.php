<?php

namespace App\Http\Controllers\Api\V1\AI;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\AI\BasisDataAiRequest;
use App\Http\Resources\AI\BasisDataAiResource;
use App\Models\BasisDataAi;
use Illuminate\Http\Request;

/** Menangani endpoint CRUD basis data AI. */
class BasisDataAiController extends ApiResourceController
{
    protected string $model = BasisDataAi::class;
    protected string $resource = BasisDataAiResource::class;

    // Meneruskan operasi CRUD ke helper dengan request yang sudah tervalidasi.
    public function index(Request $request) { return $this->indexResource($request); }
    public function store(BasisDataAiRequest $request) { return $this->storeResource($request->validated()); }
    public function show(BasisDataAi $basisDataAi) { return $this->showResource($basisDataAi); }
    public function update(BasisDataAiRequest $request, BasisDataAi $basisDataAi) { return $this->updateResource($basisDataAi, $request->validated()); }
    public function destroy(BasisDataAi $basisDataAi) { return $this->destroyResource($basisDataAi); }
}
