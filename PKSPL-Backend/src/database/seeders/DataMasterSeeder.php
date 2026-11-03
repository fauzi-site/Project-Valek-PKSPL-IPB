<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Mengisi Data Master jasa ekosistem (Provisioning, Regulating, Supporting, Cultural)
 * per kabupaten/kota tempat proyek berada.
 *
 * Katalog disusun per jenis ekosistem, lalu dipasang pada tutupan lahan proyek di tiap
 * kabupaten/kota yang tutupan lahannya berkategori sama. Wilayah (provinsi, kabupaten/kota)
 * disalin dari kabupaten/kota proyek sehingga katalog bisa difilter per lokasi penelitian.
 *
 * Nilai pada katalog bersifat indikatif (acuan awal), bukan hasil survei, dan harus
 * diverifikasi peneliti sebelum dipakai di analisis.
 */
class DataMasterSeeder extends Seeder
{
    /** Pengali harga/biaya per kabupaten/kota (kode BPS). Selain yang tercantum = 1.0. */
    private const FAKTOR_HARGA = [
        '3101' => 1.10, // Kab. Kepulauan Seribu
    ];

    /** Tambahan khusus wilayah: [kode kabupaten][kategori ekosistem]['provisioning'] => daftar item. */
    private function tambahanWilayah(): array
    {
        return [
            // Hasil tangkapan dari wawancara nelayan Pulau Pramuka. Volume belum tercatat,
            // jadi produktivitas dan nilai dibiarkan 0 sampai peneliti melengkapinya.
            '3101' => [
                'Terumbu Karang' => [
                    'provisioning' => [
                        ['Ikan tongkol', 'Euthynnus affinis', 'Tongkol komo', 0, 20000, 'Wawancara nelayan P. Pramuka (harga pengepul Rp 20.000/kg, volume belum tercatat)'],
                        ['Ikan tenggiri', 'Scomberomorus commerson', 'Tenggiri / juker', 0, 60000, 'Wawancara nelayan P. Pramuka (indikasi Rp 60.000/kg, spesies dan harga belum terverifikasi)'],
                    ],
                ],
            ],
        ];
    }

    /**
     * Katalog per kategori tutupan lahan.
     * provisioning: [nama, nama latin, nama daerah, produktivitas (kg/ha/th), harga (Rp/kg)]
     * regulating:   [jenis, indikator, satuan, nilai indikator, nilai (Rp/th)]
     * supporting:   [fungsi, deskripsi, nilai (Rp/th)]
     * cultural:     [aktivitas, pengunjung/th, biaya perjalanan (Rp), frekuensi]
     */
    private function katalog(): array
    {
        return [
            'Mangrove' => [
                'provisioning' => [
                    ['Kepiting bakau', 'Scylla serrata', 'Kepiting bakau', 45, 90000],
                    ['Udang windu', 'Penaeus monodon', 'Udang windu', 30, 85000],
                    ['Ikan belanak', 'Mugil cephalus', 'Belanak', 120, 25000],
                    ['Madu mangrove', 'Apis dorsata', 'Madu hutan bakau', 8, 120000],
                ],
                'regulating' => [
                    ['Perlindungan garis pantai', 'Reduksi tinggi gelombang', '%', 70, 25000000],
                    ['Penyimpanan karbon', 'Stok karbon', 'ton C/ha', 150, 40000000],
                ],
                'supporting' => [
                    ['Habitat dan nursery ground biota', 'Tempat pemijahan dan pembesaran ikan, udang, dan kepiting.', 30000000],
                    ['Siklus nutrien dan penjernihan air', 'Penjerapan sedimen dan nutrien dari daratan.', 18000000],
                ],
                'cultural' => [
                    ['Ekowisata mangrove', 1500, 50000, 1],
                    ['Pendidikan dan penelitian', 600, 75000, 1],
                ],
            ],
            'Padang Lamun' => [
                'provisioning' => [
                    ['Ikan baronang', 'Siganus canaliculatus', 'Baronang', 100, 40000],
                    ['Teripang pasir', 'Holothuria scabra', 'Teripang', 15, 250000],
                    ['Siput gonggong', 'Laevistrombus turturella', 'Gonggong', 40, 30000],
                    ['Rajungan', 'Portunus pelagicus', 'Rajungan', 30, 70000],
                ],
                'regulating' => [
                    ['Penyimpanan karbon biru', 'Stok karbon', 'ton C/ha', 60, 22000000],
                    ['Peredam gelombang dan penahan sedimen', 'Reduksi energi gelombang', '%', 40, 15000000],
                ],
                'supporting' => [
                    ['Nursery ground biota', 'Daerah asuhan juvenil ikan, udang, dan rajungan.', 24000000],
                    ['Penyedia pakan megafauna', 'Sumber pakan dugong dan penyu hijau.', 12000000],
                ],
                'cultural' => [
                    ['Wisata snorkeling dan edukasi lamun', 900, 120000, 1],
                    ['Penelitian dan monitoring lamun', 250, 150000, 1],
                ],
            ],
            'Terumbu Karang' => [
                'provisioning' => [
                    ['Ikan kerapu', 'Epinephelus fuscoguttatus', 'Kerapu macan', 60, 120000],
                    ['Ikan kakap merah', 'Lutjanus malabaricus', 'Kakap merah', 80, 70000],
                    ['Ikan ekor kuning', 'Caesio cuning', 'Ekor kuning', 150, 30000],
                    ['Lobster batu', 'Panulirus homarus', 'Lobster', 10, 300000],
                ],
                'regulating' => [
                    ['Pemecah gelombang alami', 'Reduksi energi gelombang', '%', 90, 60000000],
                    ['Penyedia pasir karbonat pantai', 'Produksi sedimen karbonat', 'ton/ha/th', 4, 8000000],
                ],
                'supporting' => [
                    ['Habitat dan keanekaragaman hayati', 'Habitat ikan karang, moluska, dan krustasea.', 45000000],
                    ['Daerah pemijahan dan asuhan', 'Spawning dan nursery ground ikan karang.', 30000000],
                ],
                'cultural' => [
                    ['Wisata selam dan snorkeling', 3000, 250000, 1],
                    ['Fotografi bawah laut dan penelitian', 500, 400000, 1],
                ],
            ],
            'Hutan' => [
                'provisioning' => [
                    ['Bambu', 'Bambusa vulgaris', 'Bambu', 150, 35000],
                    ['Madu hutan', 'Apis cerana', 'Madu hutan', 6, 100000],
                    ['Kunyit (tanaman obat)', 'Curcuma longa', 'Kunyit', 500, 12000],
                ],
                'regulating' => [
                    ['Penyimpanan karbon', 'Stok karbon', 'ton C/ha', 120, 32000000],
                    ['Pengaturan tata air', 'Kapasitas infiltrasi', 'mm/th', 1200, 20000000],
                ],
                'supporting' => [
                    ['Habitat burung dan satwa liar', 'Tempat berlindung dan mencari makan satwa.', 22000000],
                    ['Pembentukan tanah dan siklus hara', 'Pengayaan bahan organik dari serasah.', 14000000],
                ],
                'cultural' => [
                    ['Rekreasi hutan kota', 8000, 20000, 1],
                    ['Edukasi lingkungan', 1200, 30000, 1],
                ],
            ],
            'Estuari & Perairan' => [
                'provisioning' => [
                    ['Ikan bandeng', 'Chanos chanos', 'Bandeng', 800, 22000],
                    ['Kerang hijau', 'Perna viridis', 'Kerang hijau', 2000, 12000],
                    ['Udang rebon', 'Acetes sp.', 'Rebon', 100, 45000],
                ],
                'regulating' => [
                    ['Reduksi beban nutrien', 'Nitrogen terjerap', 'kg N/ha/th', 80, 18000000],
                    ['Peredam banjir rob', 'Daya tampung air', 'm3/ha', 5000, 22000000],
                ],
                'supporting' => [
                    ['Habitat burung air dan nursery ground', 'Area singgah burung migran dan asuhan biota estuari.', 26000000],
                    ['Siklus nutrien', 'Pertukaran nutrien antara sungai dan laut.', 15000000],
                ],
                'cultural' => [
                    ['Wisata pesisir muara', 2000, 40000, 1],
                    ['Penelitian kualitas air', 300, 100000, 1],
                ],
            ],
            'Ekosistem Pesisir' => [
                'provisioning' => [
                    ['Ikan kembung', 'Rastrelliger kanagurta', 'Kembung', 200, 35000],
                    ['Rumput laut', 'Eucheuma cottonii', 'Rumput laut', 800, 9000],
                ],
                'regulating' => [
                    ['Perlindungan pantai dari abrasi', 'Panjang garis pantai terlindungi', 'm/ha', 120, 30000000],
                    ['Penyimpanan karbon', 'Stok karbon', 'ton C/ha', 40, 12000000],
                ],
                'supporting' => [
                    ['Habitat dan keanekaragaman hayati pesisir', 'Habitat biota pantai dan perairan dangkal.', 20000000],
                    ['Sirkulasi nutrien', 'Pertukaran nutrien perairan pantai.', 10000000],
                ],
                'cultural' => [
                    ['Wisata pantai dan bahari', 5000, 100000, 1],
                    ['Rekreasi memancing', 800, 150000, 1],
                ],
            ],
            'Perairan Darat & DAS' => [
                'provisioning' => [
                    ['Ikan gurame', 'Osphronemus goramy', 'Gurame', 2800, 65000],
                    ['Talas bogor', 'Colocasia esculenta', 'Talas', 12500, 8000],
                    ['Bambu betung', 'Dendrocalamus asper', 'Awi bitung', 180, 35000],
                    ['Pala', 'Myristica fragrans', 'Pala', 600, 85000],
                ],
                'regulating' => [
                    ['Retensi air dan pengendali banjir', 'Daya tampung air', 'm3/ha/th', 8000, 28000000],
                    ['Penjernihan air', 'Reduksi sedimen tersuspensi', '%', 60, 16000000],
                ],
                'supporting' => [
                    ['Habitat biota air tawar dan burung air', 'Habitat ikan, amfibi, dan burung air situ.', 20000000],
                    ['Siklus hara perairan', 'Pertukaran nutrien antara tangkapan air dan situ.', 12000000],
                ],
                'cultural' => [
                    ['Rekreasi situ dan danau', 12000, 15000, 1],
                    ['Edukasi dan penelitian DAS', 1500, 25000, 1],
                ],
            ],
        ];
    }

    public function run(): void
    {
        $katalog = $this->katalog();
        $tambahan = $this->tambahanWilayah();

        $kabupatenIds = DB::table('proyek')
            ->where('kode_proyek', '!=', 'PRJ-ANTAM')
            ->whereNotNull('id_kabupaten_kota')
            ->distinct()
            ->pluck('id_kabupaten_kota');

        foreach ($kabupatenIds as $idKab) {
            $kab = DB::table('kabupaten_kota')->where('id_kabupaten_kota', $idKab)->first();
            if (!$kab) {
                continue;
            }

            $faktor = self::FAKTOR_HARGA[$kab->kode_kabupaten_kota] ?? 1.0;
            $wilayah = [
                'id_provinsi' => $kab->id_provinsi,
                'id_kabupaten_kota' => $kab->id_kabupaten_kota,
                'id_kecamatan' => null,
                'id_desa_kelurahan' => null,
            ];
            $acuan = "Katalog acuan {$kab->nama_kabupaten_kota} (indikatif, verifikasi sebelum dipakai)";

            // Satu tutupan lahan jangkar per kategori: proyek dengan kode terkecil, lalu id terkecil.
            $jangkar = DB::table('jenis_tutupan_lahan')
                ->join('indexes', 'indexes.id_index', '=', 'jenis_tutupan_lahan.id_index')
                ->join('proyek', 'proyek.id_proyek', '=', 'indexes.id_proyek')
                ->where('proyek.id_kabupaten_kota', $idKab)
                ->where('proyek.kode_proyek', '!=', 'PRJ-ANTAM')
                ->orderBy('proyek.kode_proyek')
                ->orderBy('jenis_tutupan_lahan.id_jenis_tutupan_lahan')
                ->select('jenis_tutupan_lahan.id_jenis_tutupan_lahan', 'jenis_tutupan_lahan.kategori')
                ->get()
                ->unique('kategori');

            foreach ($jangkar as $lahan) {
                $isi = $katalog[$lahan->kategori] ?? null;
                if (!$isi) {
                    continue;
                }
                $extra = $tambahan[$kab->kode_kabupaten_kota][$lahan->kategori] ?? [];
                $this->isi((int) $lahan->id_jenis_tutupan_lahan, $isi, $extra, $faktor, $acuan, $wilayah);
            }
        }
    }

    private function isi(int $idLahan, array $isi, array $extra, float $faktor, string $acuan, array $wilayah): void
    {
        $now = now();
        $kunci = ['id_jenis_tutupan_lahan' => $idLahan];

        $provisioning = array_merge(
            array_map(fn ($p) => $p + [5 => $acuan], $isi['provisioning']),
            $extra['provisioning'] ?? []
        );
        foreach ($provisioning as [$nama, $latin, $daerah, $produktivitas, $harga, $referensi]) {
            $harga = round($harga * ($referensi === $acuan ? $faktor : 1), 2);
            DB::table('provisioning_service')->updateOrInsert(
                $kunci + ['nama_objek' => $nama],
                array_merge([
                    'nama_latin' => $latin,
                    'nama_daerah' => $daerah,
                    'produktivitas' => $produktivitas,
                    'harga_pasar' => $harga,
                    'luas_pemanfaatan' => 1,
                    'satuan_luas' => 'Hektar',
                    'referensi' => $referensi,
                    'nilai' => round($produktivitas * $harga, 2),
                    'kategori_tev' => 'DUV',
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $wilayah)
            );
        }

        foreach ($isi['regulating'] as [$jenis, $indikator, $satuan, $nilaiIndikator, $nilai]) {
            DB::table('regulating_service')->updateOrInsert(
                $kunci + ['jenis_regulating' => $jenis],
                array_merge([
                    'indikator' => $indikator,
                    'satuan' => $satuan,
                    'nilai_indikator' => $nilaiIndikator,
                    'referensi' => $acuan,
                    'nilai' => round($nilai * $faktor, 2),
                    'kategori_tev' => 'IUV',
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $wilayah)
            );
        }

        foreach ($isi['supporting'] as [$fungsi, $deskripsi, $nilai]) {
            DB::table('supporting_service')->updateOrInsert(
                $kunci + ['fungsi_pendukung' => $fungsi],
                array_merge([
                    'deskripsi' => $deskripsi,
                    'referensi' => $acuan,
                    'nilai' => round($nilai * $faktor, 2),
                    'kategori_tev' => 'OV',
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $wilayah)
            );
        }

        foreach ($isi['cultural'] as [$aktivitas, $pengunjung, $biaya, $frekuensi]) {
            $biaya = round($biaya * $faktor, 2);
            DB::table('cultural_service')->updateOrInsert(
                $kunci + ['nama_aktivitas' => $aktivitas],
                array_merge([
                    'jumlah_pengunjung' => $pengunjung,
                    'biaya_perjalanan' => $biaya,
                    'frekuensi' => $frekuensi,
                    'referensi' => $acuan,
                    'nilai' => round($pengunjung * $biaya * $frekuensi, 2),
                    'kategori_tev' => 'EV',
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $wilayah)
            );
        }
    }
}
