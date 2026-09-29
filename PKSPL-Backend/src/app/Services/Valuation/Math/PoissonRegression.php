<?php

namespace App\Services\Valuation\Math;

use App\Services\Valuation\Exceptions\ValuationException;

/**
 * Poisson (and negative binomial) count regression with a log link, fit by
 * Newton-Raphson / IRLS:
 *
 *   ln(mu_i) = beta0 + beta1*x1 + ... + betak*xk
 *
 * Used by the Travel Cost Method, where the dependent variable is a count of
 * visits per respondent. A count is non-negative and often zero, which is
 * exactly where a linear model on ln(visits) breaks down — ln(0) is
 * undefined — so the count model is the appropriate default there.
 *
 * `negativeBinomial()` relaxes the Poisson assumption that the variance
 * equals the mean. Overdispersion is common in visit data (a few enthusiasts
 * visit very often), and ignoring it understates the standard errors.
 */
final class PoissonRegression
{
    private const MAX_ITERATIONS = 100;

    private const TOLERANCE = 1e-9;

    /** Keeps exp() away from overflow while still allowing a wide predictor. */
    private const ETA_CLAMP = 30.0;

    /**
     * @param  float[]  $y  Non-negative counts, length n
     * @param  float[][]  $x  Independent variables, n rows x k columns (WITHOUT intercept column)
     * @param  string[]  $featureNames  Column names for $x, length k
     * @return array{intercept: float, coefficients: array<string, float>, log_likelihood: float, iterations: int, converged: bool, n: int, dispersion: float}
     */
    public static function fit(array $y, array $x, array $featureNames = []): array
    {
        return self::solve($y, $x, $featureNames, 0.0);
    }

    /**
     * Negative binomial with the dispersion alpha estimated from the Poisson
     * fit by method of moments, then held fixed while beta is refitted.
     * Variance is mu + alpha*mu^2, so the IRLS weight becomes mu/(1 + alpha*mu).
     *
     * @return array{intercept: float, coefficients: array<string, float>, log_likelihood: float, iterations: int, converged: bool, n: int, dispersion: float}
     */
    public static function fitNegativeBinomial(array $y, array $x, array $featureNames = []): array
    {
        $poisson = self::solve($y, $x, $featureNames, 0.0);
        $alpha = self::estimateDispersion($y, $x, $poisson);

        return self::solve($y, $x, $featureNames, $alpha);
    }

    /**
     * @param  float  $alpha  Dispersion; 0 means Poisson.
     */
    private static function solve(array $y, array $x, array $featureNames, float $alpha): array
    {
        $n = count($y);
        if ($n === 0) {
            throw new ValuationException('Data observasi kosong — regresi Poisson tidak dapat dijalankan.');
        }
        if (count($x) !== $n) {
            throw new ValuationException('Jumlah baris variabel independen (X) tidak sama dengan jumlah variabel dependen (Y).');
        }
        foreach ($y as $i => $v) {
            if ($v < 0) {
                throw new ValuationException("Variabel cacah pada observasi ke-{$i} tidak boleh negatif.");
            }
        }

        $k = count($featureNames);
        if ($n <= $k + 1) {
            throw new ValuationException("Jumlah data observasi (n={$n}) harus lebih besar dari jumlah variabel + 1 (".($k + 1).') agar regresi Poisson dapat diestimasi.');
        }

        $design = [];
        for ($i = 0; $i < $n; $i++) {
            $design[] = array_merge([1.0], array_map('floatval', array_values($x[$i])));
        }

        $p = $k + 1;
        $beta = array_fill(0, $p, 0.0);
        $converged = false;
        $iterations = 0;

        for ($iter = 1; $iter <= self::MAX_ITERATIONS; $iter++) {
            $iterations = $iter;

            $mu = [];
            foreach ($design as $row) {
                $eta = 0.0;
                foreach ($row as $j => $val) {
                    $eta += $val * $beta[$j];
                }
                $mu[] = exp(max(-self::ETA_CLAMP, min(self::ETA_CLAMP, $eta)));
            }

            // Score X'(y - mu)/(1 + alpha*mu) and information X' diag(w) X,
            // with w = mu/(1 + alpha*mu). At alpha = 0 both collapse to the
            // plain Poisson forms.
            $gradient = array_fill(0, $p, 0.0);
            $xtwx = array_fill(0, $p, array_fill(0, $p, 0.0));

            foreach ($design as $i => $row) {
                $scale = 1 + $alpha * $mu[$i];
                $w = max($mu[$i] / $scale, 1e-10);
                $residual = ($y[$i] - $mu[$i]) / $scale;

                for ($a = 0; $a < $p; $a++) {
                    if ($row[$a] == 0.0) {
                        continue;
                    }
                    $gradient[$a] += $row[$a] * $residual;
                    for ($b = 0; $b < $p; $b++) {
                        $xtwx[$a][$b] += $w * $row[$a] * $row[$b];
                    }
                }
            }

            $xtwxInv = Matrix::invert($xtwx);

            $maxDelta = 0.0;
            for ($a = 0; $a < $p; $a++) {
                $step = 0.0;
                for ($b = 0; $b < $p; $b++) {
                    $step += $xtwxInv[$a][$b] * $gradient[$b];
                }
                $beta[$a] += $step;
                $maxDelta = max($maxDelta, abs($step));
            }

            if ($maxDelta < self::TOLERANCE) {
                $converged = true;
                break;
            }
        }

        if (! $converged) {
            throw new ValuationException('Regresi Poisson tidak konvergen setelah '.self::MAX_ITERATIONS.' iterasi — periksa kembali data (kemungkinan variabel penjelas hampir kolinear, atau data terlalu sedikit).');
        }

        $logLikelihood = 0.0;
        foreach ($design as $i => $row) {
            $eta = 0.0;
            foreach ($row as $j => $val) {
                $eta += $val * $beta[$j];
            }
            $muI = exp(max(-self::ETA_CLAMP, min(self::ETA_CLAMP, $eta)));

            if ($alpha > 0) {
                $r = 1 / $alpha;
                $logLikelihood += Distributions::logGamma($y[$i] + $r) - Distributions::logGamma($r)
                    - Distributions::logFactorial($y[$i])
                    + $r * log($r / ($r + $muI)) + $y[$i] * log($muI / ($r + $muI));
            } else {
                $logLikelihood += $y[$i] * log(max($muI, 1e-10)) - $muI - Distributions::logFactorial($y[$i]);
            }
        }

        $coefficients = [];
        foreach ($featureNames as $idx => $name) {
            $coefficients[$name] = $beta[$idx + 1];
        }

        return [
            'intercept' => $beta[0],
            'coefficients' => $coefficients,
            'log_likelihood' => $logLikelihood,
            'iterations' => $iterations,
            'converged' => $converged,
            'n' => $n,
            'dispersion' => $alpha,
        ];
    }

    /** Method-of-moments dispersion from a fitted Poisson model. */
    private static function estimateDispersion(array $y, array $x, array $poisson): float
    {
        $n = count($y);
        $names = array_keys($poisson['coefficients']);
        $k = count($names);

        if ($n <= $k + 1) {
            return 0.0;
        }

        $sum = 0.0;
        foreach ($x as $i => $row) {
            $eta = $poisson['intercept'];
            foreach (array_values($row) as $j => $value) {
                $eta += $poisson['coefficients'][$names[$j]] * (float) $value;
            }
            $mu = exp(max(-self::ETA_CLAMP, min(self::ETA_CLAMP, $eta)));
            $sum += (($y[$i] - $mu) ** 2 - $y[$i]) / max($mu ** 2, 1e-10);
        }

        return max($sum / ($n - $k - 1), 0.0);
    }
}
