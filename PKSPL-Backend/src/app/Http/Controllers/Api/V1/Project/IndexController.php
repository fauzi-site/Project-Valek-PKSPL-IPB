<?php

namespace App\Http\Controllers\Api\V1\Project;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\Project\IndexRequest;
use App\Http\Resources\Project\IndexResource;
use App\Models\Index;
use Illuminate\Http\Request;

class IndexController extends ApiResourceController
{
    protected string $model = Index::class;

    protected string $resource = IndexResource::class;

    public function index(Request $request)
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'id_proyek' => ['nullable', 'integer', 'exists:proyek,id_proyek'],
            'search' => ['nullable', 'string', 'max:100'],
            'q' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'max:50'],
        ]);

        $query = Index::query()->with('jenisTutupanLahan');
        if (! empty($validated['id_proyek'])) {
            $query->where('id_proyek', $validated['id_proyek']);
        }

        $search = $validated['search'] ?? $validated['q'] ?? null;
        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('kode_index', 'like', "%{$search}%")
                  ->orWhere('nama_index', 'like', "%{$search}%")
                  ->orWhere('deskripsi', 'like', "%{$search}%")
                  ->orWhereHas('jenisTutupanLahan', function ($qLandCover) use ($search) {
                      $qLandCover->where('nama_tutupan_lahan', 'like', "%{$search}%");
                  });
            });
        }

        if (! empty($validated['status']) && $validated['status'] !== 'ALL') {
            $query->where('status', $validated['status']);
        }

        return IndexResource::collection($query->paginate($validated['per_page'] ?? 10));
    }

    public function store(IndexRequest $request)
    {
        return $this->storeResource($request->validated());
    }

    public function show(Index $index)
    {
        $index->load('jenisTutupanLahan');
        return $this->showResource($index);
    }

    public function update(IndexRequest $request, Index $index)
    {
        return $this->updateResource($index, $request->validated());
    }

    public function destroy(Index $index)
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($index) {
            $landCoverIds = \Illuminate\Support\Facades\DB::table('jenis_tutupan_lahan')
                ->where('id_index', $index->id_index)
                ->pluck('id_jenis_tutupan_lahan')
                ->toArray();

            if (!empty($landCoverIds)) {
                \Illuminate\Support\Facades\DB::table('provisioning_service')->whereIn('id_jenis_tutupan_lahan', $landCoverIds)->delete();
                \Illuminate\Support\Facades\DB::table('regulating_service')->whereIn('id_jenis_tutupan_lahan', $landCoverIds)->delete();
                \Illuminate\Support\Facades\DB::table('supporting_service')->whereIn('id_jenis_tutupan_lahan', $landCoverIds)->delete();
                \Illuminate\Support\Facades\DB::table('cultural_service')->whereIn('id_jenis_tutupan_lahan', $landCoverIds)->delete();
                \Illuminate\Support\Facades\DB::table('hasil_valuasi')->whereIn('id_jenis_tutupan_lahan', $landCoverIds)->delete();

                $possibleValuationTables = [
                    'valuation_rows',
                    'valuation_custom_columns',
                    'area_service_configs',
                    'active_service_configs',
                    'selected_methods',
                    'valuation_row_values',
                    'valuation_calculated_results',
                ];
                foreach ($possibleValuationTables as $tbl) {
                    if (\Illuminate\Support\Facades\Schema::hasTable($tbl) && \Illuminate\Support\Facades\Schema::hasColumn($tbl, 'id_jenis_tutupan_lahan')) {
                        \Illuminate\Support\Facades\DB::table($tbl)->whereIn('id_jenis_tutupan_lahan', $landCoverIds)->delete();
                    }
                }

                \Illuminate\Support\Facades\DB::table('jenis_tutupan_lahan')->where('id_index', $index->id_index)->delete();
            }

            return $this->destroyResource($index);
        });
    }
}
