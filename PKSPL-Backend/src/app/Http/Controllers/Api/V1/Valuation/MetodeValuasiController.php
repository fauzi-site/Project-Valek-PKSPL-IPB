<?php

namespace App\Http\Controllers\Api\V1\Valuation;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\Valuation\MetodeValuasiRequest;
use App\Http\Resources\Valuation\MetodeValuasiResource;
use App\Models\MetodeValuasi;
use Illuminate\Http\Request;

/** Menangani endpoint CRUD master metode valuasi. */
class MetodeValuasiController extends ApiResourceController
{
    protected string $model = MetodeValuasi::class;
    protected string $resource = MetodeValuasiResource::class;

    // Meneruskan operasi CRUD ke helper dengan request yang sudah tervalidasi.
    public function index(Request $request) { return $this->indexResource($request); }
    public function store(MetodeValuasiRequest $request) { return $this->storeResource($request->validated()); }
    public function show(MetodeValuasi $metodeValuasi) { return $this->showResource($metodeValuasi); }
    public function update(MetodeValuasiRequest $request, MetodeValuasi $metodeValuasi) { return $this->updateResource($metodeValuasi, $request->validated()); }
    public function destroy(MetodeValuasi $metodeValuasi) { return $this->destroyResource($metodeValuasi); }
}
