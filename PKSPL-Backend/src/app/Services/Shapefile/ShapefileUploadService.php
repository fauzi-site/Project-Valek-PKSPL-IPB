<?php

namespace App\Services\Shapefile;

use App\Models\Proyek;
use Illuminate\Http\UploadedFile;

/** Stores shapefile components now, leaving parsing/import orchestration for a later implementation. */
class ShapefileUploadService
{
    /** @param array<string, mixed> $files */
    public function store(Proyek $proyek, array $files): array
    {
        $stored = $proyek->shapefile_files ?? [];

        foreach ($files as $component => $file) {
            if (is_array($file)) {
                foreach ($file as $subKey => $subFile) {
                    if ($subFile instanceof UploadedFile) {
                        $ext = strtolower($subFile->getClientOriginalExtension());
                        $key = is_string($subKey) ? $subKey : ($ext ?: (string) $component);
                        $stored[$key] = $subFile->store(
                            "proyek/{$proyek->id_proyek}/shapefile",
                            config('filesystems.default'),
                        );
                    }
                }
            } elseif ($file instanceof UploadedFile) {
                $stored[$component] = $file->store(
                    "proyek/{$proyek->id_proyek}/shapefile",
                    config('filesystems.default'),
                );
            }
        }

        return $stored;
    }
}
