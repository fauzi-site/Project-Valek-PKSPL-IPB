<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Mengisi area terdampak yang terkait proyek dan ekosistem.
 * Dijalankan setelah proyek contoh dibuat; area dilewati bila proyeknya tidak ada.
 */
class AreaTerdampakSeeder extends Seeder
{
    public function run(): void
    {
        $areas = [
            ['Sabuk Mangrove Teluk Benoa', 'Valuasi Jasa Ekosistem Mangrove Teluk Benoa', 'Mangrove', -8.747000, 115.210000, 158.00],
            ['Karang Nusa Penida', 'Kajian Valuasi Terumbu Karang Nusa Penida', 'Terumbu Karang', -8.725000, 115.545000, 1850.00],
            ['Terumbu Karang Pulau Pramuka', 'Kajian Valuasi Ekonomi Wisata dan Ekosistem Pesisir Pulau Pramuka', 'Terumbu Karang', -5.745800, 106.614800, 79.86],
        ];

        foreach ($areas as [$nama, $proyek, $ekosistem, $lat, $lng, $luas]) {
            // Program lintas tahun memakai nama sama: ambil yang terbaru.
            $idProyek = DB::table('proyek')->where('nama_proyek', $proyek)->orderByDesc('tahun')->value('id_proyek');
            $idEkosistem = DB::table('ekosistem')->where('nama_ekosistem', $ekosistem)->value('id_ekosistem');
            if (!$idProyek || !$idEkosistem) {
                continue;
            }

            DB::table('area_terdampak')->updateOrInsert(
                ['nama_area' => $nama],
                [
                    'id_proyek' => $idProyek,
                    'id_ekosistem' => $idEkosistem,
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'luas' => $luas,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Area contoh untuk pengukuran jasa ekosistem.',
                ]
            );
        }
    }
}
