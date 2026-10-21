<?php

namespace App\Http\Controllers\Api\V1\Project;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\Project\JenisTutupanLahanRequest;
use App\Http\Resources\Project\JenisTutupanLahanResource;
use App\Models\JenisTutupanLahan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class JenisTutupanLahanController extends ApiResourceController
{
    protected string $model = JenisTutupanLahan::class;

    protected string $resource = JenisTutupanLahanResource::class;

    public function index(Request $request)
    {
        return $this->indexResource($request);
    }

    public function store(JenisTutupanLahanRequest $request)
    {
        return $this->storeResource($request->validated());
    }

    public function show(JenisTutupanLahan $jenisTutupanLahan)
    {
        return $this->showResource($jenisTutupanLahan);
    }

    public function update(JenisTutupanLahanRequest $request, JenisTutupanLahan $jenisTutupanLahan)
    {
        return $this->updateResource($jenisTutupanLahan, $request->validated());
    }

    public function destroy(JenisTutupanLahan $jenisTutupanLahan)
    {
        return DB::transaction(function () use ($jenisTutupanLahan) {
            $id = $jenisTutupanLahan->id_jenis_tutupan_lahan;

            DB::table('provisioning_service')->where('id_jenis_tutupan_lahan', $id)->delete();
            DB::table('regulating_service')->where('id_jenis_tutupan_lahan', $id)->delete();
            DB::table('supporting_service')->where('id_jenis_tutupan_lahan', $id)->delete();
            DB::table('cultural_service')->where('id_jenis_tutupan_lahan', $id)->delete();
            DB::table('hasil_valuasi')->where('id_jenis_tutupan_lahan', $id)->delete();

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
                if (Schema::hasTable($tbl) && Schema::hasColumn($tbl, 'id_jenis_tutupan_lahan')) {
                    DB::table($tbl)->where('id_jenis_tutupan_lahan', $id)->delete();
                }
            }

            return $this->destroyResource($jenisTutupanLahan);
        });
    }
}
