<?php

namespace App\Services\Valuation\Math;

use App\Services\Valuation\Exceptions\ValuationException;

/**
 * Ordinary Least Squares multiple linear regression, solved via the normal
 * equation. Used by TCM (demand function), CVM open-ended (WTP function),
 * and EOP (production function) — they are all "Y = b0 + b1*X1 + ... " models.
 */
final class OlsRegression
{
    /**
     * @param  float[]  $y  Dependent variable, length n
     * @param  float[][]  $x  Independent variables, n rows x k columns (WITHOUT intercept column)
     * @param  string[]  $featureNames  Column names for $x, length k
     * @return array{intercept: float, coefficients: array<string, float>, r_squared: float, n: int, k: int}
     */
    public static function fit(array $y, array $x, array $featureNames = []): array
    {
        $n = count($y);
        if ($n === 0) {
            throw new ValuationException('Data observasi kosong — regresi tidak dapat dijalankan.');
        }
        if (count($x) !== $n) {
            throw new ValuationException('Jumlah baris variabel independen (X) tidak sama dengan jumlah variabel dependen (Y).');
        }
        foreach ($x as $i => $row) {
            if (count($row) !== count($featureNames)) {
                throw new ValuationException("Jumlah variabel independen pada observasi ke-{$i} tidak konsisten dengan daftar nama variabel.");
            }
        }

        $k = count($featureNames);

        // Degrees of freedom (n - k - 1) must stay positive, otherwise the
        // normal equation is under- or exactly-determined and has no unique
        // (or no meaningful) solution.
        if ($n <= $k + 1) {
            throw new ValuationException("Jumlah data observasi (n={$n}) harus lebih besar dari jumlah variabel + 1 (".($k + 1).') agar regresi dapat diestimasi.');
        }

        // Design matrix X_d = [1, x1, x2, ..., xk] per row — the leading 1
        // column lets a single matrix equation solve for the intercept too.
        $design = [];
        for ($i = 0; $i < $n; $i++) {
            $design[] = array_merge([1.0], array_map('floatval', array_values($x[$i])));
        }
        $yCol = array_map(fn ($v) => [(float) $v], $y);

        // Normal equation: beta = (X_d' X_d)^-1 X_d' y
        $xt = Matrix::transpose($design);
        $xtx = Matrix::multiply($xt, $design);
        $xtxInv = Matrix::invert($xtx);
        $xty = Matrix::multiply($xt, $yCol);
        $betaCol = Matrix::multiply($xtxInv, $xty);
        $beta = array_map(fn ($row) => $row[0], $betaCol);

        // Goodness of fit: R^2 = 1 - SS_res / SS_tot
        $fitted = Matrix::multiply($design, $betaCol);
        $meanY = array_sum($y) / $n;
        $ssRes = 0.0;
        $ssTot = 0.0;
        foreach ($y as $i => $actual) {
            $ssRes += ($actual - $fitted[$i][0]) ** 2;
            $ssTot += ($actual - $meanY) ** 2;
        }
        $rSquared = $ssTot > 0 ? 1 - ($ssRes / $ssTot) : 1.0;

        $coefficients = [];
        foreach ($featureNames as $idx => $name) {
            $coefficients[$name] = $beta[$idx + 1];
        }

        return [
            'intercept' => $beta[0],
            'coefficients' => $coefficients,
            'r_squared' => $rSquared,
            'n' => $n,
            'k' => $k,
        ];
    }
}
