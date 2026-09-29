<?php

namespace App\Http\Controllers\Api\V1\Ecosystem;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\Ecosystem\ProvisioningServiceRequest;
use App\Http\Resources\Ecosystem\ProvisioningServiceResource;
use App\Models\ProvisioningService;
use Illuminate\Http\Request;

/** Menangani endpoint CRUD jasa penyediaan. */
class ProvisioningServiceController extends ApiResourceController
{
    protected string $model = ProvisioningService::class;
    protected string $resource = ProvisioningServiceResource::class;

    // Meneruskan operasi CRUD ke helper dengan request yang sudah tervalidasi.
    public function index(Request $request) { return $this->indexResourceWithRelations($request, ['jenisTutupanLahan.index.proyek', 'provinsi', 'kabupatenKota', 'kecamatan', 'desaKelurahan'], 'jenisTutupanLahan.index'); }
    public function store(ProvisioningServiceRequest $request) { $payload = $request->validated(); $payload['kategori_tev'] = $payload['kategori_tev'] ?? 'DUV'; return $this->storeResource($payload); }
    public function show(ProvisioningService $provisioningService) { return $this->showResource($provisioningService->load(['provinsi', 'kabupatenKota', 'kecamatan', 'desaKelurahan'])); }
    public function update(ProvisioningServiceRequest $request, ProvisioningService $provisioningService) { $payload = $request->validated(); $payload['kategori_tev'] = $payload['kategori_tev'] ?? 'DUV'; return $this->updateResource($provisioningService, $payload); }
    public function destroy(ProvisioningService $provisioningService) { return $this->destroyResource($provisioningService); }
}
