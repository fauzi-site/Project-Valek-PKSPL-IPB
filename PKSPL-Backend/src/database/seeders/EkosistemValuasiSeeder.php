<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\ValuasiEkosistem;
use App\Models\ValuasiKategoriJasa;
use App\Models\ValuasiItemValuasi;
use App\Models\IndexEkosistemSummary;

/**
 * Seeder data valuasi Total Economic Value (TEV) untuk 5 tipe ekosistem/tutupan lahan PT Antam:
 * 1. Area Reklamasi
 * 2. Hutan Lahan Kering Sekunder
 * 3. Semak Belukar
 * 4. Belukar
 * 5. Lahan Terbangun
 *
 * Struktur per ekosistem:
 *   A. Provisioning Services (Flora & Fauna)
 *   B. Regulating Services
 *   C. Supporting Services
 *   D. Cultural Services
 */
class EkosistemValuasiSeeder extends Seeder
{
    public function run(): void
    {
        // Hapus data lama jika ada (idempotent) — PostgreSQL CASCADE
        try {
            DB::statement('TRUNCATE TABLE index_ekosistem_summary RESTART IDENTITY CASCADE');
            DB::statement('TRUNCATE TABLE valuasi_item_valuasis RESTART IDENTITY CASCADE');
            DB::statement('TRUNCATE TABLE valuasi_kategori_jasas RESTART IDENTITY CASCADE');
            DB::statement('TRUNCATE TABLE valuasi_ekosistems RESTART IDENTITY CASCADE');
        } catch (\Throwable) {
            // Tabel belum ada pada run pertama — abaikan
        }

        $ekosistemData = $this->getEkosistemData();

        foreach ($ekosistemData as $ekoData) {
            // Hitung subtotal tiap kategori dari items, dan total TEV ekosistem
            $kategoriList = [];
            $tevEkosistem = 0;

            foreach ($ekoData['kategori'] as $katData) {
                $subtotal = collect($katData['items'])->sum('total_nilai_ekonomi');
                $katData['subtotal'] = $subtotal;
                $kategoriList[] = $katData;
                $tevEkosistem += $subtotal;
            }

            $ekosistem = ValuasiEkosistem::create([
                'nama_ekosistem' => $ekoData['nama'],
                'tev_ekosistem'  => $tevEkosistem,
            ]);

            foreach ($kategoriList as $katData) {
                $kategori = ValuasiKategoriJasa::create([
                    'valuasi_ekosistem_id' => $ekosistem->id,
                    'nama_kategori'        => $katData['nama'],
                    'kode_kategori'        => $katData['kode'],
                    'subtotal_kategori'    => $katData['subtotal'],
                ]);

                foreach ($katData['items'] as $item) {
                    ValuasiItemValuasi::create([
                        'valuasi_kategori_jasa_id' => $kategori->id,
                        'no'                       => $item['no'],
                        'nama_item'                => $item['nama_item'],
                        'nama_latin'               => $item['nama_latin'] ?? null,
                        'nama_daerah'              => $item['nama_daerah'] ?? null,
                        'total_nilai_ekonomi'      => $item['total_nilai_ekonomi'],
                        'kategori'                 => $item['kategori'],
                    ]);
                }

                // Isi tabel ringkasan indeks ekosistem
                IndexEkosistemSummary::create([
                    'nama_ekosistem' => $ekoData['nama'],
                    'kategori'       => $katData['nama'],
                    'jumlah_rp'      => $katData['subtotal'],
                    'tev_total'      => $tevEkosistem,
                ]);
            }
        }
    }

    /**
     * Data valuasi lengkap untuk 5 tipe ekosistem/tutupan lahan PT Antam.
     */
    private function getEkosistemData(): array
    {
        return [
            // ============================================================
            // 1. AREA REKLAMASI
            // ============================================================
            [
                'nama' => 'Area Reklamasi',
                'kategori' => [
                    [
                        'nama' => 'Provisioning',
                        'kode' => 'A',
                        'items' => [
                            // A.1 Flora
                            [
                                'no' => 'A.1.1',
                                'nama_item' => 'Cemara laut',
                                'nama_latin' => 'Casuarina equisetifolia',
                                'nama_daerah' => 'Cemara udang / Cemara laut',
                                'total_nilai_ekonomi' => 185_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.2',
                                'nama_item' => 'Jabon merah',
                                'nama_latin' => 'Neolamarckia macrophylla',
                                'nama_daerah' => 'Jabon merah / Samama',
                                'total_nilai_ekonomi' => 210_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.3',
                                'nama_item' => 'Tagalolo',
                                'nama_latin' => 'Ficus minahassae',
                                'nama_daerah' => 'Tagalolo',
                                'total_nilai_ekonomi' => 125_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.4',
                                'nama_item' => 'Akasia daun kecil',
                                'nama_latin' => 'Acacia auriculiformis',
                                'nama_daerah' => 'Akasia daun kecil / Auri',
                                'total_nilai_ekonomi' => 160_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.5',
                                'nama_item' => 'Sengon',
                                'nama_latin' => 'Falcataria moluccana',
                                'nama_daerah' => 'Sengon laut / Jeunjing',
                                'total_nilai_ekonomi' => 175_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.6',
                                'nama_item' => 'Bintangur',
                                'nama_latin' => 'Calophyllum inophyllum',
                                'nama_daerah' => 'Bintangur / Nyamplung',
                                'total_nilai_ekonomi' => 140_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.7',
                                'nama_item' => 'Johar',
                                'nama_latin' => 'Senna siamea',
                                'nama_daerah' => 'Johar / Juwar',
                                'total_nilai_ekonomi' => 115_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                        ],
                    ],
                    [
                        'nama' => 'Regulating',
                        'kode' => 'B',
                        'items' => [
                            [
                                'no' => 'B.1.1',
                                'nama_item' => 'Pencegah erosi',
                                'total_nilai_ekonomi' => 280_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.1.2',
                                'nama_item' => 'Penyerapan air',
                                'total_nilai_ekonomi' => 240_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.1.3',
                                'nama_item' => 'Serasah',
                                'total_nilai_ekonomi' => 135_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.1.4',
                                'nama_item' => 'Penghasil Oksigen',
                                'total_nilai_ekonomi' => 310_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.1.5',
                                'nama_item' => 'Penyerapan CO2 (Carbon Stock)',
                                'total_nilai_ekonomi' => 380_000_000.00,
                                'kategori' => 'regulating',
                            ],
                        ],
                    ],
                    [
                        'nama' => 'Supporting',
                        'kode' => 'C',
                        'items' => [
                            [
                                'no' => 'C.1.1',
                                'nama_item' => 'Habitat - Reptil',
                                'total_nilai_ekonomi' => 85_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.1.2',
                                'nama_item' => 'Habitat - Burung',
                                'total_nilai_ekonomi' => 120_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.1.3',
                                'nama_item' => 'Habitat - Mamalia',
                                'total_nilai_ekonomi' => 95_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.2',
                                'nama_item' => 'Nursery ground (pembibitan)',
                                'total_nilai_ekonomi' => 145_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.3',
                                'nama_item' => 'Pembentukan Tanah',
                                'total_nilai_ekonomi' => 190_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.4',
                                'nama_item' => 'Biodiversitas',
                                'total_nilai_ekonomi' => 175_000_000.00,
                                'kategori' => 'supporting',
                            ],
                        ],
                    ],
                    [
                        'nama' => 'Cultural',
                        'kode' => 'D',
                        'items' => [
                            [
                                'no' => 'D.1',
                                'nama_item' => 'Pendidikan dan Penelitian',
                                'total_nilai_ekonomi' => 160_000_000.00,
                                'kategori' => 'cultural',
                            ],
                            [
                                'no' => 'D.2',
                                'nama_item' => 'Budaya',
                                'total_nilai_ekonomi' => 85_000_000.00,
                                'kategori' => 'cultural',
                            ],
                            [
                                'no' => 'D.3',
                                'nama_item' => 'Wisata',
                                'total_nilai_ekonomi' => 130_000_000.00,
                                'kategori' => 'cultural',
                            ],
                        ],
                    ],
                ],
            ],

            // ============================================================
            // 2. HUTAN LAHAN KERING SEKUNDER
            // ============================================================
            [
                'nama' => 'Hutan Lahan Kering Sekunder',
                'kategori' => [
                    [
                        'nama' => 'Provisioning',
                        'kode' => 'A',
                        'items' => [
                            // A.1 Flora
                            [
                                'no' => 'A.1.1',
                                'nama_item' => 'Meranti merah',
                                'nama_latin' => 'Shorea leprosula',
                                'nama_daerah' => 'Meranti merah / tembaga',
                                'total_nilai_ekonomi' => 450_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.2',
                                'nama_item' => 'Gosale',
                                'nama_latin' => 'Prainea papuana',
                                'nama_daerah' => 'Gosale',
                                'total_nilai_ekonomi' => 280_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.3',
                                'nama_item' => 'Jambu-jambu',
                                'nama_latin' => 'Syzygium sp.',
                                'nama_daerah' => 'Jambu-jambu',
                                'total_nilai_ekonomi' => 220_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.4',
                                'nama_item' => 'Daun tiga',
                                'nama_latin' => 'Allophylus cobbe',
                                'nama_daerah' => 'Daun tiga',
                                'total_nilai_ekonomi' => 175_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.5',
                                'nama_item' => 'Bintangur gunung',
                                'nama_latin' => 'Calophyllum soulattri',
                                'nama_daerah' => 'Bintangur gunung / batu',
                                'total_nilai_ekonomi' => 310_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.6',
                                'nama_item' => 'Nyatoh',
                                'nama_latin' => 'Palaquium rostratum',
                                'nama_daerah' => 'Nyatoh',
                                'total_nilai_ekonomi' => 390_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.7',
                                'nama_item' => 'RC',
                                'nama_latin' => 'Reinwardtiodendron celebicum',
                                'nama_daerah' => 'RC / Duku hutan',
                                'total_nilai_ekonomi' => 260_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.8',
                                'nama_item' => 'Cemara gunung',
                                'nama_latin' => 'Casuarina junghuhniana',
                                'nama_daerah' => 'Cemara gunung',
                                'total_nilai_ekonomi' => 320_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            // A.2 Fauna
                            [
                                'no' => 'A.2.1',
                                'nama_item' => 'Sus scrofa',
                                'nama_latin' => 'Sus scrofa',
                                'nama_daerah' => 'Babi hutan / Celeng',
                                'total_nilai_ekonomi' => 195_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.2',
                                'nama_item' => 'Aerodramus vanikorensis',
                                'nama_latin' => 'Aerodramus vanikorensis',
                                'nama_daerah' => 'Walet sarang lumut',
                                'total_nilai_ekonomi' => 340_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.3',
                                'nama_item' => 'Haliastur indus',
                                'nama_latin' => 'Haliastur indus',
                                'nama_daerah' => 'Elang bondol',
                                'total_nilai_ekonomi' => 275_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.4',
                                'nama_item' => 'Coracina papuensis',
                                'nama_latin' => 'Coracina papuensis',
                                'nama_daerah' => 'Kepudang-sungu papua',
                                'total_nilai_ekonomi' => 165_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.5',
                                'nama_item' => 'Lalage aurea',
                                'nama_latin' => 'Lalage aurea',
                                'nama_daerah' => 'Kapasan cokelat',
                                'total_nilai_ekonomi' => 145_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.6',
                                'nama_item' => 'Rhipidura leucophrys',
                                'nama_latin' => 'Rhipidura leucophrys',
                                'nama_daerah' => 'Kipasan belang',
                                'total_nilai_ekonomi' => 155_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.7',
                                'nama_item' => 'Cinnyris frenatus',
                                'nama_latin' => 'Cinnyris frenatus',
                                'nama_daerah' => 'Burung madu sriganti',
                                'total_nilai_ekonomi' => 135_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                        ],
                    ],
                    [
                        'nama' => 'Regulating',
                        'kode' => 'B',
                        'items' => [
                            [
                                'no' => 'B.1',
                                'nama_item' => 'Pencegah erosi',
                                'total_nilai_ekonomi' => 520_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.2',
                                'nama_item' => 'Penyerapan air',
                                'total_nilai_ekonomi' => 680_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.3',
                                'nama_item' => 'Serasah',
                                'total_nilai_ekonomi' => 290_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.4',
                                'nama_item' => 'Penghasil Oksigen',
                                'total_nilai_ekonomi' => 750_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.5',
                                'nama_item' => 'Penyerapan CO2 (Carbon Stock)',
                                'total_nilai_ekonomi' => 1_150_000_000.00,
                                'kategori' => 'regulating',
                            ],
                        ],
                    ],
                    [
                        'nama' => 'Supporting',
                        'kode' => 'C',
                        'items' => [
                            [
                                'no' => 'C.1.1',
                                'nama_item' => 'Habitat - Reptil',
                                'total_nilai_ekonomi' => 180_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.1.2',
                                'nama_item' => 'Habitat - Burung',
                                'total_nilai_ekonomi' => 290_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.1.3',
                                'nama_item' => 'Habitat - Mamalia',
                                'total_nilai_ekonomi' => 240_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.2',
                                'nama_item' => 'Nursery ground (pembibitan)',
                                'total_nilai_ekonomi' => 310_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.3',
                                'nama_item' => 'Pembentukan Tanah',
                                'total_nilai_ekonomi' => 420_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.4',
                                'nama_item' => 'Biodiversitas',
                                'total_nilai_ekonomi' => 560_000_000.00,
                                'kategori' => 'supporting',
                            ],
                        ],
                    ],
                    [
                        'nama' => 'Cultural',
                        'kode' => 'D',
                        'items' => [
                            [
                                'no' => 'D.1',
                                'nama_item' => 'Pendidikan dan Penelitian',
                                'total_nilai_ekonomi' => 280_000_000.00,
                                'kategori' => 'cultural',
                            ],
                            [
                                'no' => 'D.2',
                                'nama_item' => 'Budaya',
                                'total_nilai_ekonomi' => 140_000_000.00,
                                'kategori' => 'cultural',
                            ],
                            [
                                'no' => 'D.3',
                                'nama_item' => 'Wisata',
                                'total_nilai_ekonomi' => 210_000_000.00,
                                'kategori' => 'cultural',
                            ],
                        ],
                    ],
                ],
            ],

            // ============================================================
            // 3. SEMAK BELUKAR
            // ============================================================
            [
                'nama' => 'Semak Belukar',
                'kategori' => [
                    [
                        'nama' => 'Provisioning',
                        'kode' => 'A',
                        'items' => [
                            // A.1 Flora
                            [
                                'no' => 'A.1.1',
                                'nama_item' => 'Nani daun besar',
                                'nama_latin' => 'Metrosideros sp.',
                                'nama_daerah' => 'Nani daun besar',
                                'total_nilai_ekonomi' => 145_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.2',
                                'nama_item' => 'RC',
                                'nama_latin' => 'Reinwardtiodendron celebicum',
                                'nama_daerah' => 'RC',
                                'total_nilai_ekonomi' => 120_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.3',
                                'nama_item' => 'Kayu pule',
                                'nama_latin' => 'Alstonia scholaris',
                                'nama_daerah' => 'Kayu pule / Pulai',
                                'total_nilai_ekonomi' => 110_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.4',
                                'nama_item' => 'Balsa',
                                'nama_latin' => 'Ochroma pyramidale',
                                'nama_daerah' => 'Kayu balsa',
                                'total_nilai_ekonomi' => 95_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            // A.2 Fauna
                            [
                                'no' => 'A.2.1',
                                'nama_item' => 'Sus scrofa',
                                'nama_latin' => 'Sus scrofa',
                                'nama_daerah' => 'Babi hutan',
                                'total_nilai_ekonomi' => 160_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.2',
                                'nama_item' => 'Collocalia esculenta',
                                'nama_latin' => 'Collocalia esculenta',
                                'nama_daerah' => 'Walet sapi',
                                'total_nilai_ekonomi' => 210_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.3',
                                'nama_item' => 'Haliastur indus',
                                'nama_latin' => 'Haliastur indus',
                                'nama_daerah' => 'Elang bondol',
                                'total_nilai_ekonomi' => 185_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.4',
                                'nama_item' => 'Lalage aurea',
                                'nama_latin' => 'Lalage aurea',
                                'nama_daerah' => 'Kapasan cokelat',
                                'total_nilai_ekonomi' => 95_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.5',
                                'nama_item' => 'Rhipidura leucophrys',
                                'nama_latin' => 'Rhipidura leucophrys',
                                'nama_daerah' => 'Kipasan belang',
                                'total_nilai_ekonomi' => 105_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.6',
                                'nama_item' => 'Aplonis mysolensis',
                                'nama_latin' => 'Aplonis mysolensis',
                                'nama_daerah' => 'Perling maluku',
                                'total_nilai_ekonomi' => 115_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.7',
                                'nama_item' => 'Leptocoma aspasia',
                                'nama_latin' => 'Leptocoma aspasia',
                                'nama_daerah' => 'Burung madu hitam',
                                'total_nilai_ekonomi' => 125_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.8',
                                'nama_item' => 'Cinnyris frenatus',
                                'nama_latin' => 'Cinnyris frenatus',
                                'nama_daerah' => 'Burung madu sriganti',
                                'total_nilai_ekonomi' => 90_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.9',
                                'nama_item' => 'Carlia fusca',
                                'nama_latin' => 'Carlia fusca',
                                'nama_daerah' => 'Kadal cokelat papua',
                                'total_nilai_ekonomi' => 75_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.10',
                                'nama_item' => 'Bronchocela cristatella',
                                'nama_latin' => 'Bronchocela cristatella',
                                'nama_daerah' => 'Bunglon surai',
                                'total_nilai_ekonomi' => 65_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                        ],
                    ],
                    [
                        'nama' => 'Regulating',
                        'kode' => 'B',
                        'items' => [
                            [
                                'no' => 'B.1',
                                'nama_item' => 'Pencegah erosi',
                                'total_nilai_ekonomi' => 245_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.2',
                                'nama_item' => 'Penyerapan air',
                                'total_nilai_ekonomi' => 280_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.3',
                                'nama_item' => 'Serasah',
                                'total_nilai_ekonomi' => 120_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.4',
                                'nama_item' => 'Penghasil Oksigen',
                                'total_nilai_ekonomi' => 310_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.5',
                                'nama_item' => 'Penyerapan CO2 (Carbon Stock)',
                                'total_nilai_ekonomi' => 390_000_000.00,
                                'kategori' => 'regulating',
                            ],
                        ],
                    ],
                    [
                        'nama' => 'Supporting',
                        'kode' => 'C',
                        'items' => [
                            [
                                'no' => 'C.1.1',
                                'nama_item' => 'Habitat - Reptil',
                                'total_nilai_ekonomi' => 95_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.1.2',
                                'nama_item' => 'Habitat - Burung',
                                'total_nilai_ekonomi' => 145_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.1.3',
                                'nama_item' => 'Habitat - Mamalia',
                                'total_nilai_ekonomi' => 110_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.2',
                                'nama_item' => 'Nursery ground',
                                'total_nilai_ekonomi' => 125_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.3',
                                'nama_item' => 'Feeding ground',
                                'total_nilai_ekonomi' => 165_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.4',
                                'nama_item' => 'Biodiversitas',
                                'total_nilai_ekonomi' => 190_000_000.00,
                                'kategori' => 'supporting',
                            ],
                        ],
                    ],
                    [
                        'nama' => 'Cultural',
                        'kode' => 'D',
                        'items' => [
                            [
                                'no' => 'D.1',
                                'nama_item' => 'Pendidikan dan Penelitian',
                                'total_nilai_ekonomi' => 115_000_000.00,
                                'kategori' => 'cultural',
                            ],
                            [
                                'no' => 'D.2',
                                'nama_item' => 'Budaya',
                                'total_nilai_ekonomi' => 70_000_000.00,
                                'kategori' => 'cultural',
                            ],
                            [
                                'no' => 'D.3',
                                'nama_item' => 'Wisata',
                                'total_nilai_ekonomi' => 95_000_000.00,
                                'kategori' => 'cultural',
                            ],
                        ],
                    ],
                ],
            ],

            // ============================================================
            // 4. BELUKAR
            // ============================================================
            [
                'nama' => 'Belukar',
                'kategori' => [
                    [
                        'nama' => 'Provisioning',
                        'kode' => 'A',
                        'items' => [
                            // A.1 Flora
                            [
                                'no' => 'A.1.1',
                                'nama_item' => 'Macaranga',
                                'nama_latin' => 'Macaranga sp.',
                                'nama_daerah' => 'Macaranga / Mahang',
                                'total_nilai_ekonomi' => 135_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.2',
                                'nama_item' => 'Akasia daun besar',
                                'nama_latin' => 'Acacia mangium',
                                'nama_daerah' => 'Akasia daun besar / Mangium',
                                'total_nilai_ekonomi' => 155_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            [
                                'no' => 'A.1.3',
                                'nama_item' => 'Gnemon',
                                'nama_latin' => 'Gnetum gnemon',
                                'nama_daerah' => 'Gnemon / Melinjo hutan',
                                'total_nilai_ekonomi' => 125_000_000.00,
                                'kategori' => 'provisioning_flora',
                            ],
                            // A.2 Fauna
                            [
                                'no' => 'A.2.1',
                                'nama_item' => 'Haliastur indus',
                                'nama_latin' => 'Haliastur indus',
                                'nama_daerah' => 'Elang bondol',
                                'total_nilai_ekonomi' => 175_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.2',
                                'nama_item' => 'Lalage aurea',
                                'nama_latin' => 'Lalage aurea',
                                'nama_daerah' => 'Kapasan cokelat',
                                'total_nilai_ekonomi' => 90_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.3',
                                'nama_item' => 'Rhipidura leucophrys',
                                'nama_latin' => 'Rhipidura leucophrys',
                                'nama_daerah' => 'Kipasan belang',
                                'total_nilai_ekonomi' => 95_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.4',
                                'nama_item' => 'Aplonis mysolensis',
                                'nama_latin' => 'Aplonis mysolensis',
                                'nama_daerah' => 'Perling maluku',
                                'total_nilai_ekonomi' => 110_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.5',
                                'nama_item' => 'Bronchocela cristatella',
                                'nama_latin' => 'Bronchocela cristatella',
                                'nama_daerah' => 'Bunglon surai',
                                'total_nilai_ekonomi' => 60_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                            [
                                'no' => 'A.2.6',
                                'nama_item' => 'Hydrosaurus amboinensis',
                                'nama_latin' => 'Hydrosaurus amboinensis',
                                'nama_daerah' => 'Soa-soa layar ambon',
                                'total_nilai_ekonomi' => 180_000_000.00,
                                'kategori' => 'provisioning_fauna',
                            ],
                        ],
                    ],
                    [
                        'nama' => 'Regulating',
                        'kode' => 'B',
                        'items' => [
                            [
                                'no' => 'B.1.1',
                                'nama_item' => 'Pencegah erosi',
                                'total_nilai_ekonomi' => 190_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.1.2',
                                'nama_item' => 'Penyerapan air',
                                'total_nilai_ekonomi' => 215_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.1.3',
                                'nama_item' => 'Serasah',
                                'total_nilai_ekonomi' => 95_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.1.4',
                                'nama_item' => 'Penghasil Oksigen',
                                'total_nilai_ekonomi' => 240_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.1.5',
                                'nama_item' => 'Penyerapan CO2 (Carbon Stock)',
                                'total_nilai_ekonomi' => 290_000_000.00,
                                'kategori' => 'regulating',
                            ],
                        ],
                    ],
                    [
                        'nama' => 'Supporting',
                        'kode' => 'C',
                        'items' => [
                            [
                                'no' => 'C.1.1',
                                'nama_item' => 'Habitat - Reptil',
                                'total_nilai_ekonomi' => 110_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.1.2',
                                'nama_item' => 'Habitat - Burung',
                                'total_nilai_ekonomi' => 125_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.1.3',
                                'nama_item' => 'Habitat - Mamalia',
                                'total_nilai_ekonomi' => 85_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.2',
                                'nama_item' => 'Nursery ground (pembibitan)',
                                'total_nilai_ekonomi' => 105_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.3',
                                'nama_item' => 'Pembentukan Tanah',
                                'total_nilai_ekonomi' => 145_000_000.00,
                                'kategori' => 'supporting',
                            ],
                            [
                                'no' => 'C.5',
                                'nama_item' => 'Biodiversitas',
                                'total_nilai_ekonomi' => 170_000_000.00,
                                'kategori' => 'supporting',
                            ],
                        ],
                    ],
                    [
                        'nama' => 'Cultural',
                        'kode' => 'D',
                        'items' => [
                            [
                                'no' => 'D.1',
                                'nama_item' => 'Pendidikan dan Penelitian',
                                'total_nilai_ekonomi' => 95_000_000.00,
                                'kategori' => 'cultural',
                            ],
                            [
                                'no' => 'D.2',
                                'nama_item' => 'Budaya',
                                'total_nilai_ekonomi' => 55_000_000.00,
                                'kategori' => 'cultural',
                            ],
                            [
                                'no' => 'D.3',
                                'nama_item' => 'Wisata',
                                'total_nilai_ekonomi' => 80_000_000.00,
                                'kategori' => 'cultural',
                            ],
                        ],
                    ],
                ],
            ],

            // ============================================================
            // 5. LAHAN TERBANGUN
            // ============================================================
            [
                'nama' => 'Lahan Terbangun',
                'kategori' => [
                    [
                        'nama' => 'Regulating',
                        'kode' => 'B',
                        'items' => [
                            [
                                'no' => 'B.1',
                                'nama_item' => 'Pencegah erosi',
                                'total_nilai_ekonomi' => 140_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.2',
                                'nama_item' => 'Penyerapan air',
                                'total_nilai_ekonomi' => 115_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.3',
                                'nama_item' => 'Serasah',
                                'total_nilai_ekonomi' => 45_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.4',
                                'nama_item' => 'Penghasil Oksigen',
                                'total_nilai_ekonomi' => 160_000_000.00,
                                'kategori' => 'regulating',
                            ],
                            [
                                'no' => 'B.5',
                                'nama_item' => 'Penyerapan CO2 (Carbon Stock)',
                                'total_nilai_ekonomi' => 185_000_000.00,
                                'kategori' => 'regulating',
                            ],
                        ],
                    ],
                    [
                        'nama' => 'Cultural',
                        'kode' => 'D',
                        'items' => [
                            [
                                'no' => 'D.1',
                                'nama_item' => 'Pendidikan dan Penelitian',
                                'total_nilai_ekonomi' => 110_000_000.00,
                                'kategori' => 'cultural',
                            ],
                            [
                                'no' => 'D.2',
                                'nama_item' => 'Budaya',
                                'total_nilai_ekonomi' => 65_000_000.00,
                                'kategori' => 'cultural',
                            ],
                            [
                                'no' => 'D.3',
                                'nama_item' => 'CSR',
                                'total_nilai_ekonomi' => 225_000_000.00,
                                'kategori' => 'cultural',
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}
