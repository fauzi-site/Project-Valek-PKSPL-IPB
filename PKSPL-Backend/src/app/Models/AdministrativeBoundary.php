<?php

namespace App\Models;

use App\Support\BoundaryGeometryStore;
use Illuminate\Database\Eloquent\Model;

class AdministrativeBoundary extends Model
{
    public const LEVEL_PROVINCE = 1;  // Provinsi

    public const LEVEL_REGENCY = 2;   // Kabupaten/Kota

    public const LEVEL_DISTRICT = 3;  // Kecamatan

    public const LEVEL_VILLAGE = 4;   // Kelurahan/Desa

    protected $table = 'administrative_boundaries';

    protected $fillable = [
        'level', 'code', 'name', 'parent_code', 'province_name',
        'min_lat', 'min_lng', 'max_lat', 'max_lng',
    ];

    protected $casts = [
        'level' => 'integer',
        'min_lat' => 'float',
        'min_lng' => 'float',
        'max_lat' => 'float',
        'max_lng' => 'float',
    ];

    private ?array $geometryCache = null;

    public function getGeojsonAttribute(): ?array
    {
        return $this->geometryCache ??= BoundaryGeometryStore::get($this->level, $this->code);
    }

    public function hasGeometry(): bool
    {
        return BoundaryGeometryStore::has($this->level, $this->code);
    }

    public function center(): array
    {
        return [
            'lat' => ($this->min_lat + $this->max_lat) / 2,
            'lng' => ($this->min_lng + $this->max_lng) / 2,
        ];
    }

    public function toFeatureCollection(): ?array
    {
        $geometry = $this->geojson;
        if ($geometry === null) {
            return null;
        }

        return [
            'type' => 'FeatureCollection',
            'features' => [[
                'type' => 'Feature',
                'properties' => ['name' => $this->name],
                'geometry' => $geometry,
            ]],
        ];
    }
}
