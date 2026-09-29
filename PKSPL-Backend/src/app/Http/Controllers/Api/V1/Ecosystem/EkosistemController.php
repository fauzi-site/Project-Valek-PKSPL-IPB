<?php

namespace App\Http\Controllers\Api\V1\Ecosystem;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\Ecosystem\EkosistemRequest;
use App\Http\Resources\Ecosystem\EkosistemResource;
use App\Models\Ekosistem;
use Illuminate\Http\Request;

/** Menangani endpoint CRUD master ekosistem. */
class EkosistemController extends ApiResourceController
{
    protected string $model = Ekosistem::class;
    protected string $resource = EkosistemResource::class;

    // Meneruskan operasi CRUD ke helper dengan request yang sudah tervalidasi.
    public function index(Request $request) { return $this->indexResource($request); }
    public function store(EkosistemRequest $request) { return $this->storeResource($request->validated()); }
    public function show(Ekosistem $ekosistem) { return $this->showResource($ekosistem); }
    public function update(EkosistemRequest $request, Ekosistem $ekosistem) { return $this->updateResource($ekosistem, $request->validated()); }
    public function destroy(Ekosistem $ekosistem) { return $this->destroyResource($ekosistem); }
}
