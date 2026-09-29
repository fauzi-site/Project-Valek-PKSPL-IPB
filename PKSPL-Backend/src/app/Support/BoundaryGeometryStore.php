<?php

namespace App\Support;

class BoundaryGeometryStore
{
    public const PRECISION = 5;

    private const GZIP_LEVEL = 6;

    public static function baseDir(): string
    {
        return config('boundaries.geometry_path') ?? storage_path('app/boundaries');
    }

    public static function path(int $level, string $code): string
    {
        $shard = strlen($code) > 4 ? '/'.substr($code, 0, 4) : '';

        return self::baseDir()."/{$level}{$shard}/{$code}.json.gz";
    }

    /**
     * @return int bytes written
     */
    public static function put(int $level, string $code, array $geometry): int
    {
        $path = self::path($level, $code);
        $dir = dirname($path);

        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $payload = gzencode(json_encode(self::round($geometry)), self::GZIP_LEVEL);
        file_put_contents($path, $payload);

        return strlen($payload);
    }

    public static function get(int $level, string $code): ?array
    {
        $path = self::path($level, $code);
        if (! is_file($path)) {
            return null;
        }

        $raw = gzdecode(file_get_contents($path));
        if ($raw === false) {
            return null;
        }

        return json_decode($raw, true) ?: null;
    }

    public static function has(int $level, string $code): bool
    {
        return is_file(self::path($level, $code));
    }

    /**
     * Automatically simplifies high-density GeoJSON polygons for web display performance.
     */
    public static function simplify(array $geojson, int $maxTargetPoints = 8000): array
    {
        $count = self::countPoints($geojson);
        if ($count <= $maxTargetPoints) {
            return $geojson;
        }

        $tolerances = [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005];
        $current = $geojson;

        foreach ($tolerances as $tol) {
            $sqTol = $tol * $tol;
            $simplified = self::simplifyGeoJsonStruct($current, $sqTol);
            $newCount = self::countPoints($simplified);
            if ($newCount > 0) {
                $current = $simplified;
                if ($newCount <= $maxTargetPoints) {
                    break;
                }
            }
        }

        return $current;
    }

    public static function countPoints(array $geojson): int
    {
        $count = 0;
        array_walk_recursive($geojson, function ($v) use (&$count) {
            $count++;
        });

        return (int) ($count / 2);
    }

    private static function round(array $geometry): array
    {
        if (isset($geometry['coordinates'])) {
            self::roundCoordinates($geometry['coordinates']);
        }

        return $geometry;
    }

    private static function roundCoordinates(array &$coords): void
    {
        if (isset($coords[0]) && is_numeric($coords[0]) && isset($coords[1]) && is_numeric($coords[1])) {
            $coords[0] = round($coords[0], self::PRECISION);
            $coords[1] = round($coords[1], self::PRECISION);

            return;
        }

        foreach ($coords as &$child) {
            if (is_array($child)) {
                self::roundCoordinates($child);
            }
        }
    }

    private static function simplifyGeoJsonStruct(array $struct, float $sqTolerance): array
    {
        $type = $struct['type'] ?? '';

        if ($type === 'FeatureCollection') {
            $features = [];
            foreach ($struct['features'] ?? [] as $f) {
                $f['geometry'] = self::simplifyGeometry($f['geometry'] ?? [], $sqTolerance);
                $features[] = $f;
            }
            $struct['features'] = $features;

            return $struct;
        }

        if ($type === 'Feature') {
            $struct['geometry'] = self::simplifyGeometry($struct['geometry'] ?? [], $sqTolerance);

            return $struct;
        }

        return self::simplifyGeometry($struct, $sqTolerance);
    }

    private static function simplifyGeometry(array $geometry, float $sqTolerance): array
    {
        $type = $geometry['type'] ?? '';

        if ($type === 'Polygon') {
            $rings = [];
            foreach ($geometry['coordinates'] ?? [] as $ring) {
                $rings[] = self::simplifyRing($ring, $sqTolerance);
            }
            $geometry['coordinates'] = $rings;

            return $geometry;
        }

        if ($type === 'MultiPolygon') {
            $polygons = [];
            foreach ($geometry['coordinates'] ?? [] as $poly) {
                $rings = [];
                foreach ($poly as $ring) {
                    $rings[] = self::simplifyRing($ring, $sqTolerance);
                }
                $polygons[] = $rings;
            }
            $geometry['coordinates'] = $polygons;

            return $geometry;
        }

        return $geometry;
    }

    private static function simplifyRing(array $ring, float $sqTolerance): array
    {
        if (count($ring) < 4) {
            return $ring;
        }

        $simplified = self::douglasPeucker($ring, $sqTolerance);
        if (count($simplified) < 4) {
            return $ring;
        }

        $first = $simplified[0];
        $last = $simplified[count($simplified) - 1];
        if ($first[0] !== $last[0] || $first[1] !== $last[1]) {
            $simplified[] = [$first[0], $first[1]];
        }

        return $simplified;
    }

    private static function douglasPeucker(array $points, float $sqTolerance): array
    {
        $len = count($points);
        if ($len <= 2) {
            return $points;
        }

        $dmax = 0;
        $index = 0;
        $end = $len - 1;

        for ($i = 1; $i < $end; $i++) {
            $d = self::perpendicularDistanceSq($points[$i], $points[0], $points[$end]);
            if ($d > $dmax) {
                $index = $i;
                $dmax = $d;
            }
        }

        if ($dmax > $sqTolerance) {
            $rec1 = self::douglasPeucker(array_slice($points, 0, $index + 1), $sqTolerance);
            $rec2 = self::douglasPeucker(array_slice($points, $index), $sqTolerance);

            return array_merge(array_slice($rec1, 0, count($rec1) - 1), $rec2);
        }

        return [$points[0], $points[$end]];
    }

    private static function perpendicularDistanceSq(array $p, array $a, array $b): float
    {
        $x = $a[0];
        $y = $a[1];
        $dx = $b[0] - $x;
        $dy = $b[1] - $y;

        if ($dx != 0 || $dy != 0) {
            $t = (($p[0] - $x) * $dx + ($p[1] - $y) * $dy) / ($dx * $dx + $dy * $dy);
            if ($t > 1) {
                $x = $b[0];
                $y = $b[1];
            } elseif ($t > 0) {
                $x += $dx * $t;
                $y += $dy * $t;
            }
        }

        $dx = $p[0] - $x;
        $dy = $p[1] - $y;

        return $dx * $dx + $dy * $dy;
    }
}
