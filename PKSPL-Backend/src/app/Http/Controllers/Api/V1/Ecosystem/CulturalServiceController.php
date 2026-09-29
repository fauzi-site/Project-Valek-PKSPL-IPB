<?php

namespace App\Http\Controllers\Api\V1\Ecosystem;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\Ecosystem\CulturalServiceRequest;
use App\Http\Resources\Ecosystem\CulturalServiceResource;
use App\Models\CulturalService;
use Illuminate\Http\Request;

/** Menangani endpoint CRUD jasa budaya. */
class CulturalServiceController extends ApiResourceController
{
    protected string $model = CulturalService::class;
    protected string $resource = CulturalServiceResource::class;

    // Meneruskan operasi CRUD ke helper dengan request yang sudah tervalidasi.
    public function index(Request $request) { return $this->indexResourceWithRelations($request, ['jenisTutupanLahan.index.proyek', 'provinsi', 'kabupatenKota', 'kecamatan', 'desaKelurahan'], 'jenisTutupanLahan.index'); }
    public function store(CulturalServiceRequest $request) { $payload = $request->validated(); $payload['kategori_tev'] = $payload['kategori_tev'] ?? 'EV'; return $this->storeResource($payload); }
    public function show(CulturalService $culturalService) { return $this->showResource($culturalService->load(['provinsi', 'kabupatenKota', 'kecamatan', 'desaKelurahan'])); }
    public function update(CulturalServiceRequest $request, CulturalService $culturalService) { $payload = $request->validated(); $payload['kategori_tev'] = $payload['kategori_tev'] ?? 'EV'; return $this->updateResource($culturalService, $payload); }
    public function destroy(CulturalService $culturalService) { return $this->destroyResource($culturalService); }
}
