<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Mengisi data master jasa ekosistem untuk setiap tutupan lahan. */
class DataMasterSeeder extends Seeder
{
    public function run(): void
    {
        $landCovers = DB::table('jenis_tutupan_lahan')
            ->join('indexes', 'indexes.id_index', '=', 'jenis_tutupan_lahan.id_index')
            ->join('proyek', 'proyek.id_proyek', '=', 'indexes.id_proyek')
            ->where('proyek.kode_proyek', '!=', 'PRJ-ANTAM')
            ->select('jenis_tutupan_lahan.*', 'indexes.id_proyek')
            ->orderBy('jenis_tutupan_lahan.id_jenis_tutupan_lahan')
            ->get();

        foreach ($landCovers as $landCover) {
            $project = DB::table('proyek')->where('id_proyek', $landCover->id_proyek)->first();
            $region = [
                'id_provinsi' => $project?->id_provinsi,
                'id_kabupaten_kota' => $project?->id_kabupaten_kota,
                'id_kecamatan' => $project?->id_kecamatan,
                'id_desa_kelurahan' => $project?->id_desa_kelurahan,
            ];
            $latinName = str_contains(strtolower((string) $landCover->nama_tutupan_lahan), 'mangrove')
                ? 'Rhizophora apiculata'
                : 'Enhalus acoroides';
            $localName = str_contains(strtolower((string) $landCover->nama_tutupan_lahan), 'mangrove')
                ? 'Bakau'
                : 'Lamun Tunjung';

            DB::table('provisioning_service')->updateOrInsert(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'nama_objek' => 'Hasil perikanan lokal'],
                array_merge([
                    'nama_latin' => $latinName,
                    'nama_daerah' => $localName,
                    'produktivitas' => 1.25,
                    'harga_pasar' => 35000,
                    'luas_pemanfaatan' => max((float) ($landCover->luas ?? 1), 1),
                    'satuan_luas' => $landCover->satuan_luas ?: 'Hektar',
                    'referensi' => 'Data master valuasi 2026',
                    'nilai' => 218750,
                    'kategori_tev' => 'DUV',
                ], $region)
            );

            DB::table('provisioning_service')->updateOrInsert(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'nama_objek' => 'Bahan pangan dan biota pesisir'],
                array_merge([
                    'nama_latin' => $latinName,
                    'nama_daerah' => $localName,
                    'produktivitas' => 0.75,
                    'harga_pasar' => 50000,
                    'luas_pemanfaatan' => max((float) ($landCover->luas ?? 1), 1),
                    'satuan_luas' => $landCover->satuan_luas ?: 'Hektar',
                    'referensi' => 'Data master valuasi 2026',
                    'nilai' => 187500,
                    'kategori_tev' => 'DUV',
                ], $region)
            );

            DB::table('regulating_service')->updateOrInsert(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'jenis_regulating' => 'Perlindungan pesisir'],
                array_merge([
                    'indikator' => 'Luas tutupan',
                    'satuan' => $landCover->satuan_luas ?: 'Hektar',
                    'nilai_indikator' => (float) ($landCover->luas ?? 1),
                    'referensi' => 'Peta tutupan lahan',
                    'nilai' => 150000000,
                    'kategori_tev' => 'IUV',
                ], $region)
            );

            DB::table('regulating_service')->updateOrInsert(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'jenis_regulating' => 'Penyimpanan karbon'],
                array_merge([
                    'indikator' => 'Estimasi stok karbon',
                    'satuan' => 'Ton CO2e',
                    'nilai_indikator' => 12.5,
                    'referensi' => 'Kajian karbon biru',
                    'nilai' => 95000000,
                    'kategori_tev' => 'IUV',
                ], $region)
            );

            DB::table('supporting_service')->updateOrInsert(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'fungsi_pendukung' => 'Habitat dan siklus nutrien'],
                array_merge([
                    'deskripsi' => 'Menopang keanekaragaman hayati dan siklus nutrien.',
                    'referensi' => 'Kajian ekologi 2025',
                    'nilai' => 75000000,
                    'kategori_tev' => 'OV',
                ], $region)
            );

            DB::table('supporting_service')->updateOrInsert(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'fungsi_pendukung' => 'Nursery ground biota'],
                array_merge([
                    'deskripsi' => 'Menyediakan area pembesaran biota pesisir.',
                    'referensi' => 'Data master valuasi 2026',
                    'nilai' => 62500000,
                    'kategori_tev' => 'OV',
                ], $region)
            );

            DB::table('cultural_service')->updateOrInsert(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'nama_aktivitas' => 'Wisata edukasi ekosistem'],
                array_merge([
                    'jumlah_pengunjung' => 1200,
                    'biaya_perjalanan' => 150000,
                    'frekuensi' => 1,
                    'referensi' => 'Survei pengunjung 2026',
                    'nilai' => 180000000,
                    'kategori_tev' => 'EV',
                ], $region)
            );

            DB::table('cultural_service')->updateOrInsert(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'nama_aktivitas' => 'Rekreasi dan fotografi alam'],
                array_merge([
                    'jumlah_pengunjung' => 800,
                    'biaya_perjalanan' => 100000,
                    'frekuensi' => 1,
                    'referensi' => 'Data master valuasi 2026',
                    'nilai' => 80000000,
                    'kategori_tev' => 'EV',
                ], $region)
            );
        }
    }
}
