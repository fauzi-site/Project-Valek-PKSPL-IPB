<?php

namespace App\Services\Valuation\Math;

use App\Services\Valuation\Exceptions\ValuationException;

/**
 * Minimal dense-matrix helper (2D arrays, row-major) used by the OLS and
 * logistic regression solvers below. No external math dependency is
 * required — the matrices involved are always small (a handful of
 * regression variables), so a plain Gauss-Jordan implementation is fine.
 */
final class Matrix
{
    /**
     * @param  float[][]  $m
     * @return float[][]
     */
    public static function transpose(array $m): array
    {
        $rows = count($m);
        $cols = $rows > 0 ? count($m[0]) : 0;

        $t = [];
        for ($j = 0; $j < $cols; $j++) {
            for ($i = 0; $i < $rows; $i++) {
                $t[$j][$i] = $m[$i][$j];
            }
        }

        return $t;
    }

    /**
     * @param  float[][]  $a  m x n
     * @param  float[][]  $b  n x p
     * @return float[][] m x p
     */
    public static function multiply(array $a, array $b): array
    {
        $aRows = count($a);
        $aCols = $aRows > 0 ? count($a[0]) : 0;
        $bRows = count($b);
        $bCols = $bRows > 0 ? count($b[0]) : 0;

        if ($aCols !== $bRows) {
            throw new ValuationException("Dimensi matriks tidak cocok untuk perkalian ({$aRows}x{$aCols} vs {$bRows}x{$bCols}).");
        }

        $result = array_fill(0, $aRows, array_fill(0, $bCols, 0.0));
        for ($i = 0; $i < $aRows; $i++) {
            for ($k = 0; $k < $aCols; $k++) {
                if ($a[$i][$k] == 0.0) {
                    continue;
                }
                for ($j = 0; $j < $bCols; $j++) {
                    $result[$i][$j] += $a[$i][$k] * $b[$k][$j];
                }
            }
        }

        return $result;
    }

    /**
     * Inverts a square matrix via Gauss-Jordan elimination with partial
     * pivoting. Throws when the matrix is singular — in the regression
     * context this means perfect multicollinearity between the independent
     * variables, or too few observations relative to the number of
     * variables.
     *
     * @param  float[][]  $m  n x n
     * @return float[][] n x n
     */
    public static function invert(array $m): array
    {
        $n = count($m);

        // Build an [M | I] augmented matrix so the elimination steps applied
        // to M also transform I into M^-1.
        $aug = [];
        for ($i = 0; $i < $n; $i++) {
            $aug[$i] = array_merge(array_values($m[$i]), array_fill(0, $n, 0.0));
            $aug[$i][$n + $i] = 1.0;
        }

        for ($col = 0; $col < $n; $col++) {
            $pivotRow = $col;
            $maxVal = abs($aug[$col][$col]);
            for ($r = $col + 1; $r < $n; $r++) {
                if (abs($aug[$r][$col]) > $maxVal) {
                    $maxVal = abs($aug[$r][$col]);
                    $pivotRow = $r;
                }
            }

            if ($maxVal < 1e-10) {
                throw new ValuationException(
                    'Matriks regresi bersifat singular (tidak dapat diinversi) — kemungkinan terjadi multikolinearitas sempurna antar variabel, atau jumlah data observasi terlalu sedikit dibanding jumlah variabel.'
                );
            }

            if ($pivotRow !== $col) {
                [$aug[$col], $aug[$pivotRow]] = [$aug[$pivotRow], $aug[$col]];
            }

            $pivotVal = $aug[$col][$col];
            for ($j = 0; $j < 2 * $n; $j++) {
                $aug[$col][$j] /= $pivotVal;
            }

            for ($r = 0; $r < $n; $r++) {
                if ($r === $col) {
                    continue;
                }
                $factor = $aug[$r][$col];
                if ($factor == 0.0) {
                    continue;
                }
                for ($j = 0; $j < 2 * $n; $j++) {
                    $aug[$r][$j] -= $factor * $aug[$col][$j];
                }
            }
        }

        $inv = [];
        for ($i = 0; $i < $n; $i++) {
            $inv[$i] = array_slice($aug[$i], $n, $n);
        }

        return $inv;
    }
}
