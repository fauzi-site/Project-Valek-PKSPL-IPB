<?php

namespace App\Http\Controllers\Api\V1\Valuation;

use App\Http\Controllers\Api\V1\ApiResourceController;
use App\Http\Requests\Valuation\ValuationModuleRequest;
use App\Http\Resources\Valuation\ValuationModuleResource;
use App\Models\ValuationModule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class ValuationModuleController extends ApiResourceController
{
    protected string $model = ValuationModule::class;
    protected string $resource = ValuationModuleResource::class;

    public function index(Request $request): AnonymousResourceCollection
    {
        return $this->indexResource($request);
    }

    public function store(ValuationModuleRequest $request): JsonResponse
    {
        return $this->storeResource($request->validated());
    }

    public function show(ValuationModule $module)
    {
        return $this->showResource($module);
    }

    public function update(ValuationModuleRequest $request, ValuationModule $module)
    {
        return $this->updateResource($module, $request->validated());
    }

    public function destroy(ValuationModule $module): Response
    {
        return $this->destroyResource($module);
    }
}
