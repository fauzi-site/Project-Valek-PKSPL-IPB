<?php

namespace Database\Seeders;

use App\Models\Proyek;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IndexSeeder extends Seeder
{
    public function run(): void
    {
        $projectIndexDefs = [
            'PRJ-001' => [
                [
                    'kode_index' => 'IDX-001',
                    'nama_index' => 'Mangrove Barat',
                    'luas' => 79.86,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Delineasi tutupan mangrove barat pesisir Teluk Benoa.',
                ],
                [
                    'kode_index' => 'IDX-002',
                    'nama_index' => 'Mangrove Timur',
                    'luas' => 62.40,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Delineasi tutupan mangrove timur teluk.',
                ],
                [
                    'kode_index' => 'IDX-003',
                    'nama_index' => 'Lamun Utara',
                    'luas' => 34.20,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Zona padang lamun utara perairan Teluk Benoa.',
                ],
                [
                    'kode_index' => 'IDX-004',
                    'nama_index' => 'Terumbu Karang Selatan',
                    'luas' => 18.75,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Kawasan terumbu karang tepi zona selatan.',
                ],
                [
                    'kode_index' => 'IDX-005',
                    'nama_index' => 'Perairan Teluk',
                    'luas' => 120.50,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Badan air dan jalur sirkulasi pasang surut perairan teluk.',
                ],
            ],
            'PRJ-002' => [
                [
                    'kode_index' => 'IDX-JKT-01',
                    'nama_index' => 'Hutan Kota Senayan & GBK',
                    'luas' => 25.50,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Kawasan tutupan vegetasi pohon kanopi lebat dan RTH perkotaan.',
                ],
                [
                    'kode_index' => 'IDX-JKT-02',
                    'nama_index' => 'Danau & Vegetasi Riparian',
                    'luas' => 19.70,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Kawasan badan air buatan dan sempadan vegetasi riparian.',
                ],
            ],
            'PRJ-003' => [
                [
                    'kode_index' => 'IDX-BLI-01',
                    'nama_index' => 'Terumbu Karang Pandawa',
                    'luas' => 180.00,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Zona terumbu karang karang tepi perairan selatan Bali.',
                ],
                [
                    'kode_index' => 'IDX-BLI-02',
                    'nama_index' => 'Padang Lamun Pantai Kutuh',
                    'luas' => 140.00,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Ekosistem padang lamun dangkal intertidal pantai Kutuh.',
                ],
            ],
            'PRJ-004' => [
                [
                    'kode_index' => 'IDX-001',
                    'nama_index' => 'Mangrove Lebat (Tahura Ngurah Rai)',
                    'luas' => 45.20,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Tutupan mangrove primer kanopi rapat dengan tegakan Rhizophora dan Bruguiera.',
                ],
                [
                    'kode_index' => 'IDX-002',
                    'nama_index' => 'Mangrove Sedang (Estuari Benoa)',
                    'luas' => 28.50,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Tutupan mangrove kerapatan sedang zona peralihan estuari dan laguna.',
                ],
                [
                    'kode_index' => 'IDX-003',
                    'nama_index' => 'Mangrove Jarang (Sempadan)',
                    'luas' => 15.00,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Zona suksesi vegetasi perintis Avicennia marina sempadan tambak dan pasut.',
                ],
            ],
            'PRJ-005' => [
                [
                    'kode_index' => 'IDX-BDG-01',
                    'nama_index' => 'Tebing Karang & Pesisir Bukit',
                    'luas' => 280.00,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Sistem pertahanan alami tebing kapur dan karang tepi pelindung pasang.',
                ],
                [
                    'kode_index' => 'IDX-BDG-02',
                    'nama_index' => 'Zona Karang Penghalang Pasang',
                    'luas' => 230.00,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Formasi terumbu karang pemecah gelombang samudra Hindia.',
                ],
            ],
            'PRJ-006' => [
                [
                    'kode_index' => 'IDX-BTN-01',
                    'nama_index' => 'Padang Lamun Enhalus acoroides',
                    'luas' => 260.00,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Hamparan padang lamun dominan Enhalus dan Thalassia Teluk Banten.',
                ],
                [
                    'kode_index' => 'IDX-BTN-02',
                    'nama_index' => 'Sedimen Karbon Teluk Banten',
                    'luas' => 170.25,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Zona sedimen dasar laut penyimpan cadangan karbon biru.',
                ],
            ],
            'PRJ-007' => [
                [
                    'kode_index' => 'IDX-CTR-01',
                    'nama_index' => 'Estuari Muara Citarum',
                    'luas' => 390.00,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Zona perairan estuari muara sungai pertemuan air tawar dan laut.',
                ],
                [
                    'kode_index' => 'IDX-CTR-02',
                    'nama_index' => 'Sabuk Hijau Mangrove Pesisir',
                    'luas' => 280.00,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Sabuk hijau mangrove pengendali sedimentasi dan erosi muara.',
                ],
            ],
            'PRJ-008' => [
                [
                    'kode_index' => 'IDX-NP-01',
                    'nama_index' => 'Terumbu Karang Crystal Bay',
                    'luas' => 24.80,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Zona inti terumbu karang karang tepi perairan barat Nusa Penida.',
                ],
                [
                    'kode_index' => 'IDX-NP-02',
                    'nama_index' => 'Terumbu Karang Manta Point',
                    'luas' => 45.20,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Kawasan terumbu tebing curam habitat pari manta.',
                ],
                [
                    'kode_index' => 'IDX-NP-03',
                    'nama_index' => 'Padang Lamun Lembongan',
                    'luas' => 18.60,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Ekosistem lamun padat perairan dangkal selat Ceningan-Lembongan.',
                ],
            ],
            'PRJ-009' => [
                [
                    'kode_index' => 'IDX-KS-01',
                    'nama_index' => 'Mangrove Rambut & Untung Jawa',
                    'luas' => 160.40,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Kawasan cagar alam mangrove pulau kecil suaka burung laut.',
                ],
                [
                    'kode_index' => 'IDX-KS-02',
                    'nama_index' => 'Terumbu Karang Pulau Pari',
                    'luas' => 150.00,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Zona terumbu karang cincin pelindung gugusan atol Pulau Pari.',
                ],
            ],
            'PRJ-010' => [
                [
                    'kode_index' => 'IDX-EKW-01',
                    'nama_index' => 'Kawasan Ekowisata Bahari Sanur',
                    'luas' => 140.00,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Zona pemanfaatan rekreasi pantai, snorkeling, dan diving Sanur.',
                ],
                [
                    'kode_index' => 'IDX-EKW-02',
                    'nama_index' => 'Zona Konservasi Tanjung Benoa',
                    'luas' => 100.00,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Sempadan mangrove dan laguna penyu Tanjung Benoa.',
                ],
            ],
            'PRJ-ANTAM' => [
                [
                    'kode_index' => 'IDX-ANTAM-01',
                    'nama_index' => 'Area Reklamasi',
                    'luas' => 250.00,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Zona revegetasi dan reklamasi lahan pascatambang PT Antam.',
                ],
                [
                    'kode_index' => 'IDX-ANTAM-02',
                    'nama_index' => 'Hutan Lahan Kering Sekunder',
                    'luas' => 650.00,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Kawasan hutan alam sekunder lahan kering di sekitar IUP PT Antam.',
                ],
                [
                    'kode_index' => 'IDX-ANTAM-03',
                    'nama_index' => 'Semak Belukar',
                    'luas' => 320.00,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Zona vegetasi semak belukar alami dan transisi suksesi.',
                ],
                [
                    'kode_index' => 'IDX-ANTAM-04',
                    'nama_index' => 'Belukar',
                    'luas' => 180.00,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Kawasan tutupan belukar kerapatan sedang pasca gangguan.',
                ],
                [
                    'kode_index' => 'IDX-ANTAM-05',
                    'nama_index' => 'Lahan Terbangun',
                    'luas' => 140.50,
                    'satuan_luas' => 'Hektar',
                    'deskripsi' => 'Kawasan fasilitas operasional, pabrik pengolahan, dan perkantoran PT Antam.',
                ],
            ],
        ];

        foreach ($projectIndexDefs as $kodeProyek => $indices) {
            $proyek = Proyek::where('kode_proyek', $kodeProyek)->first();
            if (!$proyek) continue;

            foreach ($indices as $item) {
                DB::table('indexes')->updateOrInsert(
                    [
                        'id_proyek' => $proyek->id_proyek,
                        'kode_index' => $item['kode_index']
                    ],
                    array_merge($item, [
                        'created_at' => now(),
                        'updated_at' => now(),
                    ])
                );
            }
        }
    }
}
