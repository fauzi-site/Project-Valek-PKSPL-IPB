<?php

namespace Tests\Feature\Api\V1;

use App\Models\Proyek;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProyekApiTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $existingUser = User::first();
        if ($existingUser) {
            $this->user = $existingUser;
        } else {
            $role = Role::first() ?? Role::create(['nama_role' => 'Peneliti']);
            $this->user = User::create([
                'id_role' => $role->id_role,
                'nama' => 'Test User',
                'email' => 'testuser@example.com',
                'password' => 'password',
                'status' => 'Aktif',
            ]);
        }
    }

    public function test_can_create_proyek_without_shp(): void
    {
        $payload = [
            'nama_proyek' => 'Proyek Wilayah Test',
            'deskripsi' => 'Deskripsi test',
            'alamat_lengkap' => 'Kec. Bogor Tengah',
            'status' => 'Draft',
            'geometry' => [
                'type' => 'Polygon',
                'coordinates' => [
                    [[106.8, -6.6], [106.81, -6.6], [106.81, -6.61], [106.8, -6.61], [106.8, -6.6]]
                ]
            ]
        ];

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/proyek', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.nama_proyek', 'Proyek Wilayah Test');

        $this->assertDatabaseHas('proyek', [
            'nama_proyek' => 'Proyek Wilayah Test',
            'id_user' => $this->user->id_user,
        ]);
    }

    public function test_can_create_proyek_with_shp_zip(): void
    {
        Storage::fake('public');

        $zipFile = UploadedFile::fake()->create('area_penelitian.zip', 100, 'application/zip');

        $payload = [
            'nama_proyek' => 'Proyek SHP ZIP Test',
            'deskripsi' => 'Deskripsi SHP',
            'alamat_lengkap' => 'Area Pesisir',
            'status' => 'Draft',
            'geometry' => json_encode([
                'type' => 'Polygon',
                'coordinates' => [
                    [[106.8, -6.6], [106.81, -6.6], [106.81, -6.61], [106.8, -6.61], [106.8, -6.6]]
                ]
            ]),
            'zip' => $zipFile,
        ];

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/proyek', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.nama_proyek', 'Proyek SHP ZIP Test');

        $proyek = Proyek::where('nama_proyek', 'Proyek SHP ZIP Test')->first();
        $this->assertNotNull($proyek);
        $this->assertNotNull($proyek->shapefile_files);
        $this->assertArrayHasKey('zip', $proyek->shapefile_files);
    }

    public function test_can_create_proyek_with_shapefile_files_array(): void
    {
        Storage::fake('public');

        $zipFile = UploadedFile::fake()->create('area.zip', 100, 'application/zip');

        $payload = [
            'nama_proyek' => 'Proyek Shapefile Files Array Test',
            'status' => 'Draft',
            'shapefile_files' => [$zipFile],
        ];

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/proyek', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.nama_proyek', 'Proyek Shapefile Files Array Test');
    }

    public function test_user_cannot_override_owner_id_user(): void
    {
        $payload = [
            'id_user' => 99999, // Attempt to spoof owner
            'nama_proyek' => 'Proyek Spoofed Owner Test',
            'status' => 'Draft',
        ];

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/proyek', $payload);

        $response->assertStatus(201);

        $proyek = Proyek::where('nama_proyek', 'Proyek Spoofed Owner Test')->first();
        $this->assertNotNull($proyek);
        $this->assertEquals($this->user->id_user, $proyek->id_user);
    }

    public function test_can_update_proyek_with_shp_zip(): void
    {
        Storage::fake('public');

        $proyek = Proyek::create([
            'id_user' => $this->user->id_user,
            'nama_proyek' => 'Proyek Sebelum Update SHP',
            'tujuan_valuasi' => 'Valuasi Ekonomi Ekosistem',
            'tahun' => 2026,
            'status' => 'Draft',
        ]);

        $zipFile = UploadedFile::fake()->create('updated_boundary.zip', 100, 'application/zip');

        $response = $this->actingAs($this->user, 'sanctum')
            ->post('/api/v1/proyek/' . $proyek->id_proyek . '?_method=PUT', [
                'nama_proyek' => 'Proyek Setelah Update SHP',
                'latitude' => -6.595,
                'longitude' => 106.816,
                'zip' => $zipFile,
            ]);

        $response->assertStatus(200);

        $proyek->refresh();
        $this->assertEquals('Proyek Setelah Update SHP', $proyek->nama_proyek);
        $this->assertEquals(-6.595, (float) $proyek->latitude);
        $this->assertEquals(106.816, (float) $proyek->longitude);
        $this->assertNotNull($proyek->shapefile_files);
        $this->assertArrayHasKey('zip', $proyek->shapefile_files);
    }

    public function test_can_update_proyek_using_kode_proyek(): void
    {
        $proyek = Proyek::create([
            'id_user' => $this->user->id_user,
            'kode_proyek' => 'PRJ-TEST-KODE',
            'nama_proyek' => 'Proyek Kode Test',
            'tujuan_valuasi' => 'Valuasi Ekonomi Ekosistem',
            'tahun' => 2026,
            'status' => 'Draft',
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson('/api/v1/proyek/' . $proyek->kode_proyek, [
                'nama_proyek' => 'Proyek Kode Updated',
                'latitude' => -1.25,
                'longitude' => 116.85,
            ]);

        $response->assertStatus(200);

        $proyek->refresh();
        $this->assertEquals('Proyek Kode Updated', $proyek->nama_proyek);
        $this->assertEquals(-1.25, (float) $proyek->latitude);
        $this->assertEquals(116.85, (float) $proyek->longitude);
    }

    public function test_can_create_proyek_with_lokasi_field_and_persists_location(): void
    {
        $payload = [
            'nama_proyek' => 'Proyek Uji Lokasi',
            'deskripsi' => 'Deskripsi uji',
            'lokasi' => 'Kabupaten Badung, Bali',
        ];

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/v1/proyek', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.nama_proyek', 'Proyek Uji Lokasi')
            ->assertJsonPath('data.alamat_lengkap', 'Kabupaten Badung, Bali');

        $this->assertDatabaseHas('proyek', [
            'nama_proyek' => 'Proyek Uji Lokasi',
            'alamat_lengkap' => 'Kabupaten Badung, Bali',
        ]);
    }

    public function test_can_update_proyek_lokasi(): void
    {
        $proyek = Proyek::create([
            'id_user' => $this->user->id_user,
            'kode_proyek' => 'PRJ-TEST-LOK',
            'nama_proyek' => 'Proyek Uji Update Lokasi',
            'alamat_lengkap' => 'Lokasi Lama',
            'tujuan_valuasi' => 'Valuasi Ekonomi Ekosistem',
            'tahun' => 2026,
            'status' => 'Draft',
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson('/api/v1/proyek/' . $proyek->id_proyek, [
                'lokasi' => 'Kota Bandung, Jawa Barat',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.alamat_lengkap', 'Kota Bandung, Jawa Barat')
            ->assertJsonPath('data.kabupaten_kota.nama_kabupaten_kota', 'Kota Bandung');

        $proyek->refresh();
        $this->assertEquals('Kota Bandung, Jawa Barat', $proyek->alamat_lengkap);
        $this->assertEquals(3, $proyek->id_kabupaten_kota);
        $this->assertEquals(2, $proyek->id_provinsi);
    }
}
