<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\AdministrativeBoundary;
use App\Support\BoundaryGeometryStore;

$boundaries = AdministrativeBoundary::where('level', 1)->orderBy('code')->get();

$features = [];

foreach ($boundaries as $b) {
    $geo = BoundaryGeometryStore::get(1, $b->code);
    if (!$geo) {
        echo "Missing geometry for {$b->code} ({$b->name})\n";
        continue;
    }

    $geomType = $geo['type'] ?? 'Polygon';
    $coords = $geo['coordinates'] ?? [];

    $features[] = [
        'type' => 'Feature',
        'properties' => [
            'id_1' => (int) $b->code,
            'code' => (string) $b->code,
            'name' => (string) $b->name,
            'state' => (string) $b->name,
            'Propinsi' => (string) $b->name,
        ],
        'geometry' => [
            'type' => $geomType,
            'coordinates' => $coords,
        ],
    ];
}

$fc = [
    'type' => 'FeatureCollection',
    'features' => $features,
];

$outputPath = '/var/www/html/public/indonesia-38-provinces.json';
file_put_contents($outputPath, json_encode($fc, JSON_UNESCAPED_UNICODE));

$localFrontendPath = __DIR__ . '/../../PKSPL-Project-Frontend/src/data/indonesia-38-provinces.json';
$localPublicPath = __DIR__ . '/../../PKSPL-Project-Frontend/public/indonesia-38-provinces.json';

@file_put_contents($localFrontendPath, json_encode($fc, JSON_UNESCAPED_UNICODE));
@file_put_contents($localPublicPath, json_encode($fc, JSON_UNESCAPED_UNICODE));

echo "Exported " . count($features) . " provinces to GeoJSON.\n";
