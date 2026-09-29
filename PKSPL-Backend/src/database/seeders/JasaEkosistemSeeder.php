<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Mengisi data jasa ekosistem (Provisioning, Regulating, Supporting, Cultural)
 * untuk setiap jenis tutupan lahan, termasuk dataset komprehensif PT Antam.
 */
class JasaEkosistemSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedNonAntamLandCovers();
        $this->seedAntamLandCovers();
    }

    /**
     * Data contoh standar untuk tutupan lahan non-Antam.
     */
    private function seedNonAntamLandCovers(): void
    {
        $nonAntam = DB::table('jenis_tutupan_lahan')
            ->join('indexes', 'indexes.id_index', '=', 'jenis_tutupan_lahan.id_index')
            ->join('proyek', 'proyek.id_proyek', '=', 'indexes.id_proyek')
            ->where('proyek.kode_proyek', '!=', 'PRJ-ANTAM')
            ->select('jenis_tutupan_lahan.*', 'indexes.id_proyek')
            ->orderBy('jenis_tutupan_lahan.id_jenis_tutupan_lahan')
            ->get();

        foreach ($nonAntam as $tutupanLahan) {
            $proyek = DB::table('proyek')->where('id_proyek', $tutupanLahan->id_proyek)->first();
            $wilayah = [
                'id_provinsi' => $proyek?->id_provinsi,
                'id_kabupaten_kota' => $proyek?->id_kabupaten_kota,
                'id_kecamatan' => $proyek?->id_kecamatan,
                'id_desa_kelurahan' => $proyek?->id_desa_kelurahan,
            ];

            DB::table('provisioning_service')->updateOrInsert(
                ['id_jenis_tutupan_lahan' => $tutupanLahan->id_jenis_tutupan_lahan, 'nama_objek' => 'Hasil perikanan lokal'],
                array_merge([
                    'nama_latin' => 'Rhizophora apiculata',
                    'nama_daerah' => 'Bakau minyak',
                    'produktivitas' => 1.2500,
                    'harga_pasar' => 35000,
                    'luas_pemanfaatan' => 5,
                    'satuan_luas' => 'Hektar',
                    'referensi' => 'Survei lapangan 2026',
                    'nilai' => 218750,
                    'kategori_tev' => 'DUV',
                ], $wilayah)
            );

            DB::table('regulating_service')->updateOrInsert(
                ['id_jenis_tutupan_lahan' => $tutupanLahan->id_jenis_tutupan_lahan, 'jenis_regulating' => 'Perlindungan pesisir'],
                array_merge([
                    'indikator' => 'Luas tutupan',
                    'satuan' => 'Hektar',
                    'nilai_indikator' => 10,
                    'referensi' => 'Peta tutupan lahan',
                    'nilai' => 150000000,
                    'kategori_tev' => 'IUV',
                ], $wilayah)
            );

            DB::table('supporting_service')->updateOrInsert(
                ['id_jenis_tutupan_lahan' => $tutupanLahan->id_jenis_tutupan_lahan, 'fungsi_pendukung' => 'Habitat dan siklus nutrien'],
                array_merge([
                    'deskripsi' => 'Menopang keanekaragaman hayati.',
                    'referensi' => 'Kajian ekologi 2025',
                    'nilai' => 75000000,
                    'kategori_tev' => 'OV',
                ], $wilayah)
            );

            DB::table('cultural_service')->updateOrInsert(
                ['id_jenis_tutupan_lahan' => $tutupanLahan->id_jenis_tutupan_lahan, 'nama_aktivitas' => 'Wisata edukasi ekosistem'],
                array_merge([
                    'jumlah_pengunjung' => 1200,
                    'biaya_perjalanan' => 150000,
                    'frekuensi' => 1,
                    'referensi' => 'Survei pengunjung 2026',
                    'nilai' => 180000000,
                    'kategori_tev' => 'EV',
                ], $wilayah)
            );
        }
    }

    /**
     * Data valuasi terperinci untuk 5 Tutupan Lahan PT Antam.
     */
    private function seedAntamLandCovers(): void
    {
        $proyek = DB::table('proyek')->where('kode_proyek', 'PRJ-ANTAM')->first()
            ?? DB::table('proyek')->where('nama_proyek', 'like', '%Antam%')->first();

        if (!$proyek) {
            return;
        }

        $wilayah = [
            'id_provinsi' => $proyek->id_provinsi,
            'id_kabupaten_kota' => $proyek->id_kabupaten_kota,
            'id_kecamatan' => $proyek->id_kecamatan,
            'id_desa_kelurahan' => $proyek->id_desa_kelurahan,
        ];

        $antamData = $this->getAntamServicesDefinition();

        foreach ($antamData as $namaTutupan => $services) {
            $landCover = DB::table('jenis_tutupan_lahan')
                ->join('indexes', 'indexes.id_index', '=', 'jenis_tutupan_lahan.id_index')
                ->where('indexes.id_proyek', $proyek->id_proyek)
                ->where('jenis_tutupan_lahan.nama_tutupan_lahan', $namaTutupan)
                ->select('jenis_tutupan_lahan.*')
                ->first();

            if (!$landCover) {
                continue;
            }

            $idLandCover = $landCover->id_jenis_tutupan_lahan;

            // 1. Provisioning Services (Flora & Fauna)
            if (!empty($services['provisioning'])) {
                foreach ($services['provisioning'] as $prov) {
                    DB::table('provisioning_service')->updateOrInsert(
                        ['id_jenis_tutupan_lahan' => $idLandCover, 'nama_objek' => $prov['nama_objek']],
                        array_merge([
                            'nama_latin' => $prov['nama_latin'] ?? null,
                            'nama_daerah' => $prov['nama_daerah'] ?? null,
                            'produktivitas' => $prov['produktivitas'] ?? 1.0,
                            'harga_pasar' => $prov['harga_pasar'] ?? 100000.0,
                            'luas_pemanfaatan' => $landCover->luas ?? 100.0,
                            'satuan_luas' => $landCover->satuan_luas ?: 'Hektar',
                            'referensi' => $prov['referensi'] ?? 'Survei Lapangan PT Antam 2026',
                            'nilai' => $prov['nilai'] ?? 100000000.0,
                            'kategori_tev' => 'DUV',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ], $wilayah)
                    );
                }
            }

            // 2. Regulating Services
            if (!empty($services['regulating'])) {
                foreach ($services['regulating'] as $reg) {
                    DB::table('regulating_service')->updateOrInsert(
                        ['id_jenis_tutupan_lahan' => $idLandCover, 'jenis_regulating' => $reg['jenis_regulating']],
                        array_merge([
                            'indikator' => $reg['indikator'] ?? 'Luas tutupan vegetasi',
                            'satuan' => $reg['satuan'] ?? 'Hektar',
                            'nilai_indikator' => $reg['nilai_indikator'] ?? (float) ($landCover->luas ?? 100.0),
                            'referensi' => $reg['referensi'] ?? 'Kajian Jasa Pengaturan PT Antam 2026',
                            'nilai' => $reg['nilai'] ?? 200000000.0,
                            'kategori_tev' => 'IUV',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ], $wilayah)
                    );
                }
            }

            // 3. Supporting Services
            if (!empty($services['supporting'])) {
                foreach ($services['supporting'] as $sup) {
                    DB::table('supporting_service')->updateOrInsert(
                        ['id_jenis_tutupan_lahan' => $idLandCover, 'fungsi_pendukung' => $sup['fungsi_pendukung']],
                        array_merge([
                            'deskripsi' => $sup['deskripsi'] ?? 'Fungsi pendukung ekologis kawasan tambang PT Antam.',
                            'referensi' => $sup['referensi'] ?? 'Studi Keanekaragaman Hayati PT Antam 2026',
                            'nilai' => $sup['nilai'] ?? 150000000.0,
                            'kategori_tev' => 'OV',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ], $wilayah)
                    );
                }
            }

            // 4. Cultural Services
            if (!empty($services['cultural'])) {
                foreach ($services['cultural'] as $cult) {
                    DB::table('cultural_service')->updateOrInsert(
                        ['id_jenis_tutupan_lahan' => $idLandCover, 'nama_aktivitas' => $cult['nama_aktivitas']],
                        array_merge([
                            'jumlah_pengunjung' => $cult['jumlah_pengunjung'] ?? 500,
                            'biaya_perjalanan' => $cult['biaya_perjalanan'] ?? 150000,
                            'frekuensi' => $cult['frekuensi'] ?? 1,
                            'referensi' => $cult['referensi'] ?? 'Laporan CSR & Edukasi PT Antam 2026',
                            'nilai' => $cult['nilai'] ?? 120000000.0,
                            'kategori_tev' => 'EV',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ], $wilayah)
                    );
                }
            }
        }
    }

    /**
     * Definisi lengkap data jasa ekosistem untuk 5 tutupan lahan PT Antam.
     */
    private function getAntamServicesDefinition(): array
    {
        return [
            // ============================================================
            // 1. AREA REKLAMASI
            // ============================================================
            'Area Reklamasi' => [
                'provisioning' => [
                    // A.1 Flora
                    ['nama_objek' => 'Cemara laut', 'nama_latin' => 'Casuarina equisetifolia', 'nama_daerah' => 'Cemara udang / Cemara laut', 'nilai' => 185000000.00],
                    ['nama_objek' => 'Jabon merah', 'nama_latin' => 'Neolamarckia macrophylla', 'nama_daerah' => 'Jabon merah / Samama', 'nilai' => 210000000.00],
                    ['nama_objek' => 'Tagalolo', 'nama_latin' => 'Ficus minahassae', 'nama_daerah' => 'Tagalolo', 'nilai' => 125000000.00],
                    ['nama_objek' => 'Akasia daun kecil', 'nama_latin' => 'Acacia auriculiformis', 'nama_daerah' => 'Akasia daun kecil / Auri', 'nilai' => 160000000.00],
                    ['nama_objek' => 'Sengon', 'nama_latin' => 'Falcataria moluccana', 'nama_daerah' => 'Sengon laut / Jeunjing', 'nilai' => 175000000.00],
                    ['nama_objek' => 'Bintangur', 'nama_latin' => 'Calophyllum inophyllum', 'nama_daerah' => 'Bintangur / Nyamplung', 'nilai' => 140000000.00],
                    ['nama_objek' => 'Johar', 'nama_latin' => 'Senna siamea', 'nama_daerah' => 'Johar / Juwar', 'nilai' => 115000000.00],
                ],
                'regulating' => [
                    ['jenis_regulating' => 'Pencegah erosi', 'indikator' => 'Laju erosi tertahan', 'satuan' => 'ton/ha/th', 'nilai_indikator' => 45.0, 'nilai' => 280000000.00],
                    ['jenis_regulating' => 'Penyerapan air', 'indikator' => 'Kapasitas infiltrasi tanah', 'satuan' => 'mm/th', 'nilai_indikator' => 1200.0, 'nilai' => 240000000.00],
                    ['jenis_regulating' => 'Serasah', 'indikator' => 'Produksi guguran serasah', 'satuan' => 'ton/ha/th', 'nilai_indikator' => 8.5, 'nilai' => 135000000.00],
                    ['jenis_regulating' => 'Penghasil Oksigen', 'indikator' => 'Produksi oksigen tegakan', 'satuan' => 'ton O2/ha/th', 'nilai_indikator' => 18.0, 'nilai' => 310000000.00],
                    ['jenis_regulating' => 'Penyerapan CO2 (Carbon Stock)', 'indikator' => 'Sekuestrasi karbon biomassa', 'satuan' => 'ton CO2e/ha', 'nilai_indikator' => 65.0, 'nilai' => 380000000.00],
                ],
                'supporting' => [
                    ['fungsi_pendukung' => 'Habitat (Reptil, Burung, Mamalia)', 'deskripsi' => 'Habitat naungan dan perlindungan satwa reptil, burung, dan mamalia kecil di area revegetasi.', 'nilai' => 300000000.00],
                    ['fungsi_pendukung' => 'Nursery ground (pembibitan)', 'deskripsi' => 'Penyedia anakan pohon alami dan pembibitan reklamasi tambang.', 'nilai' => 145000000.00],
                    ['fungsi_pendukung' => 'Pembentukan Tanah', 'deskripsi' => 'Pedogenesis dan pengayaan bahan organik tanah pascatambang.', 'nilai' => 190000000.00],
                    ['fungsi_pendukung' => 'Biodiversitas', 'deskripsi' => 'Peningkatan indeks keanekaragaman flora fauna revegetasi.', 'nilai' => 175000000.00],
                ],
                'cultural' => [
                    ['nama_aktivitas' => 'Pendidikan dan Penelitian', 'jumlah_pengunjung' => 650, 'biaya_perjalanan' => 200000, 'frekuensi' => 1, 'nilai' => 160000000.00],
                    ['nama_aktivitas' => 'Budaya', 'jumlah_pengunjung' => 300, 'biaya_perjalanan' => 150000, 'frekuensi' => 1, 'nilai' => 85000000.00],
                    ['nama_aktivitas' => 'Wisata', 'jumlah_pengunjung' => 500, 'biaya_perjalanan' => 180000, 'frekuensi' => 1, 'nilai' => 130000000.00],
                ],
            ],

            // ============================================================
            // 2. HUTAN LAHAN KERING SEKUNDER
            // ============================================================
            'Hutan Lahan Kering Sekunder' => [
                'provisioning' => [
                    // A.1 Flora
                    ['nama_objek' => 'Meranti merah', 'nama_latin' => 'Shorea leprosula', 'nama_daerah' => 'Meranti merah / tembaga', 'nilai' => 450000000.00],
                    ['nama_objek' => 'Gosale', 'nama_latin' => 'Prainea papuana', 'nama_daerah' => 'Gosale', 'nilai' => 280000000.00],
                    ['nama_objek' => 'Jambu-jambu', 'nama_latin' => 'Syzygium sp.', 'nama_daerah' => 'Jambu-jambu hutan', 'nilai' => 220000000.00],
                    ['nama_objek' => 'Daun tiga', 'nama_latin' => 'Allophylus cobbe', 'nama_daerah' => 'Daun tiga', 'nilai' => 175000000.00],
                    ['nama_objek' => 'Bintangur gunung', 'nama_latin' => 'Calophyllum soulattri', 'nama_daerah' => 'Bintangur gunung / batu', 'nilai' => 310000000.00],
                    ['nama_objek' => 'Nyatoh', 'nama_latin' => 'Palaquium rostratum', 'nama_daerah' => 'Nyatoh', 'nilai' => 390000000.00],
                    ['nama_objek' => 'RC', 'nama_latin' => 'Reinwardtiodendron celebicum', 'nama_daerah' => 'RC / Duku hutan', 'nilai' => 260000000.00],
                    ['nama_objek' => 'Cemara gunung', 'nama_latin' => 'Casuarina junghuhniana', 'nama_daerah' => 'Cemara gunung', 'nilai' => 320000000.00],
                    // A.2 Fauna
                    ['nama_objek' => 'Sus scrofa', 'nama_latin' => 'Sus scrofa', 'nama_daerah' => 'Babi hutan / Celeng', 'nilai' => 195000000.00],
                    ['nama_objek' => 'Aerodramus vanikorensis', 'nama_latin' => 'Aerodramus vanikorensis', 'nama_daerah' => 'Walet sarang lumut', 'nilai' => 340000000.00],
                    ['nama_objek' => 'Haliastur indus', 'nama_latin' => 'Haliastur indus', 'nama_daerah' => 'Elang bondol', 'nilai' => 275000000.00],
                    ['nama_objek' => 'Coracina papuensis', 'nama_latin' => 'Coracina papuensis', 'nama_daerah' => 'Kepudang-sungu papua', 'nilai' => 165000000.00],
                    ['nama_objek' => 'Lalage aurea', 'nama_latin' => 'Lalage aurea', 'nama_daerah' => 'Kapasan cokelat', 'nilai' => 145000000.00],
                    ['nama_objek' => 'Rhipidura leucophrys', 'nama_latin' => 'Rhipidura leucophrys', 'nama_daerah' => 'Kipasan belang', 'nilai' => 155000000.00],
                    ['nama_objek' => 'Cinnyris frenatus', 'nama_latin' => 'Cinnyris frenatus', 'nama_daerah' => 'Burung madu sriganti', 'nilai' => 135000000.00],
                ],
                'regulating' => [
                    ['jenis_regulating' => 'Pencegah erosi', 'indikator' => 'Stabilisasi lereng bukit', 'satuan' => 'ton/ha/th', 'nilai_indikator' => 85.0, 'nilai' => 520000000.00],
                    ['jenis_regulating' => 'Penyerapan air', 'indikator' => 'Resapan akuifer hutan primer/sekunder', 'satuan' => 'mm/th', 'nilai_indikator' => 2400.0, 'nilai' => 680000000.00],
                    ['jenis_regulating' => 'Serasah', 'indikator' => 'Akumulasi mulsa lantai hutan', 'satuan' => 'ton/ha/th', 'nilai_indikator' => 14.0, 'nilai' => 290000000.00],
                    ['jenis_regulating' => 'Penghasil Oksigen', 'indikator' => 'Produksi O2 kanopi hutan', 'satuan' => 'ton O2/ha/th', 'nilai_indikator' => 38.0, 'nilai' => 750000000.00],
                    ['jenis_regulating' => 'Penyerapan CO2 (Carbon Stock)', 'indikator' => 'Stok karbon hutan daratan tinggi', 'satuan' => 'ton CO2e/ha', 'nilai_indikator' => 180.0, 'nilai' => 1150000000.00],
                ],
                'supporting' => [
                    ['fungsi_pendukung' => 'Habitat (Reptil, Burung, Mamalia)', 'deskripsi' => 'Penyedia habitat utama bagi komunitas herpetofauna, avifauna hutan, dan mamalia.', 'nilai' => 710000000.00],
                    ['fungsi_pendukung' => 'Nursery ground (pembibitan)', 'deskripsi' => 'Pusat regenerasi anakan pohon hutan tropika sekunder.', 'nilai' => 310000000.00],
                    ['fungsi_pendukung' => 'Pembentukan Tanah', 'deskripsi' => 'Pembentukan horizon humus dan pelapukan batuan alami.', 'nilai' => 420000000.00],
                    ['fungsi_pendukung' => 'Biodiversitas', 'deskripsi' => 'Konservasi plasma nutfah flora dan fauna endemik wilayah konsesi.', 'nilai' => 560000000.00],
                ],
                'cultural' => [
                    ['nama_aktivitas' => 'Pendidikan dan Penelitian', 'jumlah_pengunjung' => 900, 'biaya_perjalanan' => 250000, 'frekuensi' => 1, 'nilai' => 280000000.00],
                    ['nama_aktivitas' => 'Budaya', 'jumlah_pengunjung' => 450, 'biaya_perjalanan' => 180000, 'frekuensi' => 1, 'nilai' => 140000000.00],
                    ['nama_aktivitas' => 'Wisata', 'jumlah_pengunjung' => 800, 'biaya_perjalanan' => 220000, 'frekuensi' => 1, 'nilai' => 210000000.00],
                ],
            ],

            // ============================================================
            // 3. SEMAK BELUKAR
            // ============================================================
            'Semak Belukar' => [
                'provisioning' => [
                    // A.1 Flora
                    ['nama_objek' => 'Nani daun besar', 'nama_latin' => 'Metrosideros sp.', 'nama_daerah' => 'Nani daun besar', 'nilai' => 145000000.00],
                    ['nama_objek' => 'RC', 'nama_latin' => 'Reinwardtiodendron celebicum', 'nama_daerah' => 'RC', 'nilai' => 120000000.00],
                    ['nama_objek' => 'Kayu pule', 'nama_latin' => 'Alstonia scholaris', 'nama_daerah' => 'Kayu pule / Pulai', 'nilai' => 110000000.00],
                    ['nama_objek' => 'Balsa', 'nama_latin' => 'Ochroma pyramidale', 'nama_daerah' => 'Kayu balsa', 'nilai' => 95000000.00],
                    // A.2 Fauna
                    ['nama_objek' => 'Sus scrofa', 'nama_latin' => 'Sus scrofa', 'nama_daerah' => 'Babi hutan', 'nilai' => 160000000.00],
                    ['nama_objek' => 'Collocalia esculenta', 'nama_latin' => 'Collocalia esculenta', 'nama_daerah' => 'Walet sapi', 'nilai' => 210000000.00],
                    ['nama_objek' => 'Haliastur indus', 'nama_latin' => 'Haliastur indus', 'nama_daerah' => 'Elang bondol', 'nilai' => 185000000.00],
                    ['nama_objek' => 'Lalage aurea', 'nama_latin' => 'Lalage aurea', 'nama_daerah' => 'Kapasan cokelat', 'nilai' => 95000000.00],
                    ['nama_objek' => 'Rhipidura leucophrys', 'nama_latin' => 'Rhipidura leucophrys', 'nama_daerah' => 'Kipasan belang', 'nilai' => 105000000.00],
                    ['nama_objek' => 'Aplonis mysolensis', 'nama_latin' => 'Aplonis mysolensis', 'nama_daerah' => 'Perling maluku', 'nilai' => 115000000.00],
                    ['nama_objek' => 'Leptocoma aspasia', 'nama_latin' => 'Leptocoma aspasia', 'nama_daerah' => 'Burung madu hitam', 'nilai' => 125000000.00],
                    ['nama_objek' => 'Cinnyris frenatus', 'nama_latin' => 'Cinnyris frenatus', 'nama_daerah' => 'Burung madu sriganti', 'nilai' => 90000000.00],
                    ['nama_objek' => 'Carlia fusca', 'nama_latin' => 'Carlia fusca', 'nama_daerah' => 'Kadal cokelat papua', 'nilai' => 75000000.00],
                    ['nama_objek' => 'Bronchocela cristatella', 'nama_latin' => 'Bronchocela cristatella', 'nama_daerah' => 'Bunglon surai', 'nilai' => 65000000.00],
                ],
                'regulating' => [
                    ['jenis_regulating' => 'Pencegah erosi', 'indikator' => 'Penahan limpasan permukaan', 'satuan' => 'ton/ha/th', 'nilai_indikator' => 35.0, 'nilai' => 245000000.00],
                    ['jenis_regulating' => 'Penyerapan air', 'indikator' => 'Retensi air hujan di perakaran semak', 'satuan' => 'mm/th', 'nilai_indikator' => 1400.0, 'nilai' => 280000000.00],
                    ['jenis_regulating' => 'Serasah', 'indikator' => 'Guguran daun semak dan ranting', 'satuan' => 'ton/ha/th', 'nilai_indikator' => 7.0, 'nilai' => 120000000.00],
                    ['jenis_regulating' => 'Penghasil Oksigen', 'indikator' => 'Produksi O2 semak belukar', 'satuan' => 'ton O2/ha/th', 'nilai_indikator' => 15.0, 'nilai' => 310000000.00],
                    ['jenis_regulating' => 'Penyerapan CO2 (Carbon Stock)', 'indikator' => 'Biomassa karbon vegetasi semak', 'satuan' => 'ton CO2e/ha', 'nilai_indikator' => 50.0, 'nilai' => 390000000.00],
                ],
                'supporting' => [
                    ['fungsi_pendukung' => 'Habitat (Reptil, Burung, Mamalia)', 'deskripsi' => 'Ruang jelajah dan perlindungan satwa reptil, burung pemakan serangga, dan mamalia kecil.', 'nilai' => 350000000.00],
                    ['fungsi_pendukung' => 'Nursery ground', 'deskripsi' => 'Zona regenerasi tumbuhan pionir dan biota semak.', 'nilai' => 125000000.00],
                    ['fungsi_pendukung' => 'Feeding ground', 'deskripsi' => 'Area mencari pakan alami bagi burung nektar, serangga, dan herbivora.', 'nilai' => 165000000.00],
                    ['fungsi_pendukung' => 'Biodiversitas', 'deskripsi' => 'Kekayaan spesies penyusun formasi semak belukar tropika.', 'nilai' => 190000000.00],
                ],
                'cultural' => [
                    ['nama_aktivitas' => 'Pendidikan dan Penelitian', 'jumlah_pengunjung' => 450, 'biaya_perjalanan' => 170000, 'frekuensi' => 1, 'nilai' => 115000000.00],
                    ['nama_aktivitas' => 'Budaya', 'jumlah_pengunjung' => 280, 'biaya_perjalanan' => 140000, 'frekuensi' => 1, 'nilai' => 70000000.00],
                    ['nama_aktivitas' => 'Wisata', 'jumlah_pengunjung' => 380, 'biaya_perjalanan' => 160000, 'frekuensi' => 1, 'nilai' => 95000000.00],
                ],
            ],

            // ============================================================
            // 4. BELUKAR
            // ============================================================
            'Belukar' => [
                'provisioning' => [
                    // A.1 Flora
                    ['nama_objek' => 'Macaranga', 'nama_latin' => 'Macaranga sp.', 'nama_daerah' => 'Macaranga / Mahang', 'nilai' => 135000000.00],
                    ['nama_objek' => 'Akasia daun besar', 'nama_latin' => 'Acacia mangium', 'nama_daerah' => 'Akasia daun besar / Mangium', 'nilai' => 155000000.00],
                    ['nama_objek' => 'Gnemon', 'nama_latin' => 'Gnetum gnemon', 'nama_daerah' => 'Gnemon / Melinjo hutan', 'nilai' => 125000000.00],
                    // A.2 Fauna
                    ['nama_objek' => 'Haliastur indus', 'nama_latin' => 'Haliastur indus', 'nama_daerah' => 'Elang bondol', 'nilai' => 175000000.00],
                    ['nama_objek' => 'Lalage aurea', 'nama_latin' => 'Lalage aurea', 'nama_daerah' => 'Kapasan cokelat', 'nilai' => 90000000.00],
                    ['nama_objek' => 'Rhipidura leucophrys', 'nama_latin' => 'Rhipidura leucophrys', 'nama_daerah' => 'Kipasan belang', 'nilai' => 95000000.00],
                    ['nama_objek' => 'Aplonis mysolensis', 'nama_latin' => 'Aplonis mysolensis', 'nama_daerah' => 'Perling maluku', 'nilai' => 110000000.00],
                    ['nama_objek' => 'Bronchocela cristatella', 'nama_latin' => 'Bronchocela cristatella', 'nama_daerah' => 'Bunglon surai', 'nilai' => 60000000.00],
                    ['nama_objek' => 'Hydrosaurus amboinensis', 'nama_latin' => 'Hydrosaurus amboinensis', 'nama_daerah' => 'Soa-soa layar ambon', 'nilai' => 180000000.00],
                ],
                'regulating' => [
                    ['jenis_regulating' => 'Pencegah erosi', 'indikator' => 'Pencegahan pengikisan lapisan atas tanah', 'satuan' => 'ton/ha/th', 'nilai_indikator' => 28.0, 'nilai' => 190000000.00],
                    ['jenis_regulating' => 'Penyerapan air', 'indikator' => 'Infiltrasi dan perkolasi tanah belukar', 'satuan' => 'mm/th', 'nilai_indikator' => 1100.0, 'nilai' => 215000000.00],
                    ['jenis_regulating' => 'Serasah', 'indikator' => 'Dekomposisi guguran daun cepat lapuk', 'satuan' => 'ton/ha/th', 'nilai_indikator' => 6.0, 'nilai' => 95000000.00],
                    ['jenis_regulating' => 'Penghasil Oksigen', 'indikator' => 'Produksi O2 fotosintesis belukar', 'satuan' => 'ton O2/ha/th', 'nilai_indikator' => 12.0, 'nilai' => 240000000.00],
                    ['jenis_regulating' => 'Penyerapan CO2 (Carbon Stock)', 'indikator' => 'Cadangan karbon tegakan belukar', 'satuan' => 'ton CO2e/ha', 'nilai_indikator' => 42.0, 'nilai' => 290000000.00],
                ],
                'supporting' => [
                    ['fungsi_pendukung' => 'Habitat (Reptil, Burung, Mamalia)', 'deskripsi' => 'Habitat satwa transisi termasuk herpetofauna unik seperti soa-soa layar dan avifauna.', 'nilai' => 320000000.00],
                    ['fungsi_pendukung' => 'Nursery ground (pembibitan)', 'deskripsi' => 'Pusat pembesaran anakan tumbuhan pionir.', 'nilai' => 105000000.00],
                    ['fungsi_pendukung' => 'Pembentukan Tanah', 'deskripsi' => 'Perbaikan struktur fisik dan biologis tanah.', 'nilai' => 145000000.00],
                    ['fungsi_pendukung' => 'Biodiversitas', 'deskripsi' => 'Penopang keragaman hayati formasi vegetasi belukar.', 'nilai' => 170000000.00],
                ],
                'cultural' => [
                    ['nama_aktivitas' => 'Pendidikan dan Penelitian', 'jumlah_pengunjung' => 380, 'biaya_perjalanan' => 160000, 'frekuensi' => 1, 'nilai' => 95000000.00],
                    ['nama_aktivitas' => 'Budaya', 'jumlah_pengunjung' => 240, 'biaya_perjalanan' => 130000, 'frekuensi' => 1, 'nilai' => 55000000.00],
                    ['nama_aktivitas' => 'Wisata', 'jumlah_pengunjung' => 320, 'biaya_perjalanan' => 150000, 'frekuensi' => 1, 'nilai' => 80000000.00],
                ],
            ],

            // ============================================================
            // 5. LAHAN TERBANGUN
            // ============================================================
            'Lahan Terbangun' => [
                'provisioning' => [], // Sesuai dokumen/tabel, tidak ada provisioning
                'regulating' => [
                    ['jenis_regulating' => 'Pencegah erosi', 'indikator' => 'Drainase dan tanggul penahan sedimentasi', 'satuan' => 'm saluran', 'nilai_indikator' => 2500.0, 'nilai' => 140000000.00],
                    ['jenis_regulating' => 'Penyerapan air', 'indikator' => 'Kolam retensi dan sumur resapan', 'satuan' => 'm3/th', 'nilai_indikator' => 15000.0, 'nilai' => 115000000.00],
                    ['jenis_regulating' => 'Serasah', 'indikator' => 'Kompos vegetasi peneduh perkantoran', 'satuan' => 'ton/th', 'nilai_indikator' => 12.0, 'nilai' => 45000000.00],
                    ['jenis_regulating' => 'Penghasil Oksigen', 'indikator' => 'RTH dan pohon peneduh jalan pabrik', 'satuan' => 'ton O2/th', 'nilai_indikator' => 8.0, 'nilai' => 160000000.00],
                    ['jenis_regulating' => 'Penyerapan CO2 (Carbon Stock)', 'indikator' => 'Stok karbon ruang terbuka hijau fasilitas', 'satuan' => 'ton CO2e', 'nilai_indikator' => 25.0, 'nilai' => 185000000.00],
                ],
                'supporting' => [], // Sesuai dokumen/tabel, tidak ada supporting
                'cultural' => [
                    ['nama_aktivitas' => 'Pendidikan dan Penelitian', 'jumlah_pengunjung' => 480, 'biaya_perjalanan' => 200000, 'frekuensi' => 1, 'nilai' => 110000000.00],
                    ['nama_aktivitas' => 'Budaya', 'jumlah_pengunjung' => 290, 'biaya_perjalanan' => 160000, 'frekuensi' => 1, 'nilai' => 65000000.00],
                    ['nama_aktivitas' => 'CSR', 'jumlah_pengunjung' => 1200, 'biaya_perjalanan' => 180000, 'frekuensi' => 1, 'nilai' => 225000000.00],
                ],
            ],
        ];
    }
}
