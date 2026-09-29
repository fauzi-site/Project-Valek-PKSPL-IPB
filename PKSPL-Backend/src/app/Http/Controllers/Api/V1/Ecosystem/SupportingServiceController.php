<?php

namespace App\Http\Controllers\Api\V1\Ecosystem;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\Ecosystem\SupportingServiceRequest;
use App\Http\Resources\Ecosystem\SupportingServiceResource;
use App\Models\SupportingService;
use Illuminate\Http\Request;

/** Menangani endpoint CRUD jasa pendukung. */
class SupportingServiceController extends ApiResourceController
{
    protected string $model = SupportingService::class;
    protected string $resource = SupportingServiceResource::class;

    // Meneruskan operasi CRUD ke helper dengan request yang sudah tervalidasi.
    public function index(Request $request) { return $this->indexResourceWithRelations($request, ['jenisTutupanLahan.index.proyek', 'provinsi', 'kabupatenKota', 'kecamatan', 'desaKelurahan'], 'jenisTutupanLahan.index'); }
    public function store(SupportingServiceRequest $request) { $payload = $request->validated(); $payload['kategori_tev'] = $payload['kategori_tev'] ?? 'OV'; return $this->storeResource($payload); }
    public function show(SupportingService $supportingService) { return $this->showResource($supportingService->load(['provinsi', 'kabupatenKota', 'kecamatan', 'desaKelurahan'])); }
    public function update(SupportingServiceRequest $request, SupportingService $supportingService) { $payload = $request->validated(); $payload['kategori_tev'] = $payload['kategori_tev'] ?? 'OV'; return $this->updateResource($supportingService, $payload); }
    public function destroy(SupportingService $supportingService) { return $this->destroyResource($supportingService); }
}
