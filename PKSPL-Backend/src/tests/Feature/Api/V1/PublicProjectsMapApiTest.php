<?php

namespace Tests\Feature\Api\V1;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PublicProjectsMapApiTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * Memverifikasi bahwa endpoint peta proyek publik dapat diakses tanpa token autentikasi.
     */
    public function test_public_projects_map_is_accessible_without_authentication(): void
    {
        $response = $this->getJson('/api/v1/public/projects/map');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'count',
                'data' => [
                    '*' => [
                        'id',
                        'id_proyek',
                        'kode_proyek',
                        'nama_proyek',
                        'name',
                        'latitude',
                        'longitude',
                        'coords',
                        'luas',
                        'satuan_luas',
                        'provinsi',
                        'kabupaten',
                        'kabupaten_kota',
                        'status',
                        'category',
                        'tev',
                        'total_tev',
                        'ringkasan',
                        'deskripsi',
                    ],
                ],
            ]);

        $json = $response->json();
        $this->assertEquals('success', $json['status']);
        $this->assertGreaterThan(0, $json['count']);
        $this->assertCount($json['count'], $json['data']);
    }

    /**
     * Memverifikasi seluruh proyek yang dikembalikan memiliki koordinat numerik yang valid.
     */
    public function test_public_projects_map_coordinates_are_valid(): void
    {
        $response = $this->getJson('/api/v1/public/projects/map');
        $response->assertStatus(200);

        $projects = $response->json('data');
        foreach ($projects as $project) {
            $lat = $project['latitude'];
            $lng = $project['longitude'];

            $this->assertNotNull($lat);
            $this->assertNotNull($lng);
            $this->assertIsFloat($lat);
            $this->assertIsFloat($lng);
            $this->assertGreaterThanOrEqual(-90, $lat);
            $this->assertLessThanOrEqual(90, $lat);
            $this->assertGreaterThanOrEqual(-180, $lng);
            $this->assertLessThanOrEqual(180, $lng);
        }
    }

    /**
     * Memverifikasi bahwa data sensitif / internal tidak diekspos ke publik.
     */
    public function test_public_projects_map_does_not_leak_sensitive_internal_fields(): void
    {
        $response = $this->getJson('/api/v1/public/projects/map');
        $response->assertStatus(200);

        $projects = $response->json('data');
        foreach ($projects as $project) {
            $this->assertArrayNotHasKey('reviewer', $project);
            $this->assertArrayNotHasKey('reviewed_by', $project);
            $this->assertArrayNotHasKey('user', $project);
            $this->assertArrayNotHasKey('notes', $project);
            $this->assertArrayNotHasKey('analyst_comment', $project);
            $this->assertArrayNotHasKey('catatan_revisi', $project);
            $this->assertArrayNotHasKey('attentionReason', $project);
        }
    }
}
