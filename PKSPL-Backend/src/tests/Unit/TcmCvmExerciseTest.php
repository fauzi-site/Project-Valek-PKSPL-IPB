<?php

namespace Tests\Unit;

use App\Services\Valuation\EconomicValuationCalculator;
use App\Services\Valuation\NonparametricWtp;
use PHPUnit\Framework\TestCase;

/**
 * Reproduces the TCM and CVM exercise workbooks (docs tcm and cvm/) from their
 * raw respondent rows.
 */
class TcmCvmExerciseTest extends TestCase
{
    private function fixture(string $name): array
    {
        return json_decode(file_get_contents(__DIR__.'/../Fixtures/'.$name), true);
    }

    public function test_tcm_ols_matches_workbook_regression(): void
    {
        $observations = array_map(fn ($r) => [
            'visits' => $r['visits'],
            'travel_cost' => $r['tc'],
            'socio_economic' => ['edu' => $r['edu'], 'inc' => $r['inc'], 'lpj' => $r['lpj']],
        ], $this->fixture('itcm_respondents.json'));

        $result = (new EconomicValuationCalculator)->calculateTCM([
            'observations' => $observations,
            'total_annual_visits' => 65300,
            'model' => 'ols',
        ]);

        $this->assertEqualsWithDelta(-1.0715035870807583e-06, $result['regression']['coefficients']['travel_cost'], 1e-12);
        $this->assertEqualsWithDelta(0.4931670060916025, $result['regression']['r_squared'], 1e-9);
        // The workbook's "Rata-rata SK/wisatawan" (G65).
        $this->assertEqualsWithDelta(2893130.771914396, $result['mean_sk_per_respondent'], 1);
    }

    public function test_cvm_nonparametric_matches_workbook_tables(): void
    {
        $rows = $this->fixture('cvm_respondents.json');
        $result = NonparametricWtp::estimate(array_column($rows, 'bid'), array_column($rows, 'wtp'));

        $this->assertSame([0.8, 0.7, 0.5, 0.3, 0.0], array_map(fn ($r) => round($r['accept_rate'], 10), $result['table']));
        $this->assertFalse($result['pooled']);
        $this->assertEqualsWithDelta(8600, $result['turnbull'], 1e-6);
        $this->assertEqualsWithDelta(8600, $result['kmt'], 1e-6);
        $this->assertEqualsWithDelta(10700, $result['class_median'], 1e-6);
        $this->assertEqualsWithDelta(10000, $result['median_wtp'], 1e-6);
    }

    public function test_cvm_logit_matches_workbook_spss_output(): void
    {
        $rows = $this->fixture('cvm_respondents.json');
        $calculator = new EconomicValuationCalculator;
        $observations = fn (bool $withIncome) => array_map(fn ($r) => [
            'bid' => $r['bid'],
            'response' => $r['wtp'],
            'socio_economic' => $withIncome ? ['income' => $r['income']] : [],
        ], $rows);

        $bidOnly = $calculator->calculateCVMDichotomous(['observations' => $observations(false), 'population' => 1]);
        $this->assertEqualsWithDelta(3.06942119833509, $bidOnly['regression']['intercept'], 1e-4);
        $this->assertEqualsWithDelta(10438.29791, $bidOnly['ewtp'], 0.5);

        $withIncome = $calculator->calculateCVMDichotomous(['observations' => $observations(true), 'population' => 1]);
        // The workbook's SPSS table with income (6441.77) does not follow from
        // its own Data sheet; these values agree with an independent MLE
        // (statsmodels Logit) on the same rows.
        $this->assertEqualsWithDelta(3.5491014565, $withIncome['regression']['intercept'], 1e-6);
        $this->assertEqualsWithDelta(-2.80607554e-7, $withIncome['regression']['coefficients']['income'], 1e-12);
        $this->assertEqualsWithDelta(10456.6856, $withIncome['ewtp'], 0.01);
    }

    public function test_nonparametric_pools_non_monotone_acceptance(): void
    {
        // Acceptance rises from 0.4 to 0.6 between the two lowest bids.
        $bids = [1000, 1000, 1000, 1000, 1000, 2000, 2000, 2000, 2000, 2000, 3000, 3000, 3000, 3000, 3000];
        $yes = [1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];

        $result = NonparametricWtp::estimate($bids, $yes);

        $this->assertTrue($result['pooled']);
        $this->assertGreaterThanOrEqual(0, $result['turnbull']);
    }
}
