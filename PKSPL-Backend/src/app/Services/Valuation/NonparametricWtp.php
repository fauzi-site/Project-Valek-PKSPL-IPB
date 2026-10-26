<?php

namespace App\Services\Valuation;

/**
 * Nonparametric mean-WTP estimators for dichotomous-choice CVM data.
 *
 * Works on the table the CVM exercise builds by hand: for every bid level, the
 * share of respondents who accepted. With reject share R_j rising across the
 * ascending bids b_1 < ... < b_M (R_0 = 0, R_{M+1} = 1), the three estimators
 * differ only in what value they give to the probability mass in each class.
 *
 *  - Turnbull and Kaplan-Meier-Turnbull take the lower bound of each class
 *    (the bid itself), so they never overstate WTP.
 *  - Class median takes the midpoint of (b_{j-1}, b_j], and the lower bound
 *    b_M for the open class above the highest bid.
 *
 * A theoretically valid R_j never falls as the bid rises. Real samples
 * sometimes violate that, so the shares are first pooled with the
 * pool-adjacent-violators algorithm, weighted by respondents per bid.
 */
class NonparametricWtp
{
    /**
     * @param  array<int, float|int>  $bids  bid shown to each respondent
     * @param  array<int, int|bool>  $responses  1/true if the respondent accepted
     * @return array{
     *     table: array<int, array{bid: float, n: int, yes: int, no: int, accept_rate: float, reject_rate: float}>,
     *     pooled: bool,
     *     median_wtp: float|null,
     *     class_median: float,
     *     turnbull: float,
     *     kmt: float,
     * }
     */
    public static function estimate(array $bids, array $responses): array
    {
        $groups = [];
        foreach (array_values($bids) as $i => $bid) {
            $key = (string) (float) $bid;
            $groups[$key] ??= ['bid' => (float) $bid, 'n' => 0, 'yes' => 0];
            $groups[$key]['n']++;
            $groups[$key]['yes'] += $responses[$i] ? 1 : 0;
        }
        usort($groups, fn ($a, $b) => $a['bid'] <=> $b['bid']);

        $table = [];
        foreach ($groups as $g) {
            $table[] = [
                'bid' => $g['bid'],
                'n' => $g['n'],
                'yes' => $g['yes'],
                'no' => $g['n'] - $g['yes'],
                'accept_rate' => $g['yes'] / $g['n'],
                'reject_rate' => 1 - $g['yes'] / $g['n'],
            ];
        }

        $reject = self::pool(array_column($table, 'reject_rate'), array_column($table, 'n'));
        $pooled = $reject !== array_column($table, 'reject_rate');
        $bidValues = array_column($table, 'bid');
        $m = count($bidValues);

        // Probability mass in each class: class j is (b_{j-1}, b_j], class M+1 is above b_M.
        $mass = [];
        $previous = 0.0;
        foreach ($reject as $r) {
            $mass[] = $r - $previous;
            $previous = $r;
        }
        $mass[] = 1.0 - $previous;

        // Lower-bound mean: class j+1 starts at b_j, so each mass is priced at the bid below it.
        $lowerBound = 0.0;
        for ($j = 1; $j < $m + 1; $j++) {
            $lowerBound += $bidValues[$j - 1] * $mass[$j];
        }

        $classMedian = 0.0;
        for ($j = 0; $j < $m; $j++) {
            $lower = $j === 0 ? 0.0 : $bidValues[$j - 1];
            $classMedian += ($lower + $bidValues[$j]) / 2 * $mass[$j];
        }
        $classMedian += $bidValues[$m - 1] * $mass[$m];

        return [
            'table' => $table,
            'pooled' => $pooled,
            'median_wtp' => self::medianWtp($bidValues, $reject),
            'class_median' => $classMedian,
            'turnbull' => $lowerBound,
            'kmt' => $lowerBound,
        ];
    }

    /** Pool-adjacent-violators: the closest non-decreasing sequence, weighted. */
    private static function pool(array $values, array $weights): array
    {
        $blocks = [];
        foreach ($values as $i => $v) {
            $blocks[] = ['value' => $v, 'weight' => $weights[$i], 'size' => 1];
            while (count($blocks) > 1) {
                $b = $blocks[count($blocks) - 1];
                $a = $blocks[count($blocks) - 2];
                if ($a['value'] <= $b['value']) {
                    break;
                }
                $w = $a['weight'] + $b['weight'];
                array_splice($blocks, -2, 2, [[
                    'value' => ($a['value'] * $a['weight'] + $b['value'] * $b['weight']) / $w,
                    'weight' => $w,
                    'size' => $a['size'] + $b['size'],
                ]]);
            }
        }

        $out = [];
        foreach ($blocks as $b) {
            for ($k = 0; $k < $b['size']; $k++) {
                $out[] = $b['value'];
            }
        }

        return $out;
    }

    /** The bid at which half the respondents reject, interpolated between bids. */
    private static function medianWtp(array $bids, array $reject): ?float
    {
        foreach ($reject as $j => $r) {
            if ($r >= 0.5) {
                if ($j === 0) {
                    return $bids[0];
                }
                $span = $r - $reject[$j - 1];

                return $span > 0
                    ? $bids[$j - 1] + ($bids[$j] - $bids[$j - 1]) * (0.5 - $reject[$j - 1]) / $span
                    : $bids[$j];
            }
        }

        return null;
    }
}
