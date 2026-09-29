<?php

namespace App\Http\Controllers\Api\V1\Project;

use App\Http\Controllers\Controller;
use App\Models\CulturalService;
use App\Models\ProvisioningService;
use App\Models\Proyek;
use App\Models\RegulatingService;
use App\Models\Role;
use App\Models\SupportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Controller untuk mengelola Data Master jasa ekosistem yang terisolasi
 * dan terfilter otomatis berdasarkan wilayah dan tutupan lahan proyek aktif.
 */
class ProjectDataMasterController extends Controller
{
    /**
     * Mengambil seluruh Data Master 4 kategori yang relevan dengan proyek aktif.
     */
    public function index(Request $request, Proyek $proyek): JsonResponse
    {
        // 1. Validasi Akses Pengguna (Katalog Data Master Wilayah bersifat read-only untuk pengguna terautentikasi)
        $user = $request->user() ?? $request->user('sanctum') ?? auth('sanctum')->user();

        // 2. Memuat relasi wilayah, ekosistem, dan tutupan lahan proyek
        $proyek->loadMissing([
            'provinsi',
            'kabupatenKota',
            'kecamatan',
            'desaKelurahan',
            'areaTerdampak.ekosistem',
            'indexes.jenisTutupanLahan.index',
        ]);

        $idKabupatenKota = $proyek->id_kabupaten_kota;
        $idProvinsi = $proyek->id_provinsi;
        $namaKabupaten = $proyek->kabupatenKota?->nama_kabupaten_kota;
        $namaProvinsi = $proyek->provinsi?->nama_provinsi;

        // Resolusi dinamis jika id_kabupaten_kota belum terisi pada foreign key
        if (!$idKabupatenKota) {
            $targetText = trim(($proyek->alamat_lengkap ?? '') . ' ' . ($proyek->nama_proyek ?? ''));
            if ($targetText !== '') {
                $matchedKab = \App\Models\KabupatenKota::query()
                    ->where(function ($q) use ($targetText) {
                        $q->whereRaw('? ILIKE \'%\' || nama_kabupaten_kota || \'%\'', [$targetText]);
                        if (stripos($targetText, 'jakarta') !== false) {
                            $q->orWhere('nama_kabupaten_kota', 'like', '%Jakarta%');
                        }
                        if (stripos($targetText, 'bogor') !== false) {
                            $q->orWhere('nama_kabupaten_kota', 'like', '%Bogor%');
                        }
                        if (stripos($targetText, 'bandung') !== false) {
                            $q->orWhere('nama_kabupaten_kota', 'like', '%Bandung%');
                        }
                        if (stripos($targetText, 'badung') !== false || stripos($targetText, 'bali') !== false) {
                            $q->orWhere('nama_kabupaten_kota', 'like', '%Badung%');
                        }
                    })->first();

                if ($matchedKab) {
                    $idKabupatenKota = $matchedKab->id_kabupaten_kota;
                    $namaKabupaten = $matchedKab->nama_kabupaten_kota;
                    $idProvinsi = $matchedKab->id_provinsi;
                }
            }
        }

        // Tentukan format nama wilayah penelitian yang presisi murni dari database project
        $formattedWilayah = $namaKabupaten ?: ($namaProvinsi ?: ($proyek->alamat_lengkap ?: 'Wilayah Penelitian'));

        // Identifikasi Ekosistem Proyek
        $ecosystemName = $proyek->areaTerdampak->pluck('ekosistem.nama_ekosistem')->filter()->unique()->values()->first();
        if (empty($ecosystemName)) {
            $nameLower = strtolower((string) $proyek->nama_proyek);
            if (str_contains($nameLower, 'mangrove')) {
                $ecosystemName = 'Ekosistem Mangrove & Estuari Pesisir';
            } elseif (str_contains($nameLower, 'lamun')) {
                $ecosystemName = 'Padang Lamun & Pesisir';
            } elseif (str_contains($nameLower, 'terumbu')) {
                $ecosystemName = 'Terumbu Karang & Kawasan Konservasi';
            } elseif (str_contains($nameLower, 'hutan')) {
                $ecosystemName = 'Hutan Kota & Kawasan Hijau';
            } else {
                $ecosystemName = 'Ekosistem Pesisir & Laut';
            }
        }

        // Daftar tutupan lahan yang dimiliki proyek
        $landCovers = $proyek->indexes->flatMap->jenisTutupanLahan;
        $landCoverIds = $landCovers->pluck('id_jenis_tutupan_lahan')->filter()->unique()->values()->all();

        // 3. Query 4 Kategori Jasa Ekosistem: ISOLASI WILAYAH DENGAN FALLBACK PROVINSI & KATALOG
        // Memprioritaskan data master tingkat kabupaten/kota, kemudian provinsi, dan fallback katalog umum
        $relations = ['jenisTutupanLahan.index', 'kabupatenKota', 'provinsi'];

        $fetchServices = function ($modelClass) use ($relations, $idKabupatenKota, $idProvinsi) {
            if ($idKabupatenKota) {
                $list = $modelClass::query()->with($relations)->where('id_kabupaten_kota', $idKabupatenKota)->get();
                if ($list->isNotEmpty()) {
                    return $list;
                }
            }
            if ($idProvinsi) {
                $list = $modelClass::query()->with($relations)->where('id_provinsi', $idProvinsi)->get();
                if ($list->isNotEmpty()) {
                    return $list;
                }
            }
            return $modelClass::query()->with($relations)->take(25)->get();
        };

        $provList = $fetchServices(ProvisioningService::class);
        $regList = $fetchServices(RegulatingService::class);
        $supList = $fetchServices(SupportingService::class);
        $culList = $fetchServices(CulturalService::class);

        // Helper status penggunaan
        $formatUsage = function ($service) {
            $index = $service->jenisTutupanLahan?->index;
            if (!$index) {
                return ['used' => false];
            }
            $indexCode = $index->kode_index ?: ('IDX-' . str_pad((string) $index->id_index, 3, '0', STR_PAD_LEFT));
            $indexName = $index->nama_index ?: 'Index ' . $index->id_index;
            return [
                'used' => true,
                'indexCode' => $indexCode,
                'indexName' => $indexName,
                'landCoverName' => $service->jenisTutupanLahan?->nama_tutupan_lahan,
            ];
        };

        // 4. Transformasi ke format SATU TABEL terpadu
        $unifiedData = [];

        foreach ($provList as $item) {
            $unifiedData[] = [
                'id' => 'prov-' . $item->id_provisioning,
                'raw_id' => $item->id_provisioning,
                'category' => 'Provisioning',
                'nama_indonesia' => $item->nama_objek,
                'nama_latin' => $item->nama_latin ?: '-',
                'nama_daerah' => $item->nama_daerah ?: '-',
                'daerah' => $item->kabupatenKota?->nama_kabupaten_kota ?? $namaKabupaten ?? 'Wilayah Penelitian',
                'landCoverId' => (string) ($item->id_jenis_tutupan_lahan ?? ''),
                'usage' => $formatUsage($item),
                'raw' => $item,
            ];
        }

        foreach ($regList as $item) {
            $unifiedData[] = [
                'id' => 'reg-' . $item->id_regulating,
                'raw_id' => $item->id_regulating,
                'category' => 'Regulating',
                'nama_indonesia' => $item->jenis_regulating,
                'nama_latin' => $item->indikator ?: '-',
                'nama_daerah' => $item->satuan ?: '-',
                'daerah' => $item->kabupatenKota?->nama_kabupaten_kota ?? $namaKabupaten ?? 'Wilayah Penelitian',
                'landCoverId' => (string) ($item->id_jenis_tutupan_lahan ?? ''),
                'usage' => $formatUsage($item),
                'raw' => $item,
            ];
        }

        foreach ($supList as $item) {
            $unifiedData[] = [
                'id' => 'sup-' . $item->id_supporting,
                'raw_id' => $item->id_supporting,
                'category' => 'Supporting',
                'nama_indonesia' => $item->fungsi_pendukung,
                'nama_latin' => $item->deskripsi ?: '-',
                'nama_daerah' => '-',
                'daerah' => $item->kabupatenKota?->nama_kabupaten_kota ?? $namaKabupaten ?? 'Wilayah Penelitian',
                'landCoverId' => (string) ($item->id_jenis_tutupan_lahan ?? ''),
                'usage' => $formatUsage($item),
                'raw' => $item,
            ];
        }

        foreach ($culList as $item) {
            $unifiedData[] = [
                'id' => 'cul-' . $item->id_cultural,
                'raw_id' => $item->id_cultural,
                'category' => 'Cultural',
                'nama_indonesia' => $item->nama_aktivitas,
                'nama_latin' => $item->deskripsi ?: '-',
                'nama_daerah' => '-',
                'daerah' => $item->kabupatenKota?->nama_kabupaten_kota ?? $namaKabupaten ?? 'Wilayah Penelitian',
                'landCoverId' => (string) ($item->id_jenis_tutupan_lahan ?? ''),
                'usage' => $formatUsage($item),
                'raw' => $item,
            ];
        }

        return response()->json([
            'project' => [
                'id' => (string) $proyek->id_proyek,
                'id_proyek' => $proyek->id_proyek,
                'code' => $proyek->kode_proyek ?: ('PRJ-' . str_pad((string) $proyek->id_proyek, 3, '0', STR_PAD_LEFT)),
                'name' => $proyek->nama_proyek,
                'wilayah' => $formattedWilayah,
                'region' => $formattedWilayah,
                'location' => $formattedWilayah,
                'kabupaten_kota' => $namaKabupaten ?: 'Wilayah Penelitian',
                'provinsi' => $namaProvinsi ?: '',
                'ecosystem' => $ecosystemName,
                'land_covers' => $landCovers->map(fn($lc) => [
                    'id' => (string) $lc->id_jenis_tutupan_lahan,
                    'name' => $lc->nama_tutupan_lahan,
                    'index_code' => $lc->index?->kode_index,
                    'index_name' => $lc->index?->nama_index,
                ])->values(),
            ],
            'data' => $unifiedData,
            'counts' => [
                'total' => count($unifiedData),
                'provisioning' => $provList->count(),
                'regulating' => $regList->count(),
                'supporting' => $supList->count(),
                'cultural' => $culList->count(),
            ],
        ]);
    }

    /**
     * Menyimpan data master baru yang otomatis diasosiasikan dengan wilayah proyek.
     */
    public function store(Request $request, Proyek $proyek): JsonResponse
    {
        // 1. Validasi Akses Pengguna
        $user = $request->user() ?? $request->user('sanctum') ?? auth('sanctum')->user();
        if ($user) {
            $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
            if ($roleName === Role::PENELITI && (int) $proyek->id_user !== (int) $user->id_user) {
                return response()->json([
                    'message' => 'Anda tidak memiliki hak akses untuk menambahkan data pada proyek ini.',
                ], Response::HTTP_FORBIDDEN);
            }
        }

        $validated = $request->validate([
            'category' => ['required', 'string', 'in:Provisioning,Regulating,Supporting,Cultural'],
            'id_jenis_tutupan_lahan' => ['nullable', 'integer'],
            'nama_indonesia' => ['required', 'string', 'max:255'],
            'nama_latin' => ['nullable', 'string', 'max:255'],
            'nama_daerah' => ['nullable', 'string', 'max:255'],
            'satuan' => ['nullable', 'string', 'max:50'],
            'deskripsi' => ['nullable', 'string'],
            'produktivitas' => ['nullable', 'numeric'],
            'harga_pasar' => ['nullable', 'numeric'],
        ]);

        // Resolusi ID jenis tutupan lahan (default ke tutupan lahan pertama proyek jika tidak dipilih)
        $landCoverId = $validated['id_jenis_tutupan_lahan'] ?? null;
        if (!$landCoverId) {
            $firstLc = $proyek->indexes()->with('jenisTutupanLahan')->first()?->jenisTutupanLahan?->first();
            $landCoverId = $firstLc?->id_jenis_tutupan_lahan;
        }

        // Region otomatis diambil dari proyek aktif
        $baseData = [
            'id_jenis_tutupan_lahan' => $landCoverId,
            'id_provinsi' => $proyek->id_provinsi,
            'id_kabupaten_kota' => $proyek->id_kabupaten_kota,
            'id_kecamatan' => $proyek->id_kecamatan,
            'id_desa_kelurahan' => $proyek->id_desa_kelurahan,
        ];

        $category = $validated['category'];
        $createdItem = null;

        if ($category === 'Provisioning') {
            $created = ProvisioningService::create(array_merge($baseData, [
                'nama_objek' => $validated['nama_indonesia'],
                'nama_latin' => $validated['nama_latin'] ?? null,
                'nama_daerah' => $validated['nama_daerah'] ?? null,
                'produktivitas' => $validated['produktivitas'] ?? 1.0,
                'harga_pasar' => $validated['harga_pasar'] ?? 10000,
                'luas_pemanfaatan' => 1.0,
                'satuan_luas' => 'Hektar',
                'nilai' => ($validated['produktivitas'] ?? 1.0) * ($validated['harga_pasar'] ?? 10000),
                'kategori_tev' => 'DUV',
            ]));
            $createdItem = [
                'id' => 'prov-' . $created->id_provisioning,
                'raw_id' => $created->id_provisioning,
                'category' => 'Provisioning',
                'nama_indonesia' => $created->nama_objek,
                'nama_latin' => $created->nama_latin ?: '-',
                'nama_daerah' => $created->nama_daerah ?: '-',
                'daerah' => $proyek->kabupatenKota?->nama_kabupaten_kota ?? 'Wilayah Proyek',
                'landCoverId' => (string) ($created->id_jenis_tutupan_lahan ?? ''),
                'usage' => ['used' => false],
                'raw' => $created,
            ];
        } elseif ($category === 'Regulating') {
            $created = RegulatingService::create(array_merge($baseData, [
                'jenis_regulating' => $validated['nama_indonesia'],
                'indikator' => $validated['nama_latin'] ?? 'Indikator fungsi pengaturan',
                'satuan' => $validated['satuan'] ?? ($validated['nama_daerah'] ?? 'Hektar'),
                'nilai_indikator' => 1.0,
                'nilai' => 10000000,
                'kategori_tev' => 'IUV',
            ]));
            $createdItem = [
                'id' => 'reg-' . $created->id_regulating,
                'raw_id' => $created->id_regulating,
                'category' => 'Regulating',
                'nama_indonesia' => $created->jenis_regulating,
                'nama_latin' => $created->indikator ?: '-',
                'nama_daerah' => $created->satuan ?: '-',
                'daerah' => $proyek->kabupatenKota?->nama_kabupaten_kota ?? 'Wilayah Proyek',
                'landCoverId' => (string) ($created->id_jenis_tutupan_lahan ?? ''),
                'usage' => ['used' => false],
                'raw' => $created,
            ];
        } elseif ($category === 'Supporting') {
            $created = SupportingService::create(array_merge($baseData, [
                'fungsi_pendukung' => $validated['nama_indonesia'],
                'deskripsi' => $validated['deskripsi'] ?? ($validated['nama_latin'] ?? 'Fungsi pendukung ekosistem'),
                'nilai' => 5000000,
                'kategori_tev' => 'OV',
            ]));
            $createdItem = [
                'id' => 'sup-' . $created->id_supporting,
                'raw_id' => $created->id_supporting,
                'category' => 'Supporting',
                'nama_indonesia' => $created->fungsi_pendukung,
                'nama_latin' => $created->deskripsi ?: '-',
                'nama_daerah' => '-',
                'daerah' => $proyek->kabupatenKota?->nama_kabupaten_kota ?? 'Wilayah Proyek',
                'landCoverId' => (string) ($created->id_jenis_tutupan_lahan ?? ''),
                'usage' => ['used' => false],
                'raw' => $created,
            ];
        } else {
            $created = CulturalService::create(array_merge($baseData, [
                'nama_aktivitas' => $validated['nama_indonesia'],
                'deskripsi' => $validated['deskripsi'] ?? ($validated['nama_latin'] ?? 'Aktivitas nilai budaya dan wisata'),
                'nilai' => 5000000,
                'kategori_tev' => 'DUV',
            ]));
            $createdItem = [
                'id' => 'cul-' . $created->id_cultural,
                'raw_id' => $created->id_cultural,
                'category' => 'Cultural',
                'nama_indonesia' => $created->nama_aktivitas,
                'nama_latin' => $created->deskripsi ?: '-',
                'nama_daerah' => '-',
                'daerah' => $proyek->kabupatenKota?->nama_kabupaten_kota ?? 'Wilayah Proyek',
                'landCoverId' => (string) ($created->id_jenis_tutupan_lahan ?? ''),
                'usage' => ['used' => false],
                'raw' => $created,
            ];
        }

        return response()->json([
            'message' => 'Data master berhasil ditambahkan ke proyek.',
            'data' => $createdItem,
        ], Response::HTTP_CREATED);
    }
}
