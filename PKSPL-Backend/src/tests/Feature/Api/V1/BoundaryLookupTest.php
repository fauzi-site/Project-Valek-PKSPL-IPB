<?php

namespace Tests\Feature\Api\V1;

use App\Models\AdministrativeBoundary;
use App\Support\BoundaryGeometryStore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoundaryLookupTest extends TestCase
{
    use RefreshDatabase;

    public function test_boundary_lookup_returns_422_when_level_or_code_missing(): void
    {
        $response = $this->getJson('/api/v1/boundary-lookup');

        $response->assertStatus(422)
            ->assertJson(['found' => false]);
    }

    public function test_boundary_lookup_returns_404_when_boundary_code_not_found(): void
    {
        $response = $this->getJson('/api/v1/boundary-lookup?level=1&code=NONEXISTENT');

        $response->assertStatus(404)
            ->assertJson(['found' => false]);
    }

    public function test_boundary_lookup_returns_geojson_when_found(): void
    {
        // Mock a geometry store file
        $level = 1;
        $code = '32';
        $name = 'Jawa Barat';
        $dummyPolygon = [
            'type' => 'Polygon',
            'coordinates' => [
                [[107.0, -6.5], [107.5, -6.5], [107.5, -7.0], [107.0, -7.0], [107.0, -6.5]]
            ],
        ];

        BoundaryGeometryStore::put($level, $code, $dummyPolygon);

        AdministrativeBoundary::create([
            'level' => $level,
            'code' => $code,
            'name' => $name,
            'min_lat' => -7.0,
            'min_lng' => 107.0,
            'max_lat' => -6.5,
            'max_lng' => 107.5,
        ]);

        $response = $this->getJson("/api/v1/boundary-lookup?level=1&code={$code}");

        $response->assertStatus(200)
            ->assertJson([
                'found' => true,
                'displayName' => 'Jawa Barat',
                'center' => [
                    'lat' => -6.75,
                    'lng' => 107.25,
                ],
                'boundary' => [
                    'type' => 'FeatureCollection',
                    'features' => [
                        [
                            'type' => 'Feature',
                            'geometry' => $dummyPolygon,
                        ]
                    ]
                ]
            ]);
    }

    public function test_boundary_lookup_supports_string_level_aliases(): void
    {
        $level = 2;
        $code = '3209';
        $name = 'Kabupaten Cirebon';
        $dummyPolygon = [
            'type' => 'Polygon',
            'coordinates' => [
                [[108.5, -6.7], [108.8, -6.7], [108.8, -6.9], [108.5, -6.9], [108.5, -6.7]]
            ],
        ];

        BoundaryGeometryStore::put($level, $code, $dummyPolygon);

        AdministrativeBoundary::create([
            'level' => $level,
            'code' => $code,
            'name' => $name,
            'min_lat' => -6.9,
            'min_lng' => 108.5,
            'max_lat' => -6.7,
            'max_lng' => 108.8,
        ]);

        $response = $this->getJson("/api/v1/boundary-lookup?level=regency&code={$code}");

        $response->assertStatus(200)
            ->assertJson([
                'found' => true,
                'displayName' => 'Kabupaten Cirebon',
            ]);
    }
}
