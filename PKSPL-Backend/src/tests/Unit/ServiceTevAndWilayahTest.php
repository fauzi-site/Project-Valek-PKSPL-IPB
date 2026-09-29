<?php

namespace Tests\Unit;

use App\Http\Requests\CulturalServiceRequest;
use App\Http\Requests\ProvisioningServiceRequest;
use App\Http\Requests\RegulatingServiceRequest;
use App\Http\Requests\SupportingServiceRequest;
use App\Models\CulturalService;
use App\Models\ProvisioningService;
use App\Models\RegulatingService;
use App\Models\SupportingService;
use PHPUnit\Framework\TestCase;

class ServiceTevAndWilayahTest extends TestCase
{
    public function test_service_models_include_tev_and_wilayah_fields_in_fillable(): void
    {
        $this->assertContains('kategori_tev', (new ProvisioningService())->getFillable());
        $this->assertContains('id_provinsi', (new ProvisioningService())->getFillable());
        $this->assertContains('id_kabupaten_kota', (new ProvisioningService())->getFillable());
        $this->assertContains('id_kecamatan', (new ProvisioningService())->getFillable());
        $this->assertContains('id_desa_kelurahan', (new ProvisioningService())->getFillable());

        $this->assertContains('kategori_tev', (new RegulatingService())->getFillable());
        $this->assertContains('id_provinsi', (new RegulatingService())->getFillable());
        $this->assertContains('id_kabupaten_kota', (new RegulatingService())->getFillable());
        $this->assertContains('id_kecamatan', (new RegulatingService())->getFillable());
        $this->assertContains('id_desa_kelurahan', (new RegulatingService())->getFillable());

        $this->assertContains('kategori_tev', (new SupportingService())->getFillable());
        $this->assertContains('id_provinsi', (new SupportingService())->getFillable());
        $this->assertContains('id_kabupaten_kota', (new SupportingService())->getFillable());
        $this->assertContains('id_kecamatan', (new SupportingService())->getFillable());
        $this->assertContains('id_desa_kelurahan', (new SupportingService())->getFillable());

        $this->assertContains('kategori_tev', (new CulturalService())->getFillable());
        $this->assertContains('id_provinsi', (new CulturalService())->getFillable());
        $this->assertContains('id_kabupaten_kota', (new CulturalService())->getFillable());
        $this->assertContains('id_kecamatan', (new CulturalService())->getFillable());
        $this->assertContains('id_desa_kelurahan', (new CulturalService())->getFillable());
    }

    public function test_service_requests_validate_tev_and_wilayah_fields(): void
    {
        $provisioningRules = (new ProvisioningServiceRequest())->rules();
        $this->assertArrayHasKey('kategori_tev', $provisioningRules);
        $this->assertArrayHasKey('id_provinsi', $provisioningRules);
        $this->assertArrayHasKey('id_kabupaten_kota', $provisioningRules);
        $this->assertArrayHasKey('id_kecamatan', $provisioningRules);
        $this->assertArrayHasKey('id_desa_kelurahan', $provisioningRules);

        $regulatingRules = (new RegulatingServiceRequest())->rules();
        $this->assertArrayHasKey('kategori_tev', $regulatingRules);
        $this->assertArrayHasKey('id_provinsi', $regulatingRules);

        $supportingRules = (new SupportingServiceRequest())->rules();
        $this->assertArrayHasKey('kategori_tev', $supportingRules);
        $this->assertArrayHasKey('id_provinsi', $supportingRules);

        $culturalRules = (new CulturalServiceRequest())->rules();
        $this->assertArrayHasKey('kategori_tev', $culturalRules);
        $this->assertArrayHasKey('id_provinsi', $culturalRules);
    }
}
