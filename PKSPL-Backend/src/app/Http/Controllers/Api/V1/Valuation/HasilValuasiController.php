<?php

namespace App\Http\Controllers\Api\V1\Valuation;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\Valuation\HasilValuasiRequest;
use App\Http\Resources\Valuation\HasilValuasiResource;
use App\Models\HasilValuasi;
use App\Services\Valuation\TevCalculator;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Menangani endpoint CRUD hasil valuasi. */
class HasilValuasiController extends ApiResourceController
{
    protected string $model = HasilValuasi::class;

    protected string $resource = HasilValuasiResource::class;

    public function __construct(private readonly TevCalculator $tevCalculator) {}

    // Meneruskan operasi CRUD ke helper dengan request yang sudah tervalidasi.
    public function index(Request $request)
    {
        return $this->indexResource($request);
    }

    public function store(HasilValuasiRequest $request)
    {
        $payload = $request->validated();

        try {
            $result = $this->tevCalculator->calculate((int) $payload['id_jenis_tutupan_lahan']);
        } catch (\RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], Response::HTTP_NOT_FOUND);
        }

        $payload['direct_use_value'] = $result['direct_use_value'];
        $payload['indirect_use_value'] = $result['indirect_use_value'];
        $payload['option_value'] = $result['option_value'];
        $payload['existence_value'] = $result['existence_value'];
        $payload['bequest_value'] = $result['bequest_value'];
        $payload['tev'] = $result['tev'];
        $payload['keterangan'] = $payload['keterangan'] ?? 'Hasil perhitungan TEV';

        return $this->storeResource($payload);
    }

    public function show(HasilValuasi $hasilValuasi)
    {
        return $this->showResource($hasilValuasi);
    }

    public function update(HasilValuasiRequest $request, HasilValuasi $hasilValuasi)
    {
        $payload = $request->validated();

        if (array_key_exists('id_jenis_tutupan_lahan', $payload)) {
            try {
                $result = $this->tevCalculator->calculate((int) $payload['id_jenis_tutupan_lahan']);
            } catch (\RuntimeException $exception) {
                return response()->json(['message' => $exception->getMessage()], Response::HTTP_NOT_FOUND);
            }

            $payload = array_merge($payload, $result);
            unset($payload['detail']);
        }

        return $this->updateResource($hasilValuasi, $payload);
    }

    public function destroy(HasilValuasi $hasilValuasi)
    {
        return $this->destroyResource($hasilValuasi);
    }
}
