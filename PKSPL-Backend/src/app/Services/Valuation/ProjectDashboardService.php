<?php

namespace App\Services\Valuation;

use App\Models\Proyek;

/** Builds the project-level valuation rollup from live service records. */
class ProjectDashboardService
{
    public function __construct(private readonly TevCalculator $tevCalculator) {}

    public function build(Proyek $proyek): array
    {
        $proyek->load('indexes.jenisTutupanLahan');
        $totals = $this->emptyTotals();
        $indexSummaries = [];
        $landCoverCount = 0;
        $totalArea = '0';

        foreach ($proyek->indexes as $index) {
            $indexTotals = $this->emptyTotals();

            foreach ($index->jenisTutupanLahan as $landCover) {
                $landCoverCount++;
                $totalArea = FormulaHelper::add($totalArea, (string) ($landCover->luas ?? 0));

                try {
                    $landCoverTotals = $this->tevCalculator->calculate($landCover->id_jenis_tutupan_lahan);
                } catch (\RuntimeException) {
                    $landCoverTotals = $this->emptyTotals();
                }

                $indexTotals = $this->addTotals($indexTotals, $landCoverTotals);
            }

            $totals = $this->addTotals($totals, $indexTotals);
            $indexSummaries[] = [
                'id_index' => $index->id_index,
                'nama_index' => $index->nama_index,
                'kode_index' => $index->kode_index,
                'luas' => $index->luas,
                'satuan_luas' => $index->satuan_luas,
                'jumlah_jenis_tutupan_lahan' => $index->jenisTutupanLahan->count(),
                'nilai' => $indexTotals,
            ];
        }

        return [
            'proyek' => $proyek,
            'statistik' => [
                'jumlah_index' => $proyek->indexes->count(),
                'jumlah_jenis_tutupan_lahan' => $landCoverCount,
                'luas_total' => $proyek->luas ?? $totalArea,
                'satuan_luas' => $proyek->satuan_luas,
            ],
            'indexes' => $indexSummaries,
            'nilai' => $totals,
        ];
    }

    private function emptyTotals(): array
    {
        return [
            'direct_use_value' => '0',
            'indirect_use_value' => '0',
            'option_value' => '0',
            'existence_value' => '0',
            'bequest_value' => '0',
            'tev' => '0',
        ];
    }

    private function addTotals(array $left, array $right): array
    {
        foreach (array_keys($left) as $key) {
            $left[$key] = FormulaHelper::add((string) $left[$key], (string) ($right[$key] ?? 0));
        }

        return $left;
    }
}
