<?php

namespace App\Http\Controllers\Api\V1\Geography;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\Geography\KecamatanRequest;
use App\Http\Resources\Geography\KecamatanResource;
use App\Models\Kecamatan;
use Illuminate\Http\Request;

/**
 * Endpoint CRUD untuk master data kecamatan.
 */
class KecamatanController extends ApiResourceController
{
    /** @var class-string<Kecamatan> */
    protected string $model = Kecamatan::class;

    /** @var class-string<KecamatanResource> */
    protected string $resource = KecamatanResource::class;

    /**
     * Menampilkan daftar kecamatan secara paginated atau terfilter id_kabupaten_kota.
     */
    public function index(Request $request)
    {
        $query = Kecamatan::query();

        if ($request->has('id_kabupaten_kota')) {
            $query->where('id_kabupaten_kota', $request->input('id_kabupaten_kota'));
        }

        if ($request->input('per_page') === 'all') {
            return $this->resource::collection($query->get());
        }

        return $this->resource::collection($query->paginate($request->input('per_page', 100)));
    }

    /**
     * Membuat kecamatan baru.
     */
    public function store(KecamatanRequest $request)
    {
        return $this->storeResource($request->validated());
    }

    /**
     * Menampilkan satu kecamatan berdasarkan primary key schema.
     */
    public function show(Kecamatan $kecamatan)
    {
        return $this->showResource($kecamatan);
    }

    /**
     * Memperbarui data kecamatan yang ada.
     */
    public function update(KecamatanRequest $request, Kecamatan $kecamatan)
    {
        return $this->updateResource($kecamatan, $request->validated());
    }

    /**
     * Menghapus kecamatan yang tidak digunakan lagi.
     */
    public function destroy(Kecamatan $kecamatan)
    {
        return $this->destroyResource($kecamatan);
    }
}
