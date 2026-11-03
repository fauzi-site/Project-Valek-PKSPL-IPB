<?php

namespace Tests\Feature\Api\V1;

use App\Models\JenisTutupanLahan;
use App\Models\ProvisioningService;
use App\Models\User;
use App\Models\ValuationRow;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Data Valuasi dan Data Master tidak saling menulis: menambah/menghapus baris valuasi
 * tidak mengubah master, dan membaca master tidak menghidupkan kembali data yang dihapus.
 * Membutuhkan database yang sudah di-seed (seperti ProyekApiTest).
 */
class ValuationMasterIndependenceTest extends TestCase
{
    use DatabaseTransactions;

    private JenisTutupanLahan $landCover;

    protected function setUp(): void
    {
        parent::setUp();

        $this->landCover = JenisTutupanLahan::with('index.proyek')->firstOrFail();
        $owner = User::findOrFail($this->landCover->index->proyek->id_user);
        Sanctum::actingAs($owner);
    }

    private function masterCount(): int
    {
        return ProvisioningService::count();
    }

    private function rowsUrl(string $suffix = ''): string
    {
        return "/api/v1/jenis-tutupan-lahan/{$this->landCover->id_jenis_tutupan_lahan}/valuation/rows{$suffix}";
    }

    private function payload(string $item): array
    {
        return [
            'service_id' => 'provisioning',
            'method_id' => 'market-price',
            'biota' => 'fauna',
            'row_data' => ['id' => 'ROW-UJI-1', 'item' => $item, 'totalNilai' => 1000],
            'total_nilai' => 1000,
        ];
    }

    public function test_menambah_baris_valuasi_tidak_menulis_ke_master(): void
    {
        $before = $this->masterCount();

        $this->postJson($this->rowsUrl(), $this->payload('Ikan Uji Tidak Ada di Master'))->assertCreated();

        $this->assertSame($before, $this->masterCount());
        $this->assertDatabaseMissing('provisioning_service', ['nama_objek' => 'Ikan Uji Tidak Ada di Master']);
    }

    public function test_menghapus_baris_valuasi_tidak_menghapus_master(): void
    {
        $master = ProvisioningService::create([
            'id_jenis_tutupan_lahan' => $this->landCover->id_jenis_tutupan_lahan,
            'nama_objek' => 'Ikan Uji Master',
            'produktivitas' => 1,
            'harga_pasar' => 1,
            'luas_pemanfaatan' => 1,
            'satuan_luas' => 'Hektar',
            'nilai' => 1,
            'kategori_tev' => 'DUV',
        ]);
        $row = ValuationRow::create([
            'id_jenis_tutupan_lahan' => $this->landCover->id_jenis_tutupan_lahan,
            'service_id' => 'provisioning',
            'method_id' => 'market-price',
            'biota' => 'fauna',
            'row_order' => 0,
            'row_data' => ['id' => 'ROW-UJI-2', 'item' => 'Ikan Uji Master'],
            'total_nilai' => 1,
        ]);

        $this->deleteJson($this->rowsUrl("/{$row->id}"))->assertNoContent();

        $this->assertDatabaseMissing('valuation_rows', ['id' => $row->id]);
        $this->assertDatabaseHas('provisioning_service', ['id_provisioning' => $master->id_provisioning]);
    }

    public function test_membaca_data_master_tidak_menghidupkan_kembali_master_yang_dihapus(): void
    {
        $idProyek = $this->landCover->index->id_proyek;

        $this->postJson($this->rowsUrl(), $this->payload('Ikan Uji Dibaca Ulang'))->assertCreated();

        $before = $this->masterCount();
        $this->getJson("/api/v1/proyek/{$idProyek}/data-master")->assertOk();
        $this->getJson("/api/v1/proyek/{$idProyek}/data-master")->assertOk();

        $this->assertSame($before, $this->masterCount());
        $this->assertDatabaseMissing('provisioning_service', ['nama_objek' => 'Ikan Uji Dibaca Ulang']);
    }
}
