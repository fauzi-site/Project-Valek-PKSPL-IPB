<?php

namespace App\Http\Controllers\Api\V1\Valuation;

use App\Http\Controllers\Api\V1\ApiResourceController;
use App\Http\Requests\Valuation\BenefitRequest;
use App\Http\Resources\Valuation\BenefitResource;
use App\Models\Benefit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class BenefitController extends ApiResourceController
{
    protected string $model = Benefit::class;
    protected string $resource = BenefitResource::class;

    public function index(Request $request): AnonymousResourceCollection
    {
        return $this->indexResource($request);
    }

    public function store(BenefitRequest $request): JsonResponse
    {
        return $this->storeResource($request->validated());
    }

    public function show(Benefit $benefit)
    {
        return $this->showResource($benefit);
    }

    public function update(BenefitRequest $request, Benefit $benefit)
    {
        return $this->updateResource($benefit, $request->validated());
    }

    public function destroy(Benefit $benefit): Response
    {
        return $this->destroyResource($benefit);
    }
}
