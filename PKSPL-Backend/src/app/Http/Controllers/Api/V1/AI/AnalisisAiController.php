<?php

namespace App\Http\Controllers\Api\V1\AI;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\AI\AnalisisAiRequest;
use App\Http\Resources\AI\AnalisisAiResource;
use App\Models\AnalisisAi;
use Illuminate\Http\Request;

/** Menangani endpoint riwayat analisis AI. */
class AnalisisAiController extends ApiResourceController
{
    protected string $model = AnalisisAi::class;
    protected string $resource = AnalisisAiResource::class;

    // Meneruskan operasi baca dan simpan ke helper CRUD resource.
    public function index(Request $request) { return $this->indexResource($request); }
    public function store(AnalisisAiRequest $request) { return $this->storeResource($request->validated()); }
    public function show(AnalisisAi $analisisAi) { return $this->showResource($analisisAi); }
}
