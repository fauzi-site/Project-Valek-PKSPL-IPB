<?php

namespace App\Services\Valuation;

use App\Models\AbmData;
use App\Models\CvmAnalysis;
use App\Models\DuvData;
use App\Models\EopData;
use App\Models\Proyek;
use App\Models\TcmAnalysis;

/**
 * The module results a project can turn into a Benefit.
 *
 * Everything a user could otherwise retype by hand is offered here instead:
 * the description, the amount, the year and the ecosystem-service group. That
 * is not just convenience — a benefit created this way keeps a reference to
 * the record it came from, so the figure can be traced and re-checked later
 * rather than becoming an anonymous number in a table.
 *
 * Which amount an EOP record contributes depends on the project's
 * `eop_value_basis`: net of production cost by default, gross when the study
 * deliberately values output before costs.
 */
class ModuleBenefitSources
{
    /** Modules that can supply a benefit, in the order they are offered. */
    public const MODULES = [
        'eop' => 'EOP — Effect on Production',
        'duv' => 'DUV — Direct Use Value',
        'tcm' => 'TCM — Analisis Nilai Rekreasi',
        'cvm' => 'CVM — Analisis WTP',
        'abm' => 'ABM — Defensive Expenditure',
        'manual' => 'Input manual (tanpa modul)',
    ];

    /**
     * @return array<string, array<int, array<string, mixed>>> keyed by module
     */
    public function forProject(Proyek $project): array
    {
        return [
            'eop' => $this->eop($project),
            'duv' => $this->duv($project),
            'tcm' => $this->tcm($project),
            'cvm' => $this->cvm($project),
            'abm' => $this->abm($project),
        ];
    }

    /**
     * One specific module record, or null when it does not belong to the
     * project — which is what stops a benefit from being pointed at another
     * project's data.
     */
    public function find(Proyek $project, string $module, int $recordId): ?array
    {
        foreach ($this->forProject($project)[$module] ?? [] as $option) {
            if ((int) $option['id'] === $recordId) {
                return $option;
            }
        }

        return null;
    }

    private function eop(Proyek $project): array
    {
        $useNet = $project->projectValuationSetting->eop_value_basis !== 'gross';

        return EopData::where('id_proyek', $project->id_proyek)
            ->get()
            ->map(fn (EopData $row) => [
                'id' => $row->id_eop,
                'label' => "{$row->commodity} — EOP",
                'description' => 'Produksi '.$row->commodity,
                'value' => (float) ($useNet ? $row->net_value : ($row->quantity_after * $row->output_price)),
                'annual_value' => (float) ($useNet ? $row->net_value : ($row->quantity_after * $row->output_price)),
                'period_year' => null,
                'unit' => 'unit',
                'ecosystem_service_group' => 'provisioning',
                'category' => 'direct_use',
                'subcategory' => 'production',
                'method_used' => 'EOP',
                'basis' => $useNet ? 'net' : 'gross',
                'detail' => sprintf(
                    'ΔQ = %s, %s value',
                    number_format((float) ($row->quantity_after - $row->quantity_before), 2, ',', '.'),
                    $useNet ? 'net' : 'gross',
                ),
            ])
            ->values()
            ->all();
    }

    private function duv(Proyek $project): array
    {
        return DuvData::where('id_proyek', $project->id_proyek)
            ->get()
            ->map(fn (DuvData $row) => [
                'id' => $row->id_duv,
                'label' => "{$row->value_type} — {$row->description}",
                'description' => $row->description,
                'value' => (float) $row->net_value,
                'annual_value' => (float) $row->net_value,
                'period_year' => null,
                'unit' => $row->unit,
                'ecosystem_service_group' => 'provisioning',
                'category' => 'direct_use',
                'subcategory' => 'production',
                'method_used' => 'DUV',
                'detail' => 'Net DUV = (Q × P) − C',
            ])
            ->values()
            ->all();
    }

    private function tcm(Proyek $project): array
    {
        return TcmAnalysis::where('id_proyek', $project->id_proyek)
            ->get()
            ->map(fn (TcmAnalysis $row) => [
                'id' => $row->id_tcm_analysis,
                'label' => "TCM Analysis {$row->id_tcm_analysis}",
                'description' => 'Nilai rekreasi',
                'value' => (float) $row->total_recreation_value,
                'annual_value' => (float) $row->total_recreation_value,
                'period_year' => null,
                'unit' => 'Rp/tahun',
                'ecosystem_service_group' => 'cultural',
                'category' => 'direct_use',
                'subcategory' => 'recreation',
                'method_used' => 'TCM',
                'detail' => 'CS × total pengunjung',
            ])
            ->values()
            ->all();
    }

    private function cvm(Proyek $project): array
    {
        return CvmAnalysis::where('id_proyek', $project->id_proyek)
            ->get()
            ->map(fn (CvmAnalysis $row) => [
                'id' => $row->id_cvm_analysis,
                'label' => "CVM Analysis {$row->id_cvm_analysis}",
                'description' => 'WTP masyarakat',
                'value' => (float) $row->total_wtp,
                'annual_value' => (float) $row->total_wtp,
                'period_year' => null,
                'unit' => 'Rp/tahun',
                'ecosystem_service_group' => 'cultural',
                'category' => 'non_use',
                'subcategory' => 'existence_value',
                'method_used' => 'CVM',
                'detail' => 'Mean WTP × populasi',
            ])
            ->values()
            ->all();
    }

    private function abm(Proyek $project): array
    {
        return AbmData::where('id_proyek', $project->id_proyek)
            ->get()
            ->map(fn (AbmData $row) => [
                'id' => $row->id_abm,
                'label' => "ABM — {$row->risk_type}",
                'description' => 'Kerugian dihindari — '.$row->risk_type,
                'value' => (float) $row->total_value,
                'annual_value' => (float) $row->total_value,
                'period_year' => null,
                'unit' => 'Rp/tahun',
                'ecosystem_service_group' => 'regulating',
                'category' => 'indirect_use',
                'subcategory' => 'water_regulation',
                'method_used' => 'ABM',
                'detail' => 'Biaya defensif + pendapatan hilang',
            ])
            ->values()
            ->all();
    }
}
