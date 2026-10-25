<?php

namespace App\Http\Controllers\Api\V1\Valuation;

use App\Http\Controllers\Controller;
use App\Models\CvmAnalysis;
use App\Models\CvmData;
use App\Models\Proyek;
use App\Models\Role;
use App\Models\TcmAnalysis;
use App\Models\TcmData;
use App\Services\Valuation\ContingentValuationEstimator;
use App\Services\Valuation\TravelCostEstimator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SurveyValuationController extends Controller
{
    public function __construct(
        private readonly TravelCostEstimator $tcmEstimator,
        private readonly ContingentValuationEstimator $cvmEstimator
    ) {}

    private function checkAccess(Request $request, Proyek $proyek): ?JsonResponse
    {
        $user = $request->user() ?? $request->user('sanctum') ?? auth('sanctum')->user();
        if ($user) {
            $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
            if ($roleName === Role::PENELITI && (int) $proyek->id_user !== (int) $user->id_user) {
                return response()->json(['message' => 'Anda tidak memiliki akses ke data survei proyek ini.'], 403);
            }
        }
        return null;
    }

    /**
     * Get all TCM respondents for a project with summary stats.
     */
    public function getTcmData(Request $request, Proyek $proyek): JsonResponse
    {
        if ($denied = $this->checkAccess($request, $proyek)) return $denied;

        $rows = TcmData::where('id_proyek', $proyek->id_proyek)
            ->orderBy('id_tcm', 'asc')
            ->get();

        $count = $rows->count();
        $totalCost = (float) $rows->sum('total_travel_cost');
        $avgCost = $count > 0 ? $totalCost / $count : 0;
        $totalVisits = (int) $rows->sum('annual_visits');
        $avgVisits = $count > 0 ? $totalVisits / $count : 0;

        return response()->json([
            'data' => $rows,
            'summary' => [
                'total_respondents' => $count,
                'total_travel_cost' => $totalCost,
                'average_travel_cost' => round($avgCost, 2),
                'total_annual_visits' => $totalVisits,
                'average_annual_visits' => round($avgVisits, 2),
            ],
            'message' => 'Data responden TCM berhasil diambil.',
        ]);
    }

    /**
     * Store or update a TCM respondent.
     */
    public function saveTcmRespondent(Request $request, Proyek $proyek): JsonResponse
    {
        if ($denied = $this->checkAccess($request, $proyek)) return $denied;

        $validated = $request->validate([
            'id_tcm' => ['nullable', 'integer'],
            'respondent_id' => ['required', 'string', 'max:100'],
            'annual_visits' => ['required', 'integer', 'min:1'],
            'total_travel_cost' => ['required', 'numeric', 'min:0'],
            'distance' => ['nullable', 'numeric', 'min:0'],
            'time_cost' => ['nullable', 'numeric', 'min:0'],
            'socioeconomic_data' => ['nullable', 'array'],
        ]);

        $data = [
            'id_proyek' => $proyek->id_proyek,
            'respondent_id' => $validated['respondent_id'],
            'annual_visits' => $validated['annual_visits'],
            'total_travel_cost' => $validated['total_travel_cost'],
            'distance' => $validated['distance'] ?? null,
            'time_cost' => $validated['time_cost'] ?? null,
            'socioeconomic_data' => $validated['socioeconomic_data'] ?? null,
        ];

        if (!empty($validated['id_tcm'])) {
            $row = TcmData::where('id_proyek', $proyek->id_proyek)->findOrFail($validated['id_tcm']);
            $row->update($data);
        } else {
            $row = TcmData::updateOrCreate(
                ['id_proyek' => $proyek->id_proyek, 'respondent_id' => $validated['respondent_id']],
                $data
            );
        }

        return response()->json([
            'data' => $row,
            'message' => 'Responden TCM berhasil disimpan.',
        ]);
    }

    /**
     * Batch import TCM respondents.
     */
    public function batchTcmRespondents(Request $request, Proyek $proyek): JsonResponse
    {
        if ($denied = $this->checkAccess($request, $proyek)) return $denied;

        $validated = $request->validate([
            'respondents' => ['required', 'array', 'min:1'],
            'respondents.*.respondent_id' => ['required', 'string'],
            'respondents.*.annual_visits' => ['required', 'integer', 'min:1'],
            'respondents.*.total_travel_cost' => ['required', 'numeric', 'min:0'],
            'respondents.*.distance' => ['nullable', 'numeric'],
            'respondents.*.socioeconomic_data' => ['nullable', 'array'],
        ]);

        $saved = [];
        foreach ($validated['respondents'] as $r) {
            $saved[] = TcmData::updateOrCreate(
                ['id_proyek' => $proyek->id_proyek, 'respondent_id' => $r['respondent_id']],
                [
                    'id_proyek' => $proyek->id_proyek,
                    'respondent_id' => $r['respondent_id'],
                    'annual_visits' => $r['annual_visits'],
                    'total_travel_cost' => $r['total_travel_cost'],
                    'distance' => $r['distance'] ?? null,
                    'time_cost' => $r['time_cost'] ?? null,
                    'socioeconomic_data' => $r['socioeconomic_data'] ?? null,
                ]
            );
        }

        return response()->json([
            'data' => $saved,
            'count' => count($saved),
            'message' => 'Batch impor responden TCM berhasil.',
        ]);
    }

    /**
     * Delete a TCM respondent.
     */
    public function deleteTcmRespondent(Request $request, Proyek $proyek, int $id_tcm): JsonResponse
    {
        if ($denied = $this->checkAccess($request, $proyek)) return $denied;

        $row = TcmData::where('id_proyek', $proyek->id_proyek)->findOrFail($id_tcm);
        $row->delete();

        return response()->json(['message' => 'Responden TCM berhasil dihapus.']);
    }

    /**
     * Run or retrieve TCM econometric analysis (demand curve & consumer surplus).
     */
    public function getTcmAnalysis(Request $request, Proyek $proyek): JsonResponse
    {
        if ($denied = $this->checkAccess($request, $proyek)) return $denied;

        $model = $request->query('model', 'poisson');
        $covariates = $request->has('covariates')
            ? array_values(array_filter(explode(',', $request->query('covariates'))))
            : ['income', 'age'];

        $estimate = $this->tcmEstimator->estimate($proyek, $model, $covariates);

        // Fetch or create persistent record
        $latestAnalysis = TcmAnalysis::where('id_proyek', $proyek->id_proyek)->latest()->first();

        if ($estimate['ok']) {
            $analysis = TcmAnalysis::updateOrCreate(
                ['id_proyek' => $proyek->id_proyek, 'model_type' => $model],
                [
                    'dependent_variable' => 'annual_visits',
                    'independent_variables' => $covariates,
                    'coefficients' => $estimate['coefficients'],
                    'consumer_surplus_per_visit' => $estimate['cs_per_visit'] ?? null,
                    'r_squared' => $estimate['diagnostics']['r_squared'] ?? null,
                    'n' => $estimate['respondent_count'],
                    'notes' => 'Estimasi TCM model ' . strtoupper($model) . ' Pulau Pramuka',
                ]
            );
            $latestAnalysis = $analysis;
        }

        return response()->json([
            'estimate' => $estimate,
            'persisted_analysis' => $latestAnalysis,
            'message' => 'Analisis TCM berhasil dijalankan.',
        ]);
    }

    /**
     * Get all CVM respondents for a project with summary stats.
     */
    public function getCvmData(Request $request, Proyek $proyek): JsonResponse
    {
        if ($denied = $this->checkAccess($request, $proyek)) return $denied;

        $rows = CvmData::where('id_proyek', $proyek->id_proyek)
            ->orderBy('id_cvm', 'asc')
            ->get();

        $count = $rows->count();
        $yesRows = $rows->filter(fn ($r) => (bool) $r->willingness_to_pay);
        $yesCount = $yesRows->count();
        $noCount = $count - $yesCount;

        $validWtpRows = $rows->filter(fn ($r) => !empty($r->wtp_amount) && (float) $r->wtp_amount > 0);
        $totalWtp = (float) $validWtpRows->sum('wtp_amount');
        $avgWtp = $validWtpRows->count() > 0 ? $totalWtp / $validWtpRows->count() : 0;

        $bids = $rows->pluck('bid_amount')->map(fn ($b) => (float) $b)->filter(fn ($b) => $b > 0);
        $avgBid = $bids->count() > 0 ? $bids->sum() / $bids->count() : 0;

        return response()->json([
            'data' => $rows,
            'summary' => [
                'total_respondents' => $count,
                'yes_count' => $yesCount,
                'no_count' => $noCount,
                'acceptance_rate' => $count > 0 ? round(($yesCount / $count) * 100, 1) : 0,
                'average_bid' => round($avgBid, 2),
                'average_stated_wtp' => round($avgWtp, 2),
                'total_stated_wtp' => $totalWtp,
            ],
            'message' => 'Data responden CVM berhasil diambil.',
        ]);
    }

    /**
     * Store or update a CVM respondent.
     */
    public function saveCvmRespondent(Request $request, Proyek $proyek): JsonResponse
    {
        if ($denied = $this->checkAccess($request, $proyek)) return $denied;

        $validated = $request->validate([
            'id_cvm' => ['nullable', 'integer'],
            'respondent_id' => ['required', 'string', 'max:100'],
            'elicitation_format' => ['required', 'string', 'max:100'],
            'bid_amount' => ['required', 'numeric', 'min:0'],
            'willingness_to_pay' => ['required', 'boolean'],
            'wtp_amount' => ['nullable', 'numeric', 'min:0'],
            'socioeconomic_data' => ['nullable', 'array'],
        ]);

        $data = [
            'id_proyek' => $proyek->id_proyek,
            'respondent_id' => $validated['respondent_id'],
            'elicitation_format' => $validated['elicitation_format'],
            'bid_amount' => $validated['bid_amount'],
            'willingness_to_pay' => $validated['willingness_to_pay'],
            'wtp_amount' => $validated['wtp_amount'] ?? null,
            'socioeconomic_data' => $validated['socioeconomic_data'] ?? null,
        ];

        if (!empty($validated['id_cvm'])) {
            $row = CvmData::where('id_proyek', $proyek->id_proyek)->findOrFail($validated['id_cvm']);
            $row->update($data);
        } else {
            $row = CvmData::updateOrCreate(
                ['id_proyek' => $proyek->id_proyek, 'respondent_id' => $validated['respondent_id']],
                $data
            );
        }

        return response()->json([
            'data' => $row,
            'message' => 'Responden CVM berhasil disimpan.',
        ]);
    }

    /**
     * Batch import CVM respondents.
     */
    public function batchCvmRespondents(Request $request, Proyek $proyek): JsonResponse
    {
        if ($denied = $this->checkAccess($request, $proyek)) return $denied;

        $validated = $request->validate([
            'respondents' => ['required', 'array', 'min:1'],
            'respondents.*.respondent_id' => ['required', 'string'],
            'respondents.*.elicitation_format' => ['required', 'string'],
            'respondents.*.bid_amount' => ['required', 'numeric'],
            'respondents.*.willingness_to_pay' => ['required', 'boolean'],
            'respondents.*.wtp_amount' => ['nullable', 'numeric'],
            'respondents.*.socioeconomic_data' => ['nullable', 'array'],
        ]);

        $saved = [];
        foreach ($validated['respondents'] as $r) {
            $saved[] = CvmData::updateOrCreate(
                ['id_proyek' => $proyek->id_proyek, 'respondent_id' => $r['respondent_id']],
                [
                    'id_proyek' => $proyek->id_proyek,
                    'respondent_id' => $r['respondent_id'],
                    'elicitation_format' => $r['elicitation_format'],
                    'bid_amount' => $r['bid_amount'],
                    'willingness_to_pay' => $r['willingness_to_pay'],
                    'wtp_amount' => $r['wtp_amount'] ?? null,
                    'socioeconomic_data' => $r['socioeconomic_data'] ?? null,
                ]
            );
        }

        return response()->json([
            'data' => $saved,
            'count' => count($saved),
            'message' => 'Batch impor responden CVM berhasil.',
        ]);
    }

    /**
     * Delete a CVM respondent.
     */
    public function deleteCvmRespondent(Request $request, Proyek $proyek, int $id_cvm): JsonResponse
    {
        if ($denied = $this->checkAccess($request, $proyek)) return $denied;

        $row = CvmData::where('id_proyek', $proyek->id_proyek)->findOrFail($id_cvm);
        $row->delete();

        return response()->json(['message' => 'Responden CVM berhasil dihapus.']);
    }

    /**
     * Run or retrieve CVM econometric analysis (Logit/Probit dichotomous choice).
     */
    public function getCvmAnalysis(Request $request, Proyek $proyek): JsonResponse
    {
        if ($denied = $this->checkAccess($request, $proyek)) return $denied;

        $model = $request->query('model', 'logit');
        $covariates = $request->has('covariates')
            ? array_values(array_filter(explode(',', $request->query('covariates'))))
            : ['income'];

        $estimate = $this->cvmEstimator->estimate($proyek, $model, $covariates);

        $latestAnalysis = CvmAnalysis::where('id_proyek', $proyek->id_proyek)->latest()->first();

        if ($estimate['ok']) {
            $analysis = CvmAnalysis::updateOrCreate(
                ['id_proyek' => $proyek->id_proyek, 'analysis_type' => $model],
                [
                    'population' => (int) $request->query('population', 25000),
                    'independent_variables' => array_merge(['bid'], $covariates),
                    'coefficients' => $estimate['coefficients'],
                    'mean_wtp' => $estimate['ewtp'] ?? null,
                    'median_wtp' => $estimate['ewtp'] ?? null,
                    'n' => $estimate['respondent_count'],
                    'notes' => 'Estimasi CVM model ' . strtoupper($model) . ' Pulau Pramuka (Single Bounded)',
                ]
            );
            $latestAnalysis = $analysis;
        }

        return response()->json([
            'estimate' => $estimate,
            'persisted_analysis' => $latestAnalysis,
            'message' => 'Analisis CVM berhasil dijalankan.',
        ]);
    }
}
