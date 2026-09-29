<?php

namespace App\Services\Valuation\Math;

use App\Services\Valuation\Exceptions\ValuationException;

/**
 * Binary probit regression, fit by Newton-Raphson / IRLS:
 *
 *   P(y = 1) = Phi(beta0 + beta1*x1 + ... + betak*xk)
 *
 * The alternative link to LogisticRegression for CVM dichotomous choice.
 * Logit and probit normally give the same story about willingness to pay —
 * offering both lets an analyst match whichever the study protocol specified,
 * and a large disagreement between them is itself a signal worth seeing.
 */
final class ProbitRegression
{
    private const MAX_ITERATIONS = 100;

    private const TOLERANCE = 1e-9;

    private const ETA_CLAMP = 8.0;

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
            throw new ValuationException('Data observasi kosong — regresi probit tidak dapat dijalankan.');
        }
        if (count($x) !== $n) {
            throw new ValuationException('Jumlah baris variabel independen (X) tidak sama dengan jumlah variabel respon (Y).');
        }
        foreach ($y as $i => $v) {
            if ($v !== 0 && $v !== 1) {
                throw new ValuationException("Variabel respon probit pada observasi ke-{$i} harus bernilai biner (0 atau 1).");
            }
        }

        $k = count($featureNames);
        if ($n <= $k + 1) {
            throw new ValuationException("Jumlah data observasi (n={$n}) harus lebih besar dari jumlah variabel + 1 (".($k + 1).') agar regresi probit dapat diestimasi.');
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

            $gradient = array_fill(0, $p, 0.0);
            $xtwx = array_fill(0, $p, array_fill(0, $p, 0.0));

            foreach ($design as $i => $row) {
                $eta = 0.0;
                foreach ($row as $j => $val) {
                    $eta += $val * $beta[$j];
                }
                $eta = max(-self::ETA_CLAMP, min(self::ETA_CLAMP, $eta));

                $prob = min(max(Distributions::normalCdf($eta), 1e-10), 1 - 1e-10);
                $density = max(Distributions::normalPdf($eta), 1e-10);

                // Newton step for the normal link: weight phi^2 / (p(1-p)),
                // score phi(y - p) / (p(1-p)).
                $variance = $prob * (1 - $prob);
                $w = max($density * $density / $variance, 1e-10);
                $residual = $density * ($y[$i] - $prob) / $variance;

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
            throw new ValuationException('Regresi probit tidak konvergen setelah '.self::MAX_ITERATIONS.' iterasi — periksa kembali data (kemungkinan perfect separation antara bid dan respons, atau data terlalu sedikit).');
        }

        $logLikelihood = 0.0;
        foreach ($design as $i => $row) {
            $eta = 0.0;
            foreach ($row as $j => $val) {
                $eta += $val * $beta[$j];
            }
            $eta = max(-self::ETA_CLAMP, min(self::ETA_CLAMP, $eta));
            $prob = min(max(Distributions::normalCdf($eta), 1e-10), 1 - 1e-10);
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
