<?php

namespace App\Services\Valuation\Math;

/**
 * Statistical distribution helpers shared by the regression solvers.
 *
 * Kept separate from the solvers themselves so the probit link and the
 * Poisson log-likelihood draw on one implementation of the normal CDF and the
 * log-gamma function rather than each carrying its own copy.
 */
final class Distributions
{
    /** Standard normal CDF, Phi(x). */
    public static function normalCdf(float $x): float
    {
        return 0.5 * (1.0 + self::erf($x / M_SQRT2));
    }

    /** Standard normal PDF, phi(x). */
    public static function normalPdf(float $x): float
    {
        return exp(-0.5 * $x * $x) / sqrt(2 * M_PI);
    }

    /**
     * Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7):
     *
     *   erf(x) = 1 - (a1*t + a2*t^2 + a3*t^3 + a4*t^4 + a5*t^5) * e^(-x^2),
     *   with t = 1 / (1 + p*x)
     *
     * Accurate well beyond what a reported probability needs.
     */
    public static function erf(float $x): float
    {
        $sign = $x < 0 ? -1 : 1;
        $x = abs($x);

        $t = 1 / (1 + 0.3275911 * $x);
        $poly = ((((1.061405429 * $t - 1.453152027) * $t + 1.421413741) * $t - 0.284496736) * $t + 0.254829592) * $t;

        return $sign * (1 - $poly * exp(-$x * $x));
    }

    /** log(Gamma(x)) via the Lanczos approximation. */
    public static function logGamma(float $x): float
    {
        static $g = [
            676.5203681218851, -1259.1392167224028, 771.32342877765313,
            -176.61502916214059, 12.507343278686905, -0.13857109526572012,
            9.9843695780195716e-6, 1.5056327351493116e-7,
        ];

        if ($x < 0.5) {
            // Reflection formula, for arguments the series does not cover.
            return log(M_PI / abs(sin(M_PI * $x))) - self::logGamma(1 - $x);
        }

        $x -= 1;
        $a = 0.99999999999980993;
        $t = $x + 7.5;

        foreach ($g as $i => $coefficient) {
            $a += $coefficient / ($x + $i + 1);
        }

        return 0.5 * log(2 * M_PI) + ($x + 0.5) * log($t) - $t + log($a);
    }

    /** log(n!) for a non-negative count. */
    public static function logFactorial(float $n): float
    {
        return self::logGamma($n + 1);
    }
}
