<?php

namespace App\Http\Controllers\Api\V1\Valuation;

use App\Http\Controllers\Api\V1\ApiResourceController;
use App\Http\Requests\Valuation\CostRequest;
use App\Http\Resources\Valuation\CostResource;
use App\Models\Cost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class CostController extends ApiResourceController
{
    protected string $model = Cost::class;
    protected string $resource = CostResource::class;

    public function index(Request $request): AnonymousResourceCollection
    {
        return $this->indexResource($request);
    }

    public function store(CostRequest $request): JsonResponse
    {
        return $this->storeResource($request->validated());
    }

    public function show(Cost $cost)
    {
        return $this->showResource($cost);
    }

    public function update(CostRequest $request, Cost $cost)
    {
        return $this->updateResource($cost, $request->validated());
    }

    public function destroy(Cost $cost): Response
    {
        return $this->destroyResource($cost);
    }
}
