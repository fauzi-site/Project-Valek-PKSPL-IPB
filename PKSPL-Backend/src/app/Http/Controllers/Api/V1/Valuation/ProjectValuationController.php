<?php

namespace App\Http\Controllers\Api\V1\Valuation;

use App\Http\Controllers\Controller;
use App\Models\Proyek;
use App\Models\Role;
use App\Services\Valuation\EconomicValuationCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectValuationController extends Controller
{
    public function __construct(
        private readonly EconomicValuationCalculator $calculator
    ) {}

    public function getResults(Request $request, Proyek $proyek): JsonResponse
    {
        $user = $request->user() ?? $request->user('sanctum') ?? auth('sanctum')->user();
        if ($user) {
            $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
            if ($roleName === Role::PENELITI && (int) $proyek->id_user !== (int) $user->id_user) {
                return response()->json(['message' => 'Anda tidak memiliki akses ke valuasi proyek ini.'], 403);
            }
        }

        $result = $this->calculator->calculateForProject($proyek);
        return response()->json(['data' => $result]);
    }

    public function getAnalytics(Request $request, Proyek $proyek): JsonResponse
    {
        $user = $request->user() ?? $request->user('sanctum') ?? auth('sanctum')->user();
        if ($user) {
            $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
            if ($roleName === Role::PENELITI && (int) $proyek->id_user !== (int) $user->id_user) {
                return response()->json(['message' => 'Anda tidak memiliki akses ke analitik proyek ini.'], 403);
            }
        }

        $serviceIds = ['provisioning', 'regulating', 'supporting', 'cultural'];
        $analyticsByService = [];
        $totalTev = 0;

        foreach ($serviceIds as $sId) {
            $landCovers = \App\Models\JenisTutupanLahan::query()
                ->whereHas('index', fn ($q) => $q->where('id_proyek', $proyek->id_proyek))
                ->where(function ($q) use ($sId) {
                    $q->whereHas('valuationRows', fn ($vr) => $vr->where('service_id', $sId));
                    if ($sId === 'provisioning') $q->orWhereHas('provisioningServices');
                    if ($sId === 'regulating') $q->orWhereHas('regulatingServices');
                    if ($sId === 'supporting') $q->orWhereHas('supportingServices');
                    if ($sId === 'cultural') $q->orWhereHas('culturalServices');
                })
                ->with(['valuationRows' => fn ($vr) => $vr->where('service_id', $sId)->orderBy('row_order')])
                ->get();

            $serviceTotal = 0;
            $serviceItemsCount = 0;
            $areasList = [];

            foreach ($landCovers as $lc) {
                $rows = $lc->valuationRows;
                $rowCount = $rows->count();
                $areaSubtotal = (float) $rows->sum('total_nilai');

                if ($rowCount === 0) {
                    $legacyRecords = match ($sId) {
                        'provisioning' => $lc->provisioningServices()->get(),
                        'regulating' => $lc->regulatingServices()->get(),
                        'supporting' => $lc->supportingServices()->get(),
                        'cultural' => $lc->culturalServices()->get(),
                        default => collect(),
                    };
                    $rowCount = $legacyRecords->count();
                    $areaSubtotal = (float) $legacyRecords->sum('total_nilai');
                }

                if ($rowCount > 0) {
                    $serviceTotal += $areaSubtotal;
                    $serviceItemsCount += $rowCount;
                    $areasList[] = [
                        'id_jenis_tutupan_lahan' => $lc->id_jenis_tutupan_lahan,
                        'nama_tutupan_lahan' => $lc->nama_tutupan_lahan,
                        'luas' => (float) ($lc->luas ?? 0),
                        'item_count' => $rowCount,
                        'subtotal' => $areaSubtotal,
                        'items' => $rows->map(fn ($r) => [
                            'id' => $r->id,
                            'label' => $r->row_data['item'] ?? $r->row_data['komoditas'] ?? $r->row_data['spesies'] ?? ('Baris ' . ($r->row_order + 1)),
                            'value' => (float) $r->total_nilai,
                            'row' => $r->row_data,
                        ]),
                    ];
                }
            }

            $totalTev += $serviceTotal;
            $analyticsByService[$sId] = [
                'service_id' => $sId,
                'total_nominal' => $serviceTotal,
                'total_items' => $serviceItemsCount,
                'areas_count' => count($areasList),
                'areas' => $areasList,
            ];
        }

        return response()->json([
            'data' => [
                'id_proyek' => $proyek->id_proyek,
                'kode_proyek' => $proyek->kode_proyek,
                'nama_proyek' => $proyek->nama_proyek,
                'total_tev' => $totalTev,
                'services' => $analyticsByService,
            ],
            'message' => 'Data analitik valuasi proyek berhasil diambil.',
        ]);
    }
}
