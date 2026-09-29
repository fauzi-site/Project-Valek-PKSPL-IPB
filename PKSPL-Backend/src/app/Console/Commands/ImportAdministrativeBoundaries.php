<?php

namespace App\Console\Commands;

use App\Models\AdministrativeBoundary;
use App\Support\BoundaryGeometryStore;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use ZipArchive;

class ImportAdministrativeBoundaries extends Command
{
    protected $signature = 'boundaries:import
        {--level=* : Levels to import (1=provinsi, 2=kabupaten/kota, 3=kecamatan, 4=kelurahan/desa). Defaults to all.}
        {--dir= : Directory holding pre-downloaded gadm41_IDN_<level>.json files, to skip downloading}
        {--fresh : Delete existing rows for each level before importing}';

    protected $description = 'Import Indonesian administrative boundary polygons (kabupaten/kota, kecamatan, kelurahan/desa) from the GADM dataset';

    private const SOURCE_URL = 'https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_IDN_%d.json.zip';

    public function handle(): int
    {
        $this->line('<comment>Preferred source: HDX "Indonesia - Subnational Administrative Boundaries"</comment>');
        $this->line('<comment>  (BPS / WFP / OCHA ROAP, CC BY-IGO) — full resolution.</comment>');
        $this->line('<comment>  Prepare with: node scripts/hdx-boundaries-to-ndjson.cjs <hdxDir> <outDir></comment>');
        $this->line('<comment>Fallback source: GADM 4.1 (gadm.org) — simplified geometry,</comment>');
        $this->line('<comment>  free for academic/non-commercial use only.</comment>');
        $this->newLine();

        ini_set('memory_limit', '2G');

        $levels = $this->option('level') ?: [1, 2, 3, 4];
        $workDir = $this->option('dir') ?: storage_path('app/gadm');

        if (! is_dir($workDir)) {
            mkdir($workDir, 0755, true);
        }

        foreach ($levels as $level) {
            $level = (int) $level;
            if (! in_array($level, [1, 2, 3, 4], true)) {
                $this->error("Unsupported level: {$level}");

                return self::FAILURE;
            }

            $ndjson = "{$workDir}/boundaries_level{$level}.ndjson";
            if (is_file($ndjson)) {
                $this->importNdjson($level, $ndjson);

                continue;
            }

            $path = $this->ensureFile($level, $workDir);
            if ($path === null) {
                return self::FAILURE;
            }

            $this->importLevel($level, $path);
        }

        $this->newLine();
        $this->info('Done. Row counts per level:');
        foreach (AdministrativeBoundary::selectRaw('level, count(*) as total')->groupBy('level')->orderBy('level')->get() as $row) {
            $this->line("  level {$row->level}: {$row->total}");
        }

        return self::SUCCESS;
    }

    private function ensureFile(int $level, string $workDir): ?string
    {
        $jsonPath = "{$workDir}/gadm41_IDN_{$level}.json";
        if (is_file($jsonPath)) {
            $this->line("Using existing file: {$jsonPath}");

            return $jsonPath;
        }

        $url = sprintf(self::SOURCE_URL, $level);
        $zipPath = "{$workDir}/gadm41_IDN_{$level}.json.zip";
        $this->info("Downloading level {$level} from {$url} ...");

        $source = @fopen($url, 'rb');
        if ($source === false) {
            $this->error("Could not download {$url}. Download it manually and pass --dir=<folder>.");

            return null;
        }
        $dest = fopen($zipPath, 'wb');
        stream_copy_to_stream($source, $dest);
        fclose($source);
        fclose($dest);

        $zip = new ZipArchive;
        if ($zip->open($zipPath) !== true) {
            $this->error("Failed to open {$zipPath}");

            return null;
        }
        $zip->extractTo($workDir);
        $zip->close();
        @unlink($zipPath);

        if (! is_file($jsonPath)) {
            $this->error("Expected {$jsonPath} after extraction but it is missing.");

            return null;
        }

        return $jsonPath;
    }

    private function importNdjson(int $level, string $path): void
    {
        $this->info("Importing level {$level} from ".basename($path).' ...');

        if ($this->option('fresh')) {
            $this->freshLevel($level);
        }

        $handle = fopen($path, 'r');
        $rows = [];
        $count = 0;
        $skipped = 0;
        $now = now();

        while (($line = fgets($handle)) !== false) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }

            $row = json_decode($line, true);
            if (! $row || empty($row['code']) || empty($row['geojson'])) {
                $skipped++;

                continue;
            }

            BoundaryGeometryStore::put($level, $row['code'], $row['geojson']);

            $rows[$row['code']] = [
                'level' => $level,
                'code' => $row['code'],
                'name' => $row['name'] ?? '',
                'parent_code' => $row['parent_code'] ?? null,
                'province_name' => $row['province_name'] ?? null,
                'min_lat' => $row['min_lat'],
                'min_lng' => $row['min_lng'],
                'max_lat' => $row['max_lat'],
                'max_lng' => $row['max_lng'],
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $count++;

            if (count($rows) >= 200) {
                $this->flush($rows);
                $rows = [];
                $this->output->write('.');
            }
        }
        fclose($handle);

        if ($rows) {
            $this->flush($rows);
        }

        $this->newLine();
        $this->line("  imported {$count} rows".($skipped ? ", skipped {$skipped}" : ''));
    }

    private function importLevel(int $level, string $path): void
    {
        $this->info("Importing level {$level} from ".basename($path).' ...');

        $data = json_decode(file_get_contents($path), true);
        if (! isset($data['features'])) {
            $this->error('Unexpected file format: no "features" key.');

            return;
        }

        if ($this->option('fresh')) {
            $this->freshLevel($level);
        }

        $bar = $this->output->createProgressBar(count($data['features']));
        $bar->start();

        $rows = [];
        $skipped = 0;
        $now = now();

        foreach ($data['features'] as $feature) {
            $props = $feature['properties'] ?? [];
            $code = $this->normalizeCode($props["CC_{$level}"] ?? null);

            // Handle duplicate code case by appending unique suffix if level code repeats for different regions
            if ($code === null) {
                $code = $this->normalizeCode($props["GID_{$level}"] ?? null);
            }

            if ($code === null) {
                $skipped++;
                $bar->advance();

                continue;
            }

            // If code is numeric and already in batch, fallback to GID or append
            if (isset($rows[$code])) {
                $code = $this->normalizeCode($props["GID_{$level}"] ?? "{$code}_".count($rows));
            }

            $geometry = $feature['geometry'] ?? null;
            $bbox = $geometry ? $this->boundingBox($geometry) : null;
            if ($bbox === null) {
                $skipped++;
                $bar->advance();

                continue;
            }

            BoundaryGeometryStore::put($level, $code, $geometry);

            $rows[$code] = [
                'level' => $level,
                'code' => $code,
                'name' => $this->spaceOutName($props["NAME_{$level}"] ?? ''),
                'parent_code' => $level > 1 ? $this->normalizeCode($props['CC_'.($level - 1)] ?? null) : null,
                'province_name' => $this->spaceOutName($props['NAME_1'] ?? ''),
                'min_lat' => $bbox['minLat'],
                'min_lng' => $bbox['minLng'],
                'max_lat' => $bbox['maxLat'],
                'max_lng' => $bbox['maxLng'],
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($rows) >= 500) {
                $this->flush($rows);
                $rows = [];
            }

            $bar->advance();
        }

        if ($rows) {
            $this->flush($rows);
        }

        $bar->finish();
        $this->newLine();
        if ($skipped) {
            $this->warn("  skipped {$skipped} feature(s) without a usable BPS code or geometry");
        }
    }

    private function freshLevel(int $level): void
    {
        AdministrativeBoundary::where('level', $level)->delete();

        $dir = BoundaryGeometryStore::baseDir()."/{$level}";
        if (is_dir($dir)) {
            $files = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::CHILD_FIRST
            );
            foreach ($files as $file) {
                $file->isDir() ? @rmdir($file->getPathname()) : @unlink($file->getPathname());
            }
            @rmdir($dir);
        }
    }

    private function flush(array $rows): void
    {
        DB::table('administrative_boundaries')->upsert(
            array_values($rows),
            ['level', 'code'],
            ['name', 'parent_code', 'province_name', 'min_lat', 'min_lng', 'max_lat', 'max_lng', 'updated_at']
        );
    }

    private function normalizeCode(?string $code): ?string
    {
        if ($code === null) {
            return null;
        }
        $code = trim($code);

        return ($code === '' || strtoupper($code) === 'NA') ? null : $code;
    }

    private function spaceOutName(string $name): string
    {
        if ($name === '' || strtoupper($name) === 'NA') {
            return $name;
        }

        return trim(preg_replace('/(?<=[a-z])(?=[A-Z])/', ' ', $name));
    }

    private function boundingBox(array $geometry): ?array
    {
        $minLat = INF;
        $minLng = INF;
        $maxLat = -INF;
        $maxLng = -INF;

        $walk = function ($coords) use (&$walk, &$minLat, &$minLng, &$maxLat, &$maxLng) {
            if (isset($coords[0]) && is_numeric($coords[0]) && isset($coords[1]) && is_numeric($coords[1])) {
                [$lng, $lat] = $coords;
                $minLat = min($minLat, $lat);
                $maxLat = max($maxLat, $lat);
                $minLng = min($minLng, $lng);
                $maxLng = max($maxLng, $lng);

                return;
            }
            foreach ($coords as $child) {
                if (is_array($child)) {
                    $walk($child);
                }
            }
        };

        $walk($geometry['coordinates'] ?? []);

        if (! is_finite($minLat) || ! is_finite($minLng)) {
            return null;
        }

        return ['minLat' => $minLat, 'minLng' => $minLng, 'maxLat' => $maxLat, 'maxLng' => $maxLng];
    }
}
