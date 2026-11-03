<?php

namespace App\Services\Valuation;

use Illuminate\Support\Facades\DB;

/**
 * Menghitung TEV per proyek untuk halaman publik (peta dan statistik beranda)
 * langsung dari data valuasi yang tersimpan, bukan dari angka tetap.
 *
 * Prioritas sumber: total baris Data Valuasi, lalu manfaat (benefits), lalu hasil_valuasi.
 */
class ProjectTevResolver
{
    /**
     * @param  iterable<int>  $projectIds
     * @return array<int, float> id_proyek => TEV (0 bila belum ada data valuasi)
     */
    public function forProjects(iterable $projectIds): array
    {
        $ids = collect($projectIds)->map(fn ($id) => (int) $id)->unique()->values()->all();
        if (empty($ids)) {
            return [];
        }

        $rows = DB::table('valuation_rows')
            ->join('jenis_tutupan_lahan', 'valuation_rows.id_jenis_tutupan_lahan', '=', 'jenis_tutupan_lahan.id_jenis_tutupan_lahan')
            ->join('indexes', 'jenis_tutupan_lahan.id_index', '=', 'indexes.id_index')
            ->whereIn('indexes.id_proyek', $ids)
            ->groupBy('indexes.id_proyek')
            ->selectRaw('indexes.id_proyek as id, SUM(valuation_rows.total_nilai) as total')
            ->pluck('total', 'id');

        $benefits = DB::table('benefits')
            ->whereIn('id_proyek', $ids)
            ->groupBy('id_proyek')
            ->selectRaw('id_proyek as id, SUM(value) as total')
            ->pluck('total', 'id');

        $hasil = DB::table('hasil_valuasi')
            ->join('jenis_tutupan_lahan', 'hasil_valuasi.id_jenis_tutupan_lahan', '=', 'jenis_tutupan_lahan.id_jenis_tutupan_lahan')
            ->join('indexes', 'jenis_tutupan_lahan.id_index', '=', 'indexes.id_index')
            ->whereIn('indexes.id_proyek', $ids)
            ->groupBy('indexes.id_proyek')
            ->selectRaw('indexes.id_proyek as id, SUM(hasil_valuasi.tev) as total')
            ->pluck('total', 'id');

        $result = [];
        foreach ($ids as $id) {
            $result[$id] = match (true) {
                (float) ($rows[$id] ?? 0) > 0 => (float) $rows[$id],
                (float) ($benefits[$id] ?? 0) > 0 => (float) $benefits[$id],
                (float) ($hasil[$id] ?? 0) > 0 => (float) $hasil[$id],
                default => 0.0,
            };
        }

        return $result;
    }

    /** Format ringkas untuk kartu publik; 'Belum tersedia' bila belum ada nilai. */
    public function format(float $tev): string
    {
        return match (true) {
            $tev <= 0 => 'Belum tersedia',
            $tev >= 1e12 => 'Rp ' . number_format($tev / 1e12, 2, ',', '.') . ' T/thn',
            $tev >= 1e9 => 'Rp ' . number_format($tev / 1e9, 2, ',', '.') . ' M/thn',
            $tev >= 1e6 => 'Rp ' . number_format($tev / 1e6, 2, ',', '.') . ' Juta/thn',
            default => 'Rp ' . number_format($tev, 0, ',', '.') . '/thn',
        };
    }
}
