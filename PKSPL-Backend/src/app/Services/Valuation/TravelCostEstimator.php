<?php

namespace App\Services\Valuation;

use App\Models\Proyek;
use App\Models\TcmData;
use App\Services\Valuation\Exceptions\ValuationException;

/**
 * Turns a project's TCM respondents into the demand-model coefficients the
 * analysis form needs.
 *
 * This class does no arithmetic of its own: it selects and shapes the sample,
 * then hands it to EconomicValuationCalculator::calculateTCM(), which owns
 * the model and the consumer-surplus identity. Its job is the part the
 * calculator deliberately does not do — deciding which respondents and which
 * covariates are usable, and turning a ValuationException into a message an
 * analyst can act on.
 */
class TravelCostEstimator
{
    /**
     * The estimate needs more respondents than parameters (intercept, travel cost and each covariate
     * used); below that the regression cannot be solved. Below SAMPLE_COMFORT it can be solved but is
     * not reliable, which is reported as a warning instead of refusing.
     */
    public const MIN_RESPONDENTS = 3;
    public const SAMPLE_COMFORT = 30;

    private const EDUCATION_YEARS = [
        'tidak sekolah' => 0, 'sd' => 6, 'sederajat sd' => 6,
        'smp' => 9, 'sltp' => 9, 'mts' => 9,
        'sma' => 12, 'smk' => 12, 'slta' => 12, 'ma' => 12,
        'd1' => 13, 'd2' => 14, 'd3' => 15, 'diploma' => 15,
        's1' => 16, 'sarjana' => 16, 'd4' => 16,
        's2' => 18, 'magister' => 18,
        's3' => 22, 'doktor' => 22,
    ];

    public function __construct(private readonly EconomicValuationCalculator $calculator = new EconomicValuationCalculator) {}

    /**
     * @param  string  $model  poisson | negative_binomial | ols
     * @param  array<int, string>  $covariates  any of: income, age, education, substitute, trip_duration
     * @param  float|null  $totalAnnualVisits  visits to the whole site per year; when given, the site's total value is returned too
     * @param  string|null  $lokasi  restrict to one location's respondents; '' selects those saved without one
     */
    public function estimate(Proyek $project, string $model, array $covariates = [], ?float $totalAnnualVisits = null, ?string $lokasi = null): array
    {
        $rows = TcmData::where('id_proyek', $project->id_proyek)
            ->whereNotNull('annual_visits')
            ->when($lokasi !== null, fn ($q) => $lokasi === '' ? $q->whereNull('lokasi') : $q->where('lokasi', $lokasi))
            ->get();

        if ($rows->count() < self::MIN_RESPONDENTS) {
            return $this->failure(sprintf(
                'Butuh minimal %d responden TCM untuk estimasi; saat ini %d.',
                self::MIN_RESPONDENTS,
                $rows->count(),
            ));
        }
        $n = $rows->count();

        $travelCosts = $rows->map(fn ($r) => (float) $r->total_travel_cost)->all();

        if (! $this->hasVariation($travelCosts)) {
            return $this->failure('Biaya perjalanan seluruh responden identik, sehingga β₁ tidak dapat diestimasi.');
        }

        // A covariate that never varies is collinear with the intercept and
        // would make the information matrix singular, so it is dropped here
        // rather than left to fail deeper inside the solver.
        $columns = [];
        foreach ($covariates as $name) {
            $columns[$name] = $rows->map(fn ($r) => $this->covariateValue($r, $name))->all();
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

        // Intercept + travel cost + the covariates that vary.
        $parameters = 2 + count($used);
        if ($n <= $parameters) {
            return $this->failure(sprintf(
                'Model memakai %d parameter (konstanta, biaya perjalanan%s) sehingga butuh minimal %d responden; saat ini %d.',
                $parameters,
                $used ? ', '.implode(', ', $used) : '',
                $parameters + 1,
                $n,
            ));
        }

        $warnings = [];
        if ($n < self::SAMPLE_COMFORT) {
            $warnings[] = sprintf('Sampel kecil (%d responden; disarankan minimal %d). Hasil dapat berubah banyak bila data bertambah.', $n, self::SAMPLE_COMFORT);
        }
        if ($n - $parameters < 5) {
            $warnings[] = sprintf('Derajat kebebasan hanya %d (responden %d dikurangi %d parameter). R², koefisien, dan surplus konsumen tidak dapat diandalkan.', $n - $parameters, $n, $parameters);
        }
        if ($dropped) {
            $warnings[] = 'Variabel kontrol tanpa variasi dikeluarkan: '.implode(', ', $dropped).'. Lengkapi datanya agar pengaruhnya dikendalikan.';
        }

        $observations = [];
        foreach ($rows->values() as $i => $row) {
            $socio = [];
            foreach ($used as $name) {
                $socio[$name] = $columns[$name][$i];
            }

            $observations[] = [
                'visits' => (float) ($row->annual_visits ?? $row->visit_frequency ?? 1),
                'travel_cost' => (float) $row->total_travel_cost,
                'socio_economic' => $socio,
            ];
        }

        try {
            // total_annual_visits only scales total_cs. Without a visitor
            // count, 1 keeps the calculator's guard satisfied without
            // affecting any coefficient or the per-visit surplus.
            $result = $this->calculator->calculateTCM([
                'observations' => $observations,
                'total_annual_visits' => $totalAnnualVisits ?? 1,
                'model' => $model,
            ]);
        } catch (ValuationException $e) {
            return $this->failure($e->getMessage());
        }

        $regression = $result['regression'];

        $coefficients = ['beta_0' => $regression['intercept']];
        foreach ($regression['coefficients'] as $name => $value) {
            $coefficients[$name === 'travel_cost' ? 'beta_1' : "coef_{$name}"] = $value;
        }

        return [
            'ok' => true,
            'message' => null,
            'coefficients' => $coefficients,
            'cs_per_visit' => $result['cs_per_visit'] ?? null,
            'mean_sk_per_respondent' => $result['mean_sk_per_respondent'] ?? null,
            'total_annual_visits' => $totalAnnualVisits,
            'total_cs' => $totalAnnualVisits !== null ? $result['total_cs'] : null,
            'respondent_count' => count($observations),
            'mean_travel_cost' => array_sum($travelCosts) / count($travelCosts),
            'warnings' => $warnings,
            'converged' => $regression['converged'] ?? true,
            'log_likelihood' => $regression['log_likelihood'] ?? null,
            'dispersion_alpha' => $regression['dispersion'] ?? null,
            'diagnostics' => [
                'variables' => array_merge(['travel_cost'], $used),
                'dropped_no_variation' => $dropped,
                'iterations' => $regression['iterations'] ?? null,
                'model' => $result['model'],
                'r_squared' => $regression['r_squared'] ?? null,
            ],
        ];
    }

    private function covariateValue(TcmData $row, string $name): float
    {
        return match ($name) {
            'income' => (float) ($row->income ?? $row->socioeconomic_data['income'] ?? $row->socioeconomic_data['household_income'] ?? 0),
            'age' => (float) ($row->age ?? $row->socioeconomic_data['age'] ?? 0),
            'education' => $this->educationYears($row->education ?? $row->education_level ?? $row->socioeconomic_data['education_level'] ?? $row->socioeconomic_data['education'] ?? null),
            'trip_duration' => (float) ($row->trip_duration ?? $row->socioeconomic_data['trip_duration'] ?? 0),
            'substitute' => (float) ($row->substitute_site ?? $row->substitute_site_cost ?? $row->socioeconomic_data['substitute_site'] ?? $row->socioeconomic_data['substitute_site_cost'] ?? 0.0),
            default => 0.0,
        };
    }

    private function failure(string $message): array
    {
        return [
            'ok' => false,
            'message' => $message,
            'coefficients' => [],
            'respondent_count' => 0,
            'mean_travel_cost' => 0.0,
            'converged' => false,
            'log_likelihood' => null,
            'dispersion_alpha' => null,
            'diagnostics' => [],
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

    /** Maps an education label to years of schooling; numeric input passes through. */
    private function educationYears(?string $education): float
    {
        if ($education === null || trim($education) === '') {
            return 0.0;
        }

        if (is_numeric($education)) {
            return (float) $education;
        }

        $key = strtolower(trim($education));

        foreach (self::EDUCATION_YEARS as $label => $years) {
            if (str_contains($key, $label)) {
                return (float) $years;
            }
        }

        return 0.0;
    }
}
