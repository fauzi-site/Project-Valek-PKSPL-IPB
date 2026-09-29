<?php

namespace App\Services\Valuation;

use App\Services\Valuation\Exceptions\ValuationException;

/**
 * Land-cover ecosystem service valuation, per "Bahan Sistem Informasi
 * VALEK" (Tabel 1: Jasa ekosistem, jenis produk dan jasa, data yang
 * dibutuhkan dan formulasi perhitungan jasa ekosistem).
 *
 * Every formula method below mirrors one row of that table (variable
 * names match the source document) and returns a single Rupiah value per
 * hectare per year. `landCoverItemValue()` is the generalisation actually
 * used by almost every line item in the worked appendices (Lampiran 1-4):
 * Total Nilai Ekonomi = Produktivitas per ha x Harga per unit x Luas (ha).
 */
class EcosystemServiceValuationCalculator
{
    // === Provisioning ========================================================

    /**
     * Food Production. VPi = FPi x Pi.
     */
    public function foodProduction(float $productionPerHa, float $price): float
    {
        return $productionPerHa * $price;
    }

    /**
     * Raw Material. VRMi = RMPi x Pi.
     */
    public function rawMaterial(float $rawMaterialProductionPerHa, float $price): float
    {
        return $rawMaterialProductionPerHa * $price;
    }

    // === Regulating ===========================================================

    /**
     * Climate (carbon storage approach). VCi = CSi x PCi.
     */
    public function climateCarbon(float $carbonStoragePerHa, float $carbonPrice): float
    {
        return $carbonStoragePerHa * $carbonPrice;
    }

    /**
     * Erosion Control. VACi = Fi x BPi.
     */
    public function erosionControl(float $frequency, float $handlingCostPerEvent): float
    {
        return $frequency * $handlingCostPerEvent;
    }

    /**
     * Water Supply. VWSi = WSi x W.
     */
    public function waterSupply(float $waterSupplyPerHa, float $waterPricePerLiter): float
    {
        return $waterSupplyPerHa * $waterPricePerLiter;
    }

    // === Supporting ============================================================

    /**
     * Nutrient Cycling. VNCi = LAj x PNCi.
     */
    public function nutrientCycling(float $areaHa, float $replacementValuePerHa): float
    {
        return $areaHa * $replacementValuePerHa;
    }

    /**
     * Habitat. VHi = LAj x PHi.
     */
    public function habitat(float $areaHa, float $replacementValuePerHa): float
    {
        return $areaHa * $replacementValuePerHa;
    }

    // === Cultural ==============================================================

    /**
     * Recreation — travel-cost consumer surplus per visitor.
     * CSj = ((-beta0j/beta1j) - ACj) x VACj / 2, the area of the triangle
     * under the linear demand curve V = beta0 + beta1*TC between the
     * average cost paid (ACj) and the choke price (-beta0/beta1).
     */
    public function recreationConsumerSurplusPerVisitor(float $beta0, float $beta1, float $averageCost, float $averageVisits): float
    {
        if ($beta1 == 0.0) {
            throw new ValuationException('Recreation: koefisien beta1 bernilai 0, sehingga choke price (-beta0/beta1) tidak dapat dihitung.');
        }

        $chokePrice = -$beta0 / $beta1;

        return ($chokePrice - $averageCost) * $averageVisits / 2;
    }

    /**
     * Recreation — total site value. VWj = CSj x LWj x JKWj.
     */
    public function recreationSiteValue(float $consumerSurplus, float $recreationAreaHa, float $averageVisitFrequency): float
    {
        return $consumerSurplus * $recreationAreaHa * $averageVisitFrequency;
    }

    /**
     * Local Value. LVj = PMj x LSj.
     */
    public function localValue(float $communityValuationPerHa, float $areaHa): float
    {
        return $communityValuationPerHa * $areaHa;
    }

    /**
     * Research Location. VRLj = BRj x FRj.
     */
    public function researchLocation(float $researchCostPerYear, float $researchFrequencyPerYear): float
    {
        return $researchCostPerYear * $researchFrequencyPerYear;
    }

    // === Generic line-item / aggregation helpers ==============================

    /**
     * The formula actually used for almost every row of the worked
     * appendices, across all four service categories: value per hectare
     * (productivity x unit price) scaled by the land-cover area.
     */
    public function landCoverItemValue(float $productivityPerHa, float $unitPrice, float $areaHa): float
    {
        return $productivityPerHa * $unitPrice * $areaHa;
    }

    /**
     * Sums `total_value` across a flat list of items (each an array with a
     * `total_value` key and optionally a `service_category` key), grouped
     * by service_category, plus a grand total (TEV).
     *
     * @param  iterable<array{service_category: string, total_value: float|int|string}>  $items
     * @return array{by_category: array<string, float>, total: float}
     */
    public function summarize(iterable $items): array
    {
        $byCategory = [
            'provisioning' => 0.0,
            'regulating' => 0.0,
            'supporting' => 0.0,
            'cultural' => 0.0,
        ];

        foreach ($items as $item) {
            $category = $item['service_category'];
            if (! array_key_exists($category, $byCategory)) {
                throw new ValuationException("Ecosystem valuation: kategori jasa ekosistem tidak dikenal: '{$category}'.");
            }
            $byCategory[$category] += (float) $item['total_value'];
        }

        return [
            'by_category' => $byCategory,
            'total' => array_sum($byCategory),
        ];
    }
}
