<?php

namespace App\Http\Controllers\Api\V1\Geography;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Resources\Geography\DesaKelurahanResource;
use App\Models\DesaKelurahan;
use Illuminate\Http\Request;

/**
 * Endpoint CRUD dan lookup untuk master data desa atau kelurahan.
 */
class DesaKelurahanController extends ApiResourceController
{
    protected string $model = DesaKelurahan::class;

    protected string $resource = DesaKelurahanResource::class;

    public function index(Request $request)
    {
        $query = DesaKelurahan::query();

        if ($request->has('id_kecamatan')) {
            $query->where('id_kecamatan', $request->input('id_kecamatan'));
        }

        if ($request->input('per_page') === 'all') {
            return $this->resource::collection($query->get());
        }

        return $this->resource::collection($query->paginate($request->input('per_page', 100)));
    }

    public function show(DesaKelurahan $desaKelurahan)
    {
        return $this->showResource($desaKelurahan);
    }
}
