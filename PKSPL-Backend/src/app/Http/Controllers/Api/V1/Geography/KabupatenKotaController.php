<?php

namespace App\Http\Controllers\Api\V1\Geography;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\Geography\KabupatenKotaRequest;
use App\Http\Resources\Geography\KabupatenKotaResource;
use App\Models\KabupatenKota;
use Illuminate\Http\Request;

/**
 * Endpoint CRUD untuk master data kabupaten atau kota.
 */
class KabupatenKotaController extends ApiResourceController
{
    /** @var class-string<KabupatenKota> */
    protected string $model = KabupatenKota::class;

    /** @var class-string<KabupatenKotaResource> */
    protected string $resource = KabupatenKotaResource::class;

    /**
     * Menampilkan daftar kabupaten atau kota secara paginated atau terfilter id_provinsi.
     */
    public function index(Request $request)
    {
        $query = KabupatenKota::query();

        if ($request->has('id_provinsi')) {
            $query->where('id_provinsi', $request->input('id_provinsi'));
        }

        if ($request->input('per_page') === 'all') {
            return $this->resource::collection($query->get());
        }

        return $this->resource::collection($query->paginate($request->input('per_page', 100)));
    }

    /**
     * Membuat kabupaten atau kota baru.
     */
    public function store(KabupatenKotaRequest $request)
    {
        return $this->storeResource($request->validated());
    }

    /**
     * Menampilkan satu kabupaten atau kota berdasarkan primary key schema.
     */
    public function show(KabupatenKota $kabupatenKota)
    {
        return $this->showResource($kabupatenKota);
    }

    /**
     * Memperbarui data kabupaten atau kota yang ada.
     */
    public function update(KabupatenKotaRequest $request, KabupatenKota $kabupatenKota)
    {
        return $this->updateResource($kabupatenKota, $request->validated());
    }

    /**
     * Menghapus kabupaten atau kota yang tidak digunakan lagi.
     */
    public function destroy(KabupatenKota $kabupatenKota)
    {
        return $this->destroyResource($kabupatenKota);
    }
}
