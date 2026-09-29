<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Mengisi dataset referensi dan basis pengetahuan AI. */
class ReferensiSeeder extends Seeder
{
    /** Menyimpan minimal tiga data realistis untuk setiap tabel referensi. */
    public function run(): void
    {
        foreach ([
            ['Peta Tutupan Lahan Indonesia 2025', 'Spasial', 2025, 'datasets/tutupan-lahan-2025.geojson', 'GeoJSON', 'Kementerian Lingkungan Hidup', 'Data tutupan lahan untuk analisis awal.'],
            ['Statistik Kelautan dan Perikanan 2024', 'Statistik', 2024, 'datasets/statistik-perikanan-2024.csv', 'CSV', 'Badan Pusat Statistik', 'Data produksi dan nilai ekonomi perikanan.'],
            ['Inventarisasi Mangrove Nasional 2023', 'Ekologi', 2023, 'datasets/inventarisasi-mangrove-2023.pdf', 'PDF', 'BRIN', 'Referensi sebaran dan kondisi mangrove nasional.'],
        ] as [$nama, $kategori, $tahun, $file, $tipe, $sumber, $deskripsi]) {
            DB::table('dataset_referensi')->updateOrInsert(['nama_dataset' => $nama], ['kategori' => $kategori, 'tahun' => $tahun, 'file_dataset' => $file, 'tipe_file' => $tipe, 'sumber' => $sumber, 'deskripsi' => $deskripsi, 'status' => 'Aktif']);
        }

        foreach ([
            ['Knowledge Base Valuasi Ekosistem', '1.0.0', 'knowledge-base/valuasi-ekosistem', 'Vector DB', 'text-embedding-3-small', 128],
            ['Knowledge Base Ekosistem Pesisir', '1.2.0', 'knowledge-base/ekosistem-pesisir', 'Vector DB', 'text-embedding-3-small', 96],
            ['Arsip Regulasi Lingkungan', '2026.1', 'knowledge-base/regulasi-lingkungan', 'PDF', 'text-embedding-3-large', 64],
        ] as [$nama, $versi, $path, $jenis, $embedding, $dokumen]) {
            DB::table('basis_data_ai')->updateOrInsert(['nama_basis' => $nama], ['versi' => $versi, 'deskripsi' => 'Koleksi referensi terkurasi untuk analisis aplikasi.', 'path_file' => $path, 'status' => 'Aktif', 'jenis_basis' => $jenis, 'model_embedding' => $embedding, 'jumlah_dokumen' => $dokumen]);
        }
    }
}
