<?php

namespace App\Services\Valuation;

use App\Models\CvmData;
use App\Models\Proyek;
use App\Services\Valuation\Exceptions\ValuationException;

/**
 * Turns a project's dichotomous-choice CVM respondents into the logit/probit
 * coefficients the analysis form needs.
 *
 * Like the travel-cost estimator, this class only selects and shapes the
 * sample — EconomicValuationCalculator::calculateCVMDichotomous() owns the
 * model and the EWTP identity.
 *
 * One sign convention is worth stating plainly. The spec writes the
 * acceptance probability as P(Ya) = F(alpha - beta*Ai + ...), so a positive
 * beta means a higher bid reduces acceptance. The regression returns the
 * coefficient as it enters the linear predictor, which is the negative of
 * that beta. The flip happens once, here, so everything downstream can read
 * beta with the meaning the formula gives it.
 */
class ContingentValuationEstimator
{
    public const MIN_RESPONDENTS = 10;

    private const EDUCATION_YEARS = [
        'tidak sekolah' => 0, 'sd' => 6, 'smp' => 9, 'sltp' => 9,
        'sma' => 12, 'smk' => 12, 'slta' => 12,
        'd1' => 13, 'd2' => 14, 'd3' => 15, 'diploma' => 15,
        's1' => 16, 'sarjana' => 16, 'd4' => 16,
        's2' => 18, 'magister' => 18, 's3' => 22, 'doktor' => 22,
    ];

    public function __construct(private readonly EconomicValuationCalculator $calculator = new EconomicValuationCalculator) {}

    /**
     * @param  string  $model  logit | probit
     * @param  array<int, string>  $covariates  any of: income, education, age
     */
    public function estimate(Proyek $project, string $model, array $covariates = []): array
    {
        $rows = CvmData::where('id_proyek', $project->id_proyek)
            ->where('question_method', 'dichotomous_choice')
            ->whereNotNull('bid_amount')
            ->get();

        if ($rows->count() < self::MIN_RESPONDENTS) {
            return $this->failure(sprintf(
                'Butuh minimal %d responden dichotomous choice dengan nilai tawaran; saat ini %d.',
                self::MIN_RESPONDENTS,
                $rows->count(),
            ));
        }

        $yesCount = $rows->where('willing_to_pay', true)->count();
        if ($yesCount === 0 || $yesCount === $rows->count()) {
            return $this->failure('Seluruh responden menjawab sama (semua ya atau semua tidak), sehingga model tidak dapat diestimasi.');
        }

        $bids = $rows->map(fn ($r) => (float) $r->bid_amount)->all();
        if (! $this->hasVariation($bids)) {
            return $this->failure('Seluruh nilai tawaran identik, sehingga koefisien β tidak dapat diestimasi.');
        }

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

        $observations = [];
        foreach ($rows->values() as $i => $row) {
            $socio = [];
            foreach ($used as $name) {
                $socio[$name] = $columns[$name][$i];
            }

            $observations[] = [
                'bid' => (float) $row->bid_amount,
                'response' => $row->willing_to_pay ? 1 : 0,
                'socio_economic' => $socio,
            ];
        }

        try {
            // population only scales total_wtp, which the analyst supplies on
            // the form; passing 1 satisfies the calculator's guard without
            // touching any coefficient or the mean WTP.
            $result = $this->calculator->calculateCVMDichotomous([
                'observations' => $observations,
                'population' => 1,
                'model' => $model,
            ]);
        } catch (ValuationException $e) {
            return $this->failure($e->getMessage());
        }

        $regression = $result['regression'];

        $coefficients = ['alpha' => $regression['intercept']];
        $meanCovariates = [];

        foreach ($regression['coefficients'] as $name => $value) {
            if ($name === 'bid') {
                $coefficients['beta_bid'] = -$value;

                continue;
            }

            $coefficients["coef_{$name}"] = $value;
            // gamma_k * mean(X_k), the covariate contribution to Mean WTP.
            $meanCovariates[$name] = $value * (array_sum($columns[$name]) / count($columns[$name]));
        }

        return [
            'ok' => true,
            'message' => null,
            'coefficients' => $coefficients,
            'mean_covariates' => $meanCovariates,
            'respondent_count' => count($observations),
            'yes_count' => $yesCount,
            'no_count' => count($observations) - $yesCount,
            'mean_bid' => array_sum($bids) / count($bids),
            'converged' => $regression['converged'] ?? true,
            'log_likelihood' => $regression['log_likelihood'] ?? null,
            'diagnostics' => [
                'variables' => array_merge(['bid'], $used),
                'dropped_no_variation' => $dropped,
                'iterations' => $regression['iterations'] ?? null,
                'model' => $result['model'],
                'note' => 'Koefisien bid sudah dibalik tandanya agar sesuai P(Ya) = F(α − βA + γX).',
            ],
        ];
    }

    private function covariateValue(CvmData $row, string $name): float
    {
        return match ($name) {
            'income' => (float) ($row->household_income ?? 0),
            'education' => $this->educationYears($row->education_level),
            'age' => (float) ($row->age ?? 0),
            default => 0.0,
        };
    }

    private function failure(string $message): array
    {
        return [
            'ok' => false, 'message' => $message, 'coefficients' => [],
            'mean_covariates' => [], 'respondent_count' => 0, 'yes_count' => 0,
            'no_count' => 0, 'mean_bid' => 0.0, 'converged' => false,
            'log_likelihood' => null, 'diagnostics' => [],
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
