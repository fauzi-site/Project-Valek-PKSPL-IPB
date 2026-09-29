<?php

namespace App\Http\Controllers\Api\V1\Geography;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\Geography\ProvinsiRequest;
use App\Http\Resources\Geography\ProvinsiResource;
use App\Models\Provinsi;
use Illuminate\Http\Request;

/**
 * Endpoint CRUD untuk master data provinsi.
 */
class ProvinsiController extends ApiResourceController
{
    /** @var class-string<Provinsi> */
    protected string $model = Provinsi::class;

    /** @var class-string<ProvinsiResource> */
    protected string $resource = ProvinsiResource::class;

    /**
     * Menampilkan daftar provinsi secara paginated.
     */
    public function index(Request $request)
    {
        return $this->indexResource($request);
    }

    /**
     * Membuat provinsi baru.
     */
    public function store(ProvinsiRequest $request)
    {
        return $this->storeResource($request->validated());
    }

    /**
     * Menampilkan satu provinsi berdasarkan primary key schema.
     */
    public function show(Provinsi $provinsi)
    {
        return $this->showResource($provinsi);
    }

    /**
     * Memperbarui data provinsi yang ada.
     */
    public function update(ProvinsiRequest $request, Provinsi $provinsi)
    {
        return $this->updateResource($provinsi, $request->validated());
    }

    /**
     * Menghapus provinsi yang tidak digunakan lagi.
     */
    public function destroy(Provinsi $provinsi)
    {
        return $this->destroyResource($provinsi);
    }
}
