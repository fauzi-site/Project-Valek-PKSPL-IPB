<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KotaBogorAndGlobalMasterSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Pastikan Provinsi Jawa Barat, Jawa Timur, dan Sulawesi Selatan terdaftar
        $jabar = DB::table('provinsi')->where('kode_provinsi', '32')->first();
        if (!$jabar) {
            $idJabar = DB::table('provinsi')->insertGetId([
                'kode_provinsi' => '32',
                'nama_provinsi' => 'Jawa Barat',
                'created_at' => now(),
                'updated_at' => now(),
            ], 'id_provinsi');
        } else {
            $idJabar = $jabar->id_provinsi;
        }

        $jatim = DB::table('provinsi')->where('kode_provinsi', '35')->first();
        if (!$jatim) {
            $idJatim = DB::table('provinsi')->insertGetId([
                'kode_provinsi' => '35',
                'nama_provinsi' => 'Jawa Timur',
                'created_at' => now(),
                'updated_at' => now(),
            ], 'id_provinsi');
        } else {
            $idJatim = $jatim->id_provinsi;
        }

        $sulsel = DB::table('provinsi')->where('kode_provinsi', '73')->first();
        if (!$sulsel) {
            $idSulsel = DB::table('provinsi')->insertGetId([
                'kode_provinsi' => '73',
                'nama_provinsi' => 'Sulawesi Selatan',
                'created_at' => now(),
                'updated_at' => now(),
            ], 'id_provinsi');
        } else {
            $idSulsel = $sulsel->id_provinsi;
        }

        // 2. Daftarkan Kabupaten/Kota: Kota Bogor, Kota Surabaya, Kota Makassar
        $kabBogor = DB::table('kabupaten_kota')->where('nama_kabupaten_kota', 'Kota Bogor')->first();
        if (!$kabBogor) {
            $idBogor = DB::table('kabupaten_kota')->insertGetId([
                'id_provinsi' => $idJabar,
                'kode_kabupaten_kota' => '3271',
                'nama_kabupaten_kota' => 'Kota Bogor',
                'tipe' => 'Kota',
                'created_at' => now(),
                'updated_at' => now(),
            ], 'id_kabupaten_kota');
        } else {
            $idBogor = $kabBogor->id_kabupaten_kota;
        }

        $kabSurabaya = DB::table('kabupaten_kota')->where('nama_kabupaten_kota', 'Kota Surabaya')->first();
        if (!$kabSurabaya) {
            $idSurabaya = DB::table('kabupaten_kota')->insertGetId([
                'id_provinsi' => $idJatim,
                'kode_kabupaten_kota' => '3578',
                'nama_kabupaten_kota' => 'Kota Surabaya',
                'tipe' => 'Kota',
                'created_at' => now(),
                'updated_at' => now(),
            ], 'id_kabupaten_kota');
        } else {
            $idSurabaya = $kabSurabaya->id_kabupaten_kota;
        }

        $kabMakassar = DB::table('kabupaten_kota')->where('nama_kabupaten_kota', 'Kota Makassar')->first();
        if (!$kabMakassar) {
            $idMakassar = DB::table('kabupaten_kota')->insertGetId([
                'id_provinsi' => $idSulsel,
                'kode_kabupaten_kota' => '7371',
                'nama_kabupaten_kota' => 'Kota Makassar',
                'tipe' => 'Kota',
                'created_at' => now(),
                'updated_at' => now(),
            ], 'id_kabupaten_kota');
        } else {
            $idMakassar = $kabMakassar->id_kabupaten_kota;
        }

        // 3. Tambahkan / Update Proyek Uji untuk Kota Bogor jika belum ada (misal PRJ-003 dialihkan atau PRJ-012)
        // Kita juga pastikan PRJ-001 (Kabupaten Bandung), PRJ-002 (Jakarta), PRJ-003 (Kota Bogor atau Badung)
        $penelitiUser = DB::table('users')->where('email', 'peneliti@gmail.com')->first();
        $idPeneliti = $penelitiUser ? $penelitiUser->id_user : 4;

        $proyekBogor = DB::table('proyek')->where('kode_proyek', 'PRJ-012')->first();
        if (!$proyekBogor) {
            DB::table('proyek')->insert([
                'id_user' => $idPeneliti,
                'kode_proyek' => 'PRJ-012',
                'id_provinsi' => $idJabar,
                'id_kabupaten_kota' => $idBogor,
                'nama_proyek' => 'Valuasi Ekosistem Daerah Aliran Sungai & Situ Kota Bogor',
                'tujuan_valuasi' => 'Valuasi jasa hidrologi, retensi air, dan rekreasi danau perkotaan Bogor.',
                'alamat_lengkap' => 'Kawasan Konservasi Situ Gede & DAS Ciliwung, Kota Bogor',
                'latitude' => -6.595038,
                'longitude' => 106.797241,
                'luas' => 180.50,
                'satuan_luas' => 'Ha',
                'tahun' => 2026,
                'status' => 'Proses',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 4. Seed Data Master khusus Kota Bogor
        $firstLc = DB::table('jenis_tutupan_lahan')->first();
        $defaultLcId = $firstLc ? $firstLc->id_jenis_tutupan_lahan : 1;

        $bogorRegion = [
            'id_provinsi' => $idJabar,
            'id_kabupaten_kota' => $idBogor,
            'id_jenis_tutupan_lahan' => $defaultLcId,
        ];

        // Provisioning Services Kota Bogor
        $provBogor = [
            ['nama_objek' => 'Talas Sutra Bogor', 'nama_latin' => 'Colocasia esculenta', 'nama_daerah' => 'Talas Bogor', 'produktivitas' => 12.5, 'harga_pasar' => 25000, 'satuan_luas' => 'Ton/Ha'],
            ['nama_objek' => 'Ikan Gurame Air Tawar Situ', 'nama_latin' => 'Osphronemus goramy', 'nama_daerah' => 'Gurame Bogor', 'produktivitas' => 2.8, 'harga_pasar' => 65000, 'satuan_luas' => 'Ton/Ha'],
            ['nama_objek' => 'Pala Bogor Tradisional', 'nama_latin' => 'Myristica fragrans', 'nama_daerah' => 'Pala', 'produktivitas' => 1.5, 'harga_pasar' => 85000, 'satuan_luas' => 'Ton/Ha'],
            ['nama_objek' => 'Bambu Betung Kawasan Tangkapan Air', 'nama_latin' => 'Dendrocalamus asper', 'nama_daerah' => 'Awi Bitung', 'produktivitas' => 180.0, 'harga_pasar' => 35000, 'satuan_luas' => 'Batang/Ha'],
        ];

        foreach ($provBogor as $p) {
            DB::table('provisioning_service')->updateOrInsert(
                ['nama_objek' => $p['nama_objek'], 'id_kabupaten_kota' => $idBogor],
                array_merge([
                    'nama_latin' => $p['nama_latin'],
                    'nama_daerah' => $p['nama_daerah'],
                    'produktivitas' => $p['produktivitas'],
                    'harga_pasar' => $p['harga_pasar'],
                    'luas_pemanfaatan' => 1.0,
                    'satuan_luas' => $p['satuan_luas'],
                    'referensi' => 'Survei Pasar Agribisnis Kota Bogor 2026',
                    'nilai' => $p['produktivitas'] * $p['harga_pasar'],
                    'kategori_tev' => 'DUV',
                ], $bogorRegion)
            );
        }

        // Regulating Services Kota Bogor
        $regBogor = [
            ['jenis_regulating' => 'Retensi Air Hujan & Pencegah Banjir DAS', 'indikator' => 'Kapasitas resapan pori tanah perkotaan', 'satuan' => 'm³/ha/tahun', 'nilai' => 85000000],
            ['jenis_regulating' => 'Serapan Karbon Hutan Kota & Kebun Raya', 'indikator' => 'Biomassa tegakan pohon heterogen', 'satuan' => 'Ton CO2e/ha', 'nilai' => 110000000],
            ['jenis_regulating' => 'Purifikasi Air Alami Situ Gede', 'indikator' => 'Koefisien sedimentasi dan filtrasi alami', 'satuan' => 'm³/hari', 'nilai' => 65000000],
        ];

        foreach ($regBogor as $r) {
            DB::table('regulating_service')->updateOrInsert(
                ['jenis_regulating' => $r['jenis_regulating'], 'id_kabupaten_kota' => $idBogor],
                array_merge([
                    'indikator' => $r['indikator'],
                    'satuan' => $r['satuan'],
                    'nilai_indikator' => 1.0,
                    'referensi' => 'Kajian Hidrologi IPB University',
                    'nilai' => $r['nilai'],
                    'kategori_tev' => 'IUV',
                ], $bogorRegion)
            );
        }

        // Supporting Services Kota Bogor
        $supBogor = [
            ['fungsi_pendukung' => 'Kantung Plasma Nutfah & Habitat Mikrofauna', 'deskripsi' => 'Preservasi plasma nutfah flora tropis dan avifauna endemik', 'nilai' => 95000000],
            ['fungsi_pendukung' => 'Siklus Hara & Biopori Organik', 'deskripsi' => 'Dekomposisi serasah alami dan kesuburan humus tanah', 'nilai' => 45000000],
        ];

        foreach ($supBogor as $s) {
            DB::table('supporting_service')->updateOrInsert(
                ['fungsi_pendukung' => $s['fungsi_pendukung'], 'id_kabupaten_kota' => $idBogor],
                array_merge([
                    'deskripsi' => $s['deskripsi'],
                    'referensi' => 'Kajian Konservasi Hayati Kota Bogor',
                    'nilai' => $s['nilai'],
                    'kategori_tev' => 'OV',
                ], $bogorRegion)
            );
        }

        // Cultural Services Kota Bogor
        $culBogor = [
            ['nama_aktivitas' => 'Ekowisata & Rekreasi Situ Gede', 'jumlah_pengunjung' => 1500, 'biaya_perjalanan' => 50000, 'frekuensi' => 1, 'nilai' => 75000000],
            ['nama_aktivitas' => 'Edukasi Konservasi & Wisata Riset Botani', 'jumlah_pengunjung' => 1100, 'biaya_perjalanan' => 50000, 'frekuensi' => 1, 'nilai' => 55000000],
        ];

        foreach ($culBogor as $c) {
            DB::table('cultural_service')->updateOrInsert(
                ['nama_aktivitas' => $c['nama_aktivitas'], 'id_kabupaten_kota' => $idBogor],
                array_merge([
                    'jumlah_pengunjung' => $c['jumlah_pengunjung'],
                    'biaya_perjalanan' => $c['biaya_perjalanan'],
                    'frekuensi' => $c['frekuensi'],
                    'referensi' => 'Dinas Pariwisata Kota Bogor 2026',
                    'nilai' => $c['nilai'],
                    'kategori_tev' => 'DUV',
                ], $bogorRegion)
            );
        }

        // 5. Seed Data Master Surabaya & Makassar untuk Admin Global Table
        $surabayaRegion = ['id_provinsi' => $idJatim, 'id_kabupaten_kota' => $idSurabaya, 'id_jenis_tutupan_lahan' => $defaultLcId];
        DB::table('provisioning_service')->updateOrInsert(
            ['nama_objek' => 'Kepiting Bakau Wonorejo', 'id_kabupaten_kota' => $idSurabaya],
            array_merge([
                'nama_latin' => 'Scylla serrata',
                'nama_daerah' => 'Kepiting Bakau',
                'produktivitas' => 2.4,
                'harga_pasar' => 120000,
                'luas_pemanfaatan' => 1.0,
                'satuan_luas' => 'Ton/Ha',
                'referensi' => 'Survei Pantai Timur Surabaya',
                'nilai' => 288000000,
                'kategori_tev' => 'DUV',
            ], $surabayaRegion)
        );

        $makassarRegion = ['id_provinsi' => $idSulsel, 'id_kabupaten_kota' => $idMakassar, 'id_jenis_tutupan_lahan' => $defaultLcId];
        DB::table('provisioning_service')->updateOrInsert(
            ['nama_objek' => 'Ikan Bandeng Tambak Pangkep-Makassar', 'id_kabupaten_kota' => $idMakassar],
            array_merge([
                'nama_latin' => 'Chanos chanos',
                'nama_daerah' => 'Ikan Bolu',
                'produktivitas' => 4.5,
                'harga_pasar' => 45000,
                'luas_pemanfaatan' => 1.0,
                'satuan_luas' => 'Ton/Ha',
                'referensi' => 'Dinas Kelautan Sulawesi Selatan',
                'nilai' => 202500000,
                'kategori_tev' => 'DUV',
            ], $makassarRegion)
        );
    }
}
