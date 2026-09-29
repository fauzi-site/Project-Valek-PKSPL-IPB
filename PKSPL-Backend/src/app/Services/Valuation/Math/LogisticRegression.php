<?php

namespace App\Services\Valuation\Math;

use App\Services\Valuation\Exceptions\ValuationException;

/**
 * Binary logistic regression, fit by Newton-Raphson / IRLS, maximizing the
 * log-likelihood of the logit model:
 *
 *   ln(P / (1 - P)) = beta0 + beta1*x1 + ... + betak*xk
 *
 * Used by the CVM dichotomous-choice (single-bounded) valuation, where the
 * response is "willing to pay the offered bid?" (1 = yes, 0 = no).
 */
final class LogisticRegression
{
    private const MAX_ITERATIONS = 100;

    private const TOLERANCE = 1e-8;

    /**
     * @param  int[]  $y  Binary outcome (0/1), length n
     * @param  float[][]  $x  Independent variables, n rows x k columns (WITHOUT intercept column)
     * @param  string[]  $featureNames  Column names for $x, length k
     * @return array{intercept: float, coefficients: array<string, float>, log_likelihood: float, iterations: int, converged: bool, n: int}
     */
    public static function fit(array $y, array $x, array $featureNames = []): array
    {
        $n = count($y);
        if ($n === 0) {
            throw new ValuationException('Data observasi kosong — regresi logit tidak dapat dijalankan.');
        }
        if (count($x) !== $n) {
            throw new ValuationException('Jumlah baris variabel independen (X) tidak sama dengan jumlah variabel respon (Y).');
        }
        foreach ($y as $i => $v) {
            if ($v !== 0 && $v !== 1) {
                throw new ValuationException("Variabel respon logit pada observasi ke-{$i} harus bernilai biner (0 atau 1).");
            }
        }

        $k = count($featureNames);
        if ($n <= $k + 1) {
            throw new ValuationException("Jumlah data observasi (n={$n}) harus lebih besar dari jumlah variabel + 1 (".($k + 1).') agar regresi logit dapat diestimasi.');
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

            // Linear predictor eta_i = x_i . beta -> predicted probability
            // P_i = 1 / (1 + e^-eta_i). eta is clamped so exp() never overflows.
            $prob = [];
            foreach ($design as $row) {
                $eta = 0.0;
                foreach ($row as $j => $val) {
                    $eta += $val * $beta[$j];
                }
                $eta = max(-35.0, min(35.0, $eta));
                $prob[] = 1.0 / (1.0 + exp(-$eta));
            }

            // Score / gradient of the log-likelihood: X' (y - p)
            $gradient = array_fill(0, $p, 0.0);
            for ($i = 0; $i < $n; $i++) {
                $diff = $y[$i] - $prob[$i];
                for ($j = 0; $j < $p; $j++) {
                    $gradient[$j] += $design[$i][$j] * $diff;
                }
            }

            // Information matrix X' W X, with W = diag(p_i * (1 - p_i)) —
            // this plays the role of -Hessian in the Newton-Raphson update.
            $xtwx = array_fill(0, $p, array_fill(0, $p, 0.0));
            foreach ($design as $i => $row) {
                // Guarded away from exactly 0/1 so perfect separation doesn't
                // make the weight (and thus the information matrix) singular.
                $w = max($prob[$i] * (1 - $prob[$i]), 1e-10);
                for ($a = 0; $a < $p; $a++) {
                    if ($row[$a] == 0.0) {
                        continue;
                    }
                    for ($b = 0; $b < $p; $b++) {
                        $xtwx[$a][$b] += $w * $row[$a] * $row[$b];
                    }
                }
            }

            $xtwxInv = Matrix::invert($xtwx);

            // Newton-Raphson update: beta_new = beta + (X'WX)^-1 X'(y - p)
            $step = array_fill(0, $p, 0.0);
            for ($a = 0; $a < $p; $a++) {
                for ($b = 0; $b < $p; $b++) {
                    $step[$a] += $xtwxInv[$a][$b] * $gradient[$b];
                }
            }

            $maxDelta = 0.0;
            for ($j = 0; $j < $p; $j++) {
                $beta[$j] += $step[$j];
                $maxDelta = max($maxDelta, abs($step[$j]));
            }

            if ($maxDelta < self::TOLERANCE) {
                $converged = true;
                break;
            }
        }

        if (! $converged) {
            throw new ValuationException('Regresi logit tidak konvergen setelah '.self::MAX_ITERATIONS.' iterasi — periksa kembali data (kemungkinan perfect separation antara bid dan respons, atau data terlalu sedikit).');
        }

        // Final log-likelihood, kept as a diagnostic for the caller.
        $logLikelihood = 0.0;
        foreach ($design as $i => $row) {
            $eta = 0.0;
            foreach ($row as $j => $val) {
                $eta += $val * $beta[$j];
            }
            $eta = max(-35.0, min(35.0, $eta));
            $prob = 1.0 / (1.0 + exp(-$eta));
            $prob = min(max($prob, 1e-10), 1 - 1e-10);
            $logLikelihood += $y[$i] * log($prob) + (1 - $y[$i]) * log(1 - $prob);
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
        ];
    }
}
