<?php

namespace App\Services\Shapefile;

use App\Models\Proyek;

/** Extension point for a future SHP parser (GDAL/PostGIS import, geometry validation, and layer mapping). */
class ShapefileImportService
{
    public function prepare(Proyek $proyek): array
    {
        return [
            'status' => 'pending_parser',
            'files' => $proyek->shapefile_files ?? [],
        ];
    }
}
