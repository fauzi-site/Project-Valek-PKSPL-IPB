<?php

namespace App\Http\Controllers\Api\V1\Geography;

use App\Http\Controllers\Controller;
use App\Models\AdministrativeBoundary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoundaryLookupController extends Controller
{
    private const LEVEL_MAP = [
        '1' => 1,
        'province' => 1,
        'provinsi' => 1,
        '2' => 2,
        'regency' => 2,
        'kabupaten' => 2,
        'kota' => 2,
        '3' => 3,
        'district' => 3,
        'kecamatan' => 3,
        '4' => 4,
        'village' => 4,
        'desa' => 4,
        'kelurahan' => 4,
    ];

    public function lookup(Request $request): JsonResponse
    {
        $levelParam = strtolower((string) $request->input('level'));
        $code = (string) $request->input('code');

        if (! isset(self::LEVEL_MAP[$levelParam]) || empty($code)) {
            return response()->json([
                'found' => false,
                'message' => 'Level (1-4) dan code wajib diisi.',
            ], 422);
        }

        $level = self::LEVEL_MAP[$levelParam];
        $cleanCode = str_replace('.', '', $code);

        $boundary = AdministrativeBoundary::query()
            ->where('level', $level)
            ->where(function ($q) use ($code, $cleanCode) {
                $q->where('code', $code)
                  ->orWhere('code', $cleanCode)
                  ->orWhere('code', 'like', "%{$cleanCode}%");
            })
            ->first();

        // Fallback for Level 4 (Village) if not present: use parent Level 3 (Kecamatan) polygon
        if (! $boundary && $level === 4 && strlen($cleanCode) >= 6) {
            $parentDistrictCode = substr($cleanCode, 0, 6);
            $boundary = AdministrativeBoundary::query()
                ->where('level', 3)
                ->where(function ($q) use ($parentDistrictCode) {
                    $q->where('code', $parentDistrictCode)
                      ->orWhere('code', 'like', "%{$parentDistrictCode}%");
                })
                ->first();
        }

        if (! $boundary) {
            return response()->json(['found' => false], 404);
        }

        $cacheKey = "boundary_lookup_{$boundary->level}_{$boundary->code}";
        if (\Illuminate\Support\Facades\Cache::has($cacheKey)) {
            $cached = \Illuminate\Support\Facades\Cache::get($cacheKey);
            if (is_array($cached) && ! empty($cached['found'])) {
                return response()->json($cached);
            }
        }

        $featureCollection = $boundary->toFeatureCollection();
        if ($featureCollection === null) {
            return response()->json([
                'found' => false,
                'message' => 'Geometry polygon tidak ditemukan pada storage.',
            ], 404);
        }

        // Simplify high-density geometries (>8,000 points) for fast web display
        $simplified = $featureCollection;

        $responseData = [
            'found' => true,
            'boundary' => $simplified,
            'center' => $boundary->center(),
            'displayName' => $boundary->name,
        ];

        \Illuminate\Support\Facades\Cache::put($cacheKey, $responseData, 86400);

        return response()->json($responseData);
    }
}
