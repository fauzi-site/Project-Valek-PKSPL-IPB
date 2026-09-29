<?php

namespace App\Http\Controllers\Api\V1\Reference;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\Reference\DatasetReferensiRequest;
use App\Http\Resources\Reference\DatasetReferensiResource;
use App\Models\DatasetReferensi;
use Illuminate\Http\Request;

/** Menangani endpoint CRUD dataset referensi. */
class DatasetReferensiController extends ApiResourceController
{
    protected string $model = DatasetReferensi::class;
    protected string $resource = DatasetReferensiResource::class;

    // Meneruskan operasi CRUD ke helper dengan request yang sudah tervalidasi.
    public function index(Request $request) { return $this->indexResource($request); }
    public function store(DatasetReferensiRequest $request) { return $this->storeResource($request->validated()); }
    public function show(DatasetReferensi $datasetReferensi) { return $this->showResource($datasetReferensi); }
    public function update(DatasetReferensiRequest $request, DatasetReferensi $datasetReferensi) { return $this->updateResource($datasetReferensi, $request->validated()); }
    public function destroy(DatasetReferensi $datasetReferensi) { return $this->destroyResource($datasetReferensi); }
}
