<?php

namespace App\Services\Valuation;

use App\Models\JenisTutupanLahan;
use Illuminate\Support\Collection;

class TevCalculator
{
    public function __construct(
        private readonly ProvisioningCalculator $provisioningCalculator,
        private readonly RegulatingCalculator $regulatingCalculator,
        private readonly SupportingCalculator $supportingCalculator,
        private readonly CulturalCalculator $culturalCalculator,
    ) {
    }

    public function calculate(int $idJenisTutupanLahan): array
    {
        $jenisTutupanLahan = JenisTutupanLahan::query()->find($idJenisTutupanLahan);

        if ($jenisTutupanLahan === null) {
            throw new \RuntimeException('Jenis tutupan lahan tidak ditemukan.');
        }

        $provisioning = $jenisTutupanLahan->provisioningServices()->get();
        $regulating = $jenisTutupanLahan->regulatingServices()->get();
        $supporting = $jenisTutupanLahan->supportingServices()->get();
        $cultural = $jenisTutupanLahan->culturalServices()->get();
        $valRows = $jenisTutupanLahan->valuationRows()->get();

        if ($provisioning->isEmpty() && $regulating->isEmpty() && $supporting->isEmpty() && $cultural->isEmpty() && $valRows->isEmpty()) {
            throw new \RuntimeException('Jenis tutupan lahan tidak memiliki data valuasi.');
        }

        $provisioningResult = $this->calculateProvisioning($provisioning);
        $regulatingResult = $this->calculateRegulating($regulating);
        $supportingResult = $this->calculateSupporting($supporting);
        $culturalResult = $this->calculateCultural($cultural);

        // If valuationRows exist, add their totals into the respective categories
        if ($valRows->isNotEmpty()) {
            foreach ($valRows as $vRow) {
                $val = (float) $vRow->total_nilai;
                $sId = $vRow->service_id;
                if ($sId === 'provisioning') {
                    $provisioningResult['total'] = FormulaHelper::add((string) ($provisioningResult['total'] ?? 0), (string) $val);
                } elseif ($sId === 'regulating') {
                    $regulatingResult['total'] = FormulaHelper::add((string) ($regulatingResult['total'] ?? 0), (string) $val);
                } elseif ($sId === 'supporting') {
                    $supportingResult['total'] = FormulaHelper::add((string) ($supportingResult['total'] ?? 0), (string) $val);
                } elseif ($sId === 'cultural') {
                    $culturalResult['total'] = FormulaHelper::add((string) ($culturalResult['total'] ?? 0), (string) $val);
                }
            }
        }

        $detailItems = array_merge(
            $this->normalizeDetailItems($provisioningResult['detail'] ?? []),
            $this->normalizeDetailItems($regulatingResult['detail'] ?? []),
            $this->normalizeDetailItems($supportingResult['detail'] ?? []),
            $this->normalizeDetailItems($culturalResult['detail'] ?? []),
        );

        $directUseValue = $this->sumCategoryValues($detailItems, 'DUV');
        $indirectUseValue = $this->sumCategoryValues($detailItems, 'IUV');
        $optionValue = $this->sumCategoryValues($detailItems, 'OV');
        $existenceValue = $this->sumCategoryValues($detailItems, 'EV');
        $bequestValue = $this->sumCategoryValues($detailItems, 'BV');
        $tev = $this->sumTotals($directUseValue, $indirectUseValue, $optionValue, $existenceValue, $bequestValue);

        return [
            'direct_use_value' => $directUseValue,
            'indirect_use_value' => $indirectUseValue,
            'option_value' => $optionValue,
            'existence_value' => $existenceValue,
            'bequest_value' => $bequestValue,
            'tev' => $tev,
            'detail' => [
                'provisioning' => $provisioningResult,
                'regulating' => $regulatingResult,
                'supporting' => $supportingResult,
                'cultural' => $culturalResult,
                'grouped' => $this->groupByCategory($provisioning, $regulating, $supporting, $cultural),
            ],
        ];
    }

    private function groupByCategory(Collection $provisioning, Collection $regulating, Collection $supporting, Collection $cultural): array
    {
        $grouped = [];

        foreach (['DUV', 'IUV', 'OV', 'EV', 'BV'] as $category) {
            $grouped[$category] = [];
        }

        foreach ($provisioning as $record) {
            $grouped[$record->kategori_tev ?? 'DUV'][] = $record;
        }

        foreach ($regulating as $record) {
            $grouped[$record->kategori_tev ?? 'IUV'][] = $record;
        }

        foreach ($supporting as $record) {
            $grouped[$record->kategori_tev ?? 'OV'][] = $record;
        }

        foreach ($cultural as $record) {
            $grouped[$record->kategori_tev ?? 'EV'][] = $record;
        }

        return $grouped;
    }

    private function calculateProvisioning(Collection $records): array
    {
        return $this->provisioningCalculator->calculate($records);
    }

    private function calculateRegulating(Collection $records): array
    {
        return $this->regulatingCalculator->calculate($records);
    }

    private function calculateSupporting(Collection $records): array
    {
        return $this->supportingCalculator->calculate($records);
    }

    private function calculateCultural(Collection $records): array
    {
        return $this->culturalCalculator->calculate($records);
    }

    private function normalizeDetailItems(array $items): array
    {
        return array_map(function (array $item): array {
            return [
                'kategori_tev' => $item['kategori_tev'] ?? 'DUV',
                'nilai' => (string) ($item['nilai'] ?? '0'),
            ];
        }, $items);
    }

    private function sumCategoryValues(array $records, string $category): string
    {
        $values = collect($records)
            ->filter(fn (array $record): bool => ($record['kategori_tev'] ?? 'DUV') === $category)
            ->pluck('nilai');

        return FormulaHelper::sumCollection($values);
    }

    private function sumTotals(string $directUseValue, string $indirectUseValue, string $optionValue, string $existenceValue, string $bequestValue): string
    {
        return FormulaHelper::add(
            FormulaHelper::add($directUseValue, $indirectUseValue),
            FormulaHelper::add(
                FormulaHelper::add($optionValue, $existenceValue),
                $bequestValue,
            ),
        );
    }
}
