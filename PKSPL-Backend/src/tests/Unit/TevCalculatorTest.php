<?php

namespace Tests\Unit;

use App\Services\Valuation\CulturalCalculator;
use App\Services\Valuation\FormulaHelper;
use App\Services\Valuation\ProvisioningCalculator;
use App\Services\Valuation\RegulatingCalculator;
use App\Services\Valuation\SupportingCalculator;
use App\Services\Valuation\TevCalculator;
use Illuminate\Database\Eloquent\Collection;
use PHPUnit\Framework\TestCase;

class TevCalculatorTest extends TestCase
{
    public function test_formula_helper_uses_string_precision(): void
    {
        $this->assertSame('12.5', FormulaHelper::normalizeNumber('12.5'));
        $this->assertSame('4', FormulaHelper::normalizeNumber(4));
        $this->assertSame('0', FormulaHelper::normalizeNumber(null));
    }

    public function test_calculators_return_expected_values(): void
    {
        $provisioning = new \stdClass();
        $provisioning->id_provisioning = 1;
        $provisioning->kategori_tev = 'DUV';
        $provisioning->produktivitas = '2';
        $provisioning->harga_pasar = '3';
        $provisioning->luas_pemanfaatan = '4';

        $regulating = new \stdClass();
        $regulating->id_regulating = 2;
        $regulating->kategori_tev = 'IUV';
        $regulating->nilai_indikator = '5';
        $regulating->nilai = '210';

        $supporting = new \stdClass();
        $supporting->id_supporting = 3;
        $supporting->kategori_tev = 'OV';
        $supporting->referensi = 'SNI 1234:2025';
        $supporting->nilai = '8';

        $cultural = new \stdClass();
        $cultural->id_cultural = 4;
        $cultural->kategori_tev = 'EV';
        $cultural->jumlah_pengunjung = '9';
        $cultural->biaya_perjalanan = '10';
        $cultural->frekuensi = '11';

        $provisioningCalculator = new ProvisioningCalculator();
        $regulatingCalculator = new RegulatingCalculator();
        $supportingCalculator = new SupportingCalculator();
        $culturalCalculator = new CulturalCalculator();

        $this->assertSame('24', $provisioningCalculator->calculateRecord($provisioning));
        $this->assertSame('210', $regulatingCalculator->calculateRecord($regulating));
        $this->assertSame('8', $supportingCalculator->calculateRecord($supporting));
        $this->assertSame('990', $culturalCalculator->calculateRecord($cultural));
    }

    public function test_supporting_reference_never_overrides_economic_value(): void
    {
        $supporting = new \stdClass();
        $supporting->referensi = '2025';
        $supporting->nilai = '125.5';

        $this->assertSame('125.5', (new SupportingCalculator())->calculateRecord($supporting));
    }
}
