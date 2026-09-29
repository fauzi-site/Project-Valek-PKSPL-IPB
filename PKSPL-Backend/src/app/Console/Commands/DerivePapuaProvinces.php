<?php

namespace App\Console\Commands;

use App\Models\AdministrativeBoundary;
use App\Support\BoundaryGeometryStore;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DerivePapuaProvinces extends Command
{
    protected $signature = 'boundaries:derive-papua-provinces';

    protected $description = 'Rebuild the six post-2022 Papua provinces from the regency polygons already imported';

    private const PAPUA_COMPOSITION = [
        '91' => ['Papua', ['9403', '9408', '9409', '9419', '9420', '9426', '9427', '9428', '9471']],
        '92' => ['Papua Barat', ['9101', '9102', '9103', '9104', '9105', '9111', '9112']],
        '93' => ['Papua Selatan', ['9401', '9413', '9414', '9415']],
        '94' => ['Papua Tengah', ['9404', '9410', '9411', '9412', '9433', '9434', '9435', '9436']],
        '95' => ['Papua Pegunungan', ['9402', '9416', '9417', '9418', '9429', '9430', '9431', '9432']],
        '96' => ['Papua Barat Daya', ['9106', '9107', '9108', '9109', '9110', '9171']],
    ];

    public function handle(): int
    {
        $regencyCount = AdministrativeBoundary::where('level', 2)->count();
        if ($regencyCount === 0) {
            $this->error('No level-2 (regency) boundaries found.');
            $this->line('Run boundaries:import for level 2 first.');

            return self::FAILURE;
        }

        $now = now();
        $built = 0;

        foreach (self::PAPUA_COMPOSITION as $provCode => [$name, $regencyCodes]) {
            $regencies = AdministrativeBoundary::where('level', 2)
                ->whereIn('code', $regencyCodes)
                ->get();

            if ($regencies->isEmpty()) {
                $this->warn("  {$name} ({$provCode}): no matching regencies found, skipped");
                continue;
            }

            $rings = [];
            $minLat = INF;
            $minLng = INF;
            $maxLat = -INF;
            $maxLng = -INF;

            foreach ($regencies as $reg) {
                if ($reg->min_lat !== null) {
                    $minLat = min($minLat, $reg->min_lat);
                    $minLng = min($minLng, $reg->min_lng);
                    $maxLat = max($maxLat, $reg->max_lat);
                    $maxLng = max($maxLng, $reg->max_lng);
                }

                $geojson = $reg->geojson;
                if (! $geojson) {
                    continue;
                }

                $visit = function ($geometry) use (&$visit, &$rings) {
                    if (! $geometry) return;
                    $type = $geometry['type'] ?? '';
                    if ($type === 'Polygon') {
                        if (! empty($geometry['coordinates'])) {
                            $rings[] = $geometry['coordinates'];
                        }
                    } elseif ($type === 'MultiPolygon') {
                        foreach ($geometry['coordinates'] as $poly) {
                            $rings[] = $poly;
                        }
                    }
                };

                if (($geojson['type'] ?? '') === 'FeatureCollection') {
                    foreach ($geojson['features'] ?? [] as $f) {
                        $visit($f['geometry'] ?? null);
                    }
                } else {
                    $visit($geojson);
                }
            }

            if (empty($rings)) {
                $this->warn("  {$name} ({$provCode}): regencies had no geometry files, skipped");
                continue;
            }

            $dissolved = count($rings) === 1
                ? ['type' => 'Polygon', 'coordinates' => $rings[0]]
                : ['type' => 'MultiPolygon', 'coordinates' => $rings];

            BoundaryGeometryStore::put(1, $provCode, $dissolved);

            DB::table('administrative_boundaries')->upsert([[
                'level' => 1,
                'code' => $provCode,
                'name' => $name,
                'parent_code' => null,
                'province_name' => $name,
                'min_lat' => is_finite($minLat) ? $minLat : null,
                'min_lng' => is_finite($minLng) ? $minLng : null,
                'max_lat' => is_finite($maxLat) ? $maxLat : null,
                'max_lng' => is_finite($maxLng) ? $maxLng : null,
                'created_at' => $now,
                'updated_at' => $now,
            ]], ['level', 'code'], ['name', 'min_lat', 'min_lng', 'max_lat', 'max_lng', 'updated_at']);

            $built++;
            $this->line("  composed {$name} ({$provCode}) from ".count($regencies).' regency polygons');
        }

        $this->newLine();
        $this->info("Done. Rebuilt {$built} Papua province boundaries.");

        return self::SUCCESS;
    }
}
