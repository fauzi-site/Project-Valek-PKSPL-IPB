<?php

namespace App\Services\Valuation;

use App\Models\CulturalService;
use App\Models\JenisTutupanLahan;
use App\Models\ProvisioningService;
use App\Models\Proyek;
use App\Models\RegulatingService;
use App\Models\SupportingService;
use App\Models\ValuationRow;
use Illuminate\Support\Facades\Log;

/**
 * Service untuk menyinkronkan data dari lembar kerja Data Valuasi (valuation_rows)
 * secara otomatis ke dalam tabel Data Master (provisioning, regulating, supporting, cultural).
 */
class ValuationDataMasterSyncService
{
    /**
     * Menyinkronkan satu baris data valuasi ke tabel Data Master yang sesuai.
     */
    public function syncRow(
        int $landCoverId,
        string $serviceId,
        ?string $biota,
        array $rowData,
        float $totalNilai = 0.0
    ): bool {
        $rawItem = trim((string) ($rowData['item'] ?? ($rowData['nama_objek'] ?? '')));
        if ($rawItem === '') {
            return false;
        }

        $landCover = JenisTutupanLahan::with('index.proyek')->find($landCoverId);
        if (!$landCover) {
            return false;
        }

        $proyek = $landCover->index?->proyek;
        $idProvinsi = $proyek?->id_provinsi;
        $idKabupatenKota = $proyek?->id_kabupaten_kota;
        $idKecamatan = $proyek?->id_kecamatan;
        $idDesaKelurahan = $proyek?->id_desa_kelurahan;

        // Auto-resolve wilayah jika id_provinsi atau id_kabupaten_kota belum terisi pada proyek
        if ($proyek && (empty($idProvinsi) || empty($idKabupatenKota))) {
            $locText = strtolower(trim((string) ($proyek->alamat_lengkap ?? '')));
            if ($locText !== '') {
                $allKabs = \App\Models\KabupatenKota::query()->get();
                $kab = $allKabs->first(function ($item) use ($locText) {
                    $kabName = strtolower($item->nama_kabupaten_kota);
                    return str_contains($locText, $kabName);
                });
                if (!$kab) {
                    $kab = $allKabs->first(function ($item) use ($locText) {
                        $kabName = strtolower($item->nama_kabupaten_kota);
                        $cleanKab = trim(str_replace(['kabupaten', 'kota'], '', $kabName));
                        return $cleanKab !== '' && str_contains($locText, $cleanKab);
                    });
                }
                if ($kab) {
                    $idKabupatenKota = $kab->id_kabupaten_kota;
                    $idProvinsi = $idProvinsi ?: $kab->id_provinsi;
                    $proyek->update([
                        'id_kabupaten_kota' => $idKabupatenKota,
                        'id_provinsi' => $idProvinsi,
                    ]);
                } else {
                    $prov = \App\Models\Provinsi::query()->get()->first(function ($item) use ($locText) {
                        return str_contains($locText, strtolower($item->nama_provinsi));
                    });
                    if ($prov) {
                        $idProvinsi = $prov->id_provinsi;
                        $proyek->update(['id_provinsi' => $idProvinsi]);
                    }
                }
            }
        }

        $serviceKey = strtolower(trim($serviceId));

        switch ($serviceKey) {
            case 'provisioning':
                return $this->syncProvisioning($landCoverId, $rawItem, $rowData, $totalNilai, $idProvinsi, $idKabupatenKota, $idKecamatan, $idDesaKelurahan);

            case 'regulating':
                return $this->syncRegulating($landCoverId, $rawItem, $rowData, $totalNilai, $idProvinsi, $idKabupatenKota, $idKecamatan, $idDesaKelurahan);

            case 'supporting':
                return $this->syncSupporting($landCoverId, $rawItem, $rowData, $totalNilai, $idProvinsi, $idKabupatenKota, $idKecamatan, $idDesaKelurahan);

            case 'cultural':
                return $this->syncCultural($landCoverId, $rawItem, $rowData, $totalNilai, $idProvinsi, $idKabupatenKota, $idKecamatan, $idDesaKelurahan);

            default:
                Log::warning("[ValuationSync] Unknown service_id: {$serviceId}");
                return false;
        }
    }

    /**
     * Menghapus entri data master yang terkait jika baris data valuasi dihapus.
     */
    public function deleteRowSync(int $landCoverId, string $serviceId, array $rowData): bool
    {
        $rawItem = trim((string) ($rowData['item'] ?? ($rowData['nama_objek'] ?? '')));
        if ($rawItem === '') {
            return false;
        }

        $serviceKey = strtolower(trim($serviceId));
        $lowerItem = strtolower($rawItem);

        switch ($serviceKey) {
            case 'provisioning':
                return (bool) ProvisioningService::where('id_jenis_tutupan_lahan', $landCoverId)
                    ->where(function ($q) use ($lowerItem) {
                        $q->whereRaw('LOWER(TRIM(nama_objek)) = ?', [$lowerItem])
                          ->orWhereRaw('LOWER(TRIM(COALESCE(nama_latin, \'\'))) = ?', [$lowerItem]);
                    })
                    ->delete();

            case 'regulating':
                return (bool) RegulatingService::where('id_jenis_tutupan_lahan', $landCoverId)
                    ->whereRaw('LOWER(TRIM(jenis_regulating)) = ?', [$lowerItem])
                    ->delete();

            case 'supporting':
                return (bool) SupportingService::where('id_jenis_tutupan_lahan', $landCoverId)
                    ->whereRaw('LOWER(TRIM(fungsi_pendukung)) = ?', [$lowerItem])
                    ->delete();

            case 'cultural':
                return (bool) CulturalService::where('id_jenis_tutupan_lahan', $landCoverId)
                    ->whereRaw('LOWER(TRIM(nama_aktivitas)) = ?', [$lowerItem])
                    ->delete();

            default:
                return false;
        }
    }

    /**
     * Sinkronisasi rekonsiliasi seluruh baris valuasi milik sebuah proyek.
     */
    public function reconcileProject(Proyek $proyek): int
    {
        $proyek->loadMissing('indexes.jenisTutupanLahan');
        $landCoverIds = $proyek->indexes
            ->flatMap->jenisTutupanLahan
            ->pluck('id_jenis_tutupan_lahan')
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (empty($landCoverIds)) {
            return 0;
        }

        $rows = ValuationRow::whereIn('id_jenis_tutupan_lahan', $landCoverIds)->get();
        $syncedCount = 0;

        foreach ($rows as $row) {
            $data = is_array($row->row_data) ? $row->row_data : [];
            $val = (float) ($row->total_nilai ?? ($data['totalNilai'] ?? 0));
            $ok = $this->syncRow(
                (int) $row->id_jenis_tutupan_lahan,
                (string) $row->service_id,
                $row->biota,
                $data,
                $val
            );
            if ($ok) {
                $syncedCount++;
            }
        }

        return $syncedCount;
    }

    /**
     * Helper pemisah nama latin dan nama daerah jika format string mengandung tanda kurung:
     * Contoh: "Rhizophora apiculata (Bakau Minyak)" atau "Bakau Minyak (Rhizophora apiculata)"
     */
    private function parseItemNames(string $rawItem, array $rowData): array
    {
        $namaLatin = $rowData['nama_latin'] ?? null;
        $namaDaerah = $rowData['nama_daerah'] ?? null;

        if (preg_match('/^([^(]+)\s*\(([^)]+)\)$/', $rawItem, $matches)) {
            $part1 = trim($matches[1]);
            $part2 = trim($matches[2]);

            if (empty($namaLatin)) {
                $namaLatin = $part1;
            }
            if (empty($namaDaerah)) {
                $namaDaerah = $part2;
            }
        }

        return [$namaLatin, $namaDaerah];
    }

    /**
     * Sinkronisasi entri Provisioning
     */
    private function syncProvisioning(
        int $landCoverId,
        string $rawItem,
        array $rowData,
        float $totalNilai,
        ?int $idProvinsi,
        ?int $idKabupatenKota,
        ?int $idKecamatan,
        ?int $idDesaKelurahan
    ): bool {
        [$namaLatin, $namaDaerah] = $this->parseItemNames($rawItem, $rowData);

        $produktivitas = (float) ($rowData['produktivitas'] ?? 0.0);
        $volume = (float) ($rowData['jumlah'] ?? ($rowData['volume'] ?? 0.0));
        $hargaPasar = (float) ($rowData['hargaUnit'] ?? ($rowData['harga_pasar'] ?? 0.0));
        $luasHa = (float) ($rowData['luasHa'] ?? ($rowData['luas_pemanfaatan'] ?? 0.0));
        $source = trim((string) ($rowData['source'] ?? ($rowData['referensi'] ?? 'Survei Valuasi Lapangan')));

        if ($totalNilai <= 0 && $volume > 0 && $hargaPasar > 0) {
            $totalNilai = round($volume * $hargaPasar);
        } elseif ($totalNilai <= 0 && $produktivitas > 0 && $hargaPasar > 0 && $luasHa > 0) {
            $totalNilai = round($produktivitas * $luasHa * $hargaPasar);
        }

        $lowerItem = strtolower($rawItem);
        $existing = ProvisioningService::where('id_jenis_tutupan_lahan', $landCoverId)
            ->where(function ($q) use ($lowerItem) {
                $q->whereRaw('LOWER(TRIM(nama_objek)) = ?', [$lowerItem])
                  ->orWhereRaw('LOWER(TRIM(COALESCE(nama_latin, \'\'))) = ?', [$lowerItem]);
            })
            ->first();

        if ($existing) {
            $existing->update([
                'produktivitas' => $produktivitas > 0 ? $produktivitas : $existing->produktivitas,
                'harga_pasar' => $hargaPasar > 0 ? $hargaPasar : $existing->harga_pasar,
                'luas_pemanfaatan' => $luasHa > 0 ? $luasHa : $existing->luas_pemanfaatan,
                'nilai' => $totalNilai > 0 ? $totalNilai : $existing->nilai,
                'referensi' => $source ?: $existing->referensi,
                'id_provinsi' => $idProvinsi ?: $existing->id_provinsi,
                'id_kabupaten_kota' => $idKabupatenKota ?: $existing->id_kabupaten_kota,
                'id_kecamatan' => $idKecamatan ?: $existing->id_kecamatan,
                'id_desa_kelurahan' => $idDesaKelurahan ?: $existing->id_desa_kelurahan,
            ]);
            return true;
        }

        ProvisioningService::create([
            'id_jenis_tutupan_lahan' => $landCoverId,
            'nama_objek' => $rawItem,
            'nama_latin' => $namaLatin ?: $rawItem,
            'nama_daerah' => $namaDaerah,
            'produktivitas' => $produktivitas > 0 ? $produktivitas : 0.0,
            'harga_pasar' => $hargaPasar,
            'luas_pemanfaatan' => $luasHa > 0 ? $luasHa : 1.0,
            'satuan_luas' => 'Hektar',
            'referensi' => $source ?: 'Survei Valuasi Lapangan',
            'nilai' => $totalNilai,
            'kategori_tev' => 'DUV',
            'id_provinsi' => $idProvinsi,
            'id_kabupaten_kota' => $idKabupatenKota,
            'id_kecamatan' => $idKecamatan,
            'id_desa_kelurahan' => $idDesaKelurahan,
        ]);

        return true;
    }

    /**
     * Sinkronisasi entri Regulating
     */
    private function syncRegulating(
        int $landCoverId,
        string $rawItem,
        array $rowData,
        float $totalNilai,
        ?int $idProvinsi,
        ?int $idKabupatenKota,
        ?int $idKecamatan,
        ?int $idDesaKelurahan
    ): bool {
        $satuan = trim((string) ($rowData['satuan'] ?? ($rowData['unit'] ?? 'Hektar')));
        $indikator = trim((string) ($rowData['indikator'] ?? ($rowData['parameter'] ?? 'Fungsi Pengaturan Ekosistem')));
        $source = trim((string) ($rowData['source'] ?? ($rowData['referensi'] ?? 'Survei Valuasi Lapangan')));

        $lowerItem = strtolower($rawItem);
        $existing = RegulatingService::where('id_jenis_tutupan_lahan', $landCoverId)
            ->whereRaw('LOWER(TRIM(jenis_regulating)) = ?', [$lowerItem])
            ->first();

        if ($existing) {
            $existing->update([
                'nilai' => $totalNilai > 0 ? $totalNilai : $existing->nilai,
                'satuan' => $satuan ?: $existing->satuan,
                'referensi' => $source ?: $existing->referensi,
                'id_provinsi' => $idProvinsi ?: $existing->id_provinsi,
                'id_kabupaten_kota' => $idKabupatenKota ?: $existing->id_kabupaten_kota,
                'id_kecamatan' => $idKecamatan ?: $existing->id_kecamatan,
                'id_desa_kelurahan' => $idDesaKelurahan ?: $existing->id_desa_kelurahan,
            ]);
            return true;
        }

        RegulatingService::create([
            'id_jenis_tutupan_lahan' => $landCoverId,
            'jenis_regulating' => $rawItem,
            'indikator' => $indikator ?: 'Fungsi Pengaturan Ekosistem',
            'satuan' => $satuan ?: 'Hektar',
            'nilai_indikator' => 1.0,
            'referensi' => $source ?: 'Survei Valuasi Lapangan',
            'nilai' => $totalNilai,
            'kategori_tev' => 'IUV',
            'id_provinsi' => $idProvinsi,
            'id_kabupaten_kota' => $idKabupatenKota,
            'id_kecamatan' => $idKecamatan,
            'id_desa_kelurahan' => $idDesaKelurahan,
        ]);

        return true;
    }

    /**
     * Sinkronisasi entri Supporting
     */
    private function syncSupporting(
        int $landCoverId,
        string $rawItem,
        array $rowData,
        float $totalNilai,
        ?int $idProvinsi,
        ?int $idKabupatenKota,
        ?int $idKecamatan,
        ?int $idDesaKelurahan
    ): bool {
        $deskripsi = trim((string) ($rowData['deskripsi'] ?? ($rowData['klasifikasi'] ?? 'Fungsi Pendukung Ekosistem')));
        $source = trim((string) ($rowData['source'] ?? ($rowData['referensi'] ?? 'Survei Valuasi Lapangan')));

        $lowerItem = strtolower($rawItem);
        $existing = SupportingService::where('id_jenis_tutupan_lahan', $landCoverId)
            ->whereRaw('LOWER(TRIM(fungsi_pendukung)) = ?', [$lowerItem])
            ->first();

        if ($existing) {
            $existing->update([
                'nilai' => $totalNilai > 0 ? $totalNilai : $existing->nilai,
                'deskripsi' => $deskripsi ?: $existing->deskripsi,
                'referensi' => $source ?: $existing->referensi,
                'id_provinsi' => $idProvinsi ?: $existing->id_provinsi,
                'id_kabupaten_kota' => $idKabupatenKota ?: $existing->id_kabupaten_kota,
                'id_kecamatan' => $idKecamatan ?: $existing->id_kecamatan,
                'id_desa_kelurahan' => $idDesaKelurahan ?: $existing->id_desa_kelurahan,
            ]);
            return true;
        }

        SupportingService::create([
            'id_jenis_tutupan_lahan' => $landCoverId,
            'fungsi_pendukung' => $rawItem,
            'deskripsi' => $deskripsi ?: 'Fungsi Pendukung Ekosistem',
            'referensi' => $source ?: 'Survei Valuasi Lapangan',
            'nilai' => $totalNilai,
            'kategori_tev' => 'OV',
            'id_provinsi' => $idProvinsi,
            'id_kabupaten_kota' => $idKabupatenKota,
            'id_kecamatan' => $idKecamatan,
            'id_desa_kelurahan' => $idDesaKelurahan,
        ]);

        return true;
    }

    /**
     * Sinkronisasi entri Cultural
     */
    private function syncCultural(
        int $landCoverId,
        string $rawItem,
        array $rowData,
        float $totalNilai,
        ?int $idProvinsi,
        ?int $idKabupatenKota,
        ?int $idKecamatan,
        ?int $idDesaKelurahan
    ): bool {
        // The TCM / CVM tables store the visit count as `kunjungan` and the population as `populasi`.
        $jumlahPengunjung = (float) ($rowData['jumlahPengunjung'] ?? $rowData['pengunjung'] ?? $rowData['kunjungan'] ?? $rowData['populasi'] ?? 1000.0);
        // Per-visit (TCM) or per-person (CVM) value: travel cost / consumer surplus, or the WTP of a CVM row.
        // CulturalCalculator multiplies it by visitors x frequency, so a CVM row needs it or it values to zero.
        $biayaPerjalanan = (float) ($rowData['biayaPerjalanan'] ?? $rowData['biaya'] ?? $rowData['wtp'] ?? 0.0);
        $source = trim((string) ($rowData['source'] ?? ($rowData['referensi'] ?? 'Survei Valuasi Lapangan')));

        $lowerItem = strtolower($rawItem);
        $existing = CulturalService::where('id_jenis_tutupan_lahan', $landCoverId)
            ->whereRaw('LOWER(TRIM(nama_aktivitas)) = ?', [$lowerItem])
            ->first();

        if ($existing) {
            $existing->update([
                'nilai' => $totalNilai > 0 ? $totalNilai : $existing->nilai,
                'jumlah_pengunjung' => $jumlahPengunjung > 0 ? $jumlahPengunjung : $existing->jumlah_pengunjung,
                'biaya_perjalanan' => $biayaPerjalanan > 0 ? $biayaPerjalanan : $existing->biaya_perjalanan,
                'referensi' => $source ?: $existing->referensi,
                'id_provinsi' => $idProvinsi ?: $existing->id_provinsi,
                'id_kabupaten_kota' => $idKabupatenKota ?: $existing->id_kabupaten_kota,
                'id_kecamatan' => $idKecamatan ?: $existing->id_kecamatan,
                'id_desa_kelurahan' => $idDesaKelurahan ?: $existing->id_desa_kelurahan,
            ]);
            return true;
        }

        CulturalService::create([
            'id_jenis_tutupan_lahan' => $landCoverId,
            'nama_aktivitas' => $rawItem,
            'jumlah_pengunjung' => $jumlahPengunjung > 0 ? $jumlahPengunjung : 1000.0,
            'biaya_perjalanan' => $biayaPerjalanan,
            'frekuensi' => 1,
            'referensi' => $source ?: 'Survei Valuasi Lapangan',
            'nilai' => $totalNilai,
            'kategori_tev' => 'DUV',
            'id_provinsi' => $idProvinsi,
            'id_kabupaten_kota' => $idKabupatenKota,
            'id_kecamatan' => $idKecamatan,
            'id_desa_kelurahan' => $idDesaKelurahan,
        ]);

        return true;
    }
}

