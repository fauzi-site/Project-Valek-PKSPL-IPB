<?php

namespace App\Services\Valuation;

use App\Models\HpmData;
use App\Models\Proyek;
use App\Services\Valuation\Exceptions\ValuationException;

/**
 * Fits the hedonic price function over a project's property records.
 *
 * The implicit price delta is a property of the whole sample, not of any one
 * transaction — a single row cannot tell you what the market pays for cleaner
 * air — which is why this reads every property and why MWTP is reported on
 * the module's index page rather than on an individual record.
 *
 * The regression and the MWTP identity live in
 * EconomicValuationCalculator::calculateHPM(); this class chooses the sample,
 * decides which controls are usable, and reports failures in plain language.
 */
class HedonicPriceEstimator
{
    public const MIN_PROPERTIES = 15;

    /** Attributes offered as the environmental variable E. */
    public const ENVIRONMENT_VARIABLES = [
        'air_quality_index' => 'Indeks Kualitas Udara (AQI)',
        'noise_level' => 'Tingkat Kebisingan (dB)',
        'distance_green_space' => 'Jarak ke RTH / Pantai (km)',
    ];

    /** Structural controls, included whenever they vary across the sample. */
    private const CONTROLS = ['land_area', 'building_area', 'building_age', 'bedrooms'];

    public function __construct(private readonly EconomicValuationCalculator $calculator = new EconomicValuationCalculator) {}

    public function estimate(Proyek $project, string $environmentVariable): array
    {
        if (! isset(self::ENVIRONMENT_VARIABLES[$environmentVariable])) {
            return $this->failure('Variabel lingkungan tidak dikenal.');
        }

        $rows = HpmData::where('id_proyek', $project->id_proyek)
            ->where('transaction_price', '>', 0)
            ->whereNotNull($environmentVariable)
            ->get();

        if ($rows->count() < self::MIN_PROPERTIES) {
            return $this->failure(sprintf(
                'Butuh minimal %d properti dengan harga dan %s terisi; saat ini %d.',
                self::MIN_PROPERTIES,
                self::ENVIRONMENT_VARIABLES[$environmentVariable],
                $rows->count(),
            ));
        }

        $environment = $rows->map(fn ($r) => (float) $r->{$environmentVariable})->all();
        if (! $this->hasVariation($environment)) {
            return $this->failure('Nilai variabel lingkungan identik pada seluruh properti, sehingga δ tidak dapat diestimasi.');
        }

        $columns = [];
        foreach (self::CONTROLS as $control) {
            $columns[$control] = $rows->map(fn ($r) => (float) ($r->{$control} ?? 0))->all();
        }

        $used = [];
        $dropped = [];
        foreach ($columns as $name => $values) {
            if ($this->hasVariation($values)) {
                $used[] = $name;
            } else {
                $dropped[] = $name;
            }
        }

        $observations = [];
        foreach ($rows->values() as $i => $row) {
            $controls = [];
            foreach ($used as $name) {
                $controls[$name] = $columns[$name][$i];
            }

            $observations[] = [
                'price' => (float) $row->transaction_price,
                'environment' => $environment[$i],
                'controls' => $controls,
            ];
        }

        $meanDeltaE = $rows->whereNotNull('delta_env_quality')->avg('delta_env_quality');
        $affectedUnits = $rows->whereNotNull('affected_units')->max('affected_units');

        try {
            $result = $this->calculator->calculateHPM([
                'observations' => $observations,
                'delta_e' => (float) ($meanDeltaE ?? 0),
                'affected_units' => (int) ($affectedUnits ?? 0),
            ]);
        } catch (ValuationException $e) {
            return $this->failure($e->getMessage());
        }

        return [
            'ok' => true,
            'message' => null,
            'environment_variable' => $environmentVariable,
            'environment_label' => self::ENVIRONMENT_VARIABLES[$environmentVariable],
            'delta' => $result['implicit_price'],
            'mean_price' => $result['mean_price'],
            'mwtp' => $result['mwtp'],
            'mean_delta_e' => $result['delta_e'],
            'affected_units' => (int) $result['affected_units'],
            'aggregate_value' => $result['aggregate_value'],
            'property_count' => $rows->count(),
            'r_squared' => $result['regression']['r_squared'],
            'coefficients' => array_merge(
                ['intercept' => $result['regression']['intercept']],
                $result['regression']['coefficients'],
            ),
            'dropped_no_variation' => $dropped,
        ];
    }

    private function failure(string $message): array
    {
        return [
            'ok' => false, 'message' => $message, 'environment_variable' => null,
            'environment_label' => null, 'delta' => 0.0, 'mean_price' => 0.0,
            'mwtp' => 0.0, 'mean_delta_e' => 0.0, 'affected_units' => 0,
            'aggregate_value' => 0.0, 'property_count' => 0, 'r_squared' => 0.0,
            'coefficients' => [], 'dropped_no_variation' => [],
        ];
    }

    private function hasVariation(array $values): bool
    {
        $first = $values[0] ?? null;
        foreach ($values as $value) {
            if (abs($value - $first) > 1e-9) {
                return true;
            }
        }

        return false;
    }
}
