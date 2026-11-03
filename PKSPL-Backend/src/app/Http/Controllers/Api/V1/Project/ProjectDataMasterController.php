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
     * Konfigurasi 4 kategori jasa ekosistem.
     */
    private const CATEGORIES = [
        'Provisioning' => [
            'model' => ProvisioningService::class,
            'pk' => 'id_provisioning',
            'prefix' => 'prov',
            'name_col' => 'nama_objek',
            'latin_col' => 'nama_latin',
            'daerah_col' => 'nama_daerah',
        ],
        'Regulating' => [
            'model' => RegulatingService::class,
            'pk' => 'id_regulating',
            'prefix' => 'reg',
            'name_col' => 'jenis_regulating',
            'latin_col' => 'indikator',
            'daerah_col' => 'satuan',
        ],
        'Supporting' => [
            'model' => SupportingService::class,
            'pk' => 'id_supporting',
            'prefix' => 'sup',
            'name_col' => 'fungsi_pendukung',
            'latin_col' => 'deskripsi',
            'daerah_col' => null,
        ],
        'Cultural' => [
            'model' => CulturalService::class,
            'pk' => 'id_cultural',
            'prefix' => 'cul',
            'name_col' => 'nama_aktivitas',
            'latin_col' => 'deskripsi',
            'daerah_col' => null,
        ],
    ];

    /**
     * Mengambil seluruh Data Master 4 kategori yang relevan dengan proyek aktif.
     * Mengembalikan item terpakai (used) proyek dan katalog acuan wilayah (unused).
     */
    public function index(Request $request, Proyek $proyek): JsonResponse
    {
        // 1. Memuat relasi wilayah, ekosistem, dan tutupan lahan proyek
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

        $relations = ['jenisTutupanLahan.index', 'kabupatenKota', 'provinsi'];
        $unifiedData = [];
        $counts = [
            'total' => 0,
            'provisioning' => 0,
            'regulating' => 0,
            'supporting' => 0,
            'cultural' => 0,
        ];

        // 2. Loop setiap kategori untuk mengumpulkan data proyek dan katalog wilayah
        foreach (self::CATEGORIES as $categoryName => $meta) {
            $modelClass = $meta['model'];
            $pkName = $meta['pk'];

            // A. Item yang sudah terikat langsung dengan tutupan lahan proyek ini
            $usedItems = collect();
            if (!empty($landCoverIds)) {
                $usedItems = $modelClass::query()
                    ->with($relations)
                    ->whereIn('id_jenis_tutupan_lahan', $landCoverIds)
                    ->get();
            }

            $usedIds = $usedItems->pluck($pkName)->all();

            // B. Katalog acuan wilayah proyek yang belum digunakan oleh proyek
            // HANYA memuat katalog yang secara spesifik tercatat untuk wilayah (Kabupaten/Kota atau Provinsi) proyek ini
            $unusedItems = collect();
            if ($idKabupatenKota || $idProvinsi) {
                $catalogQuery = $modelClass::query()
                    ->with($relations)
                    ->whereNotIn($pkName, $usedIds);

                if ($idKabupatenKota) {
                    $unusedItems = (clone $catalogQuery)->where('id_kabupaten_kota', $idKabupatenKota)->get();
                }

                if ($unusedItems->isEmpty() && $idProvinsi) {
                    $unusedItems = (clone $catalogQuery)->where('id_provinsi', $idProvinsi)->get();
                }
            }

            // Gabungkan item yang digunakan proyek dan katalog acuan wilayah ini (tanpa mengambil acak dari wilayah lain)
            $allCategoryItems = $usedItems->concat($unusedItems);

            // Update hitungan kategori
            $catKey = strtolower($categoryName);
            $counts[$catKey] = $allCategoryItems->count();

            // Transformasi ke format SATU TABEL terpadu
            foreach ($allCategoryItems as $item) {
                $unifiedData[] = $this->transformItem($categoryName, $item, $proyek, $formattedWilayah);
            }
        }

        $counts['total'] = count($unifiedData);

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
                'indexes' => $proyek->indexes->map(fn($idx) => [
                    'id' => (string) $idx->id_index,
                    'code' => $idx->kode_index ?: ('IDX-' . str_pad((string) $idx->id_index, 3, '0', STR_PAD_LEFT)),
                    'name' => $idx->nama_index,
                ])->values(),
                'land_covers' => $landCovers->map(fn($lc) => [
                    'id' => (string) $lc->id_jenis_tutupan_lahan,
                    'name' => $lc->nama_tutupan_lahan,
                    'index_code' => $lc->index?->kode_index,
                    'index_name' => $lc->index?->nama_index,
                ])->values(),
            ],
            'data' => $unifiedData,
            'counts' => $counts,
        ]);
    }

    /**
     * Menyimpan data master baru yang otomatis diasosiasikan dengan wilayah proyek.
     */
    public function store(Request $request, Proyek $proyek): JsonResponse
    {
        if ($authResponse = $this->authorizeProjectAccess($request, $proyek)) {
            return $authResponse;
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
            'nilai' => ['nullable', 'numeric'],
            'kategori_tev' => ['nullable', 'string', 'max:10'],
        ]);

        $proyek->loadMissing('indexes.jenisTutupanLahan');
        $landCovers = $proyek->indexes->flatMap->jenisTutupanLahan;

        if ($landCovers->isEmpty()) {
            return response()->json([
                'message' => 'Proyek belum memiliki tutupan lahan. Silakan atur indeks dan tutupan lahan terlebih dahulu di Tahap 01/02.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Resolusi ID jenis tutupan lahan
        $landCoverId = $validated['id_jenis_tutupan_lahan'] ?? null;
        if ($landCoverId) {
            $valid = $landCovers->contains('id_jenis_tutupan_lahan', $landCoverId);
            if (!$valid) {
                return response()->json([
                    'message' => 'Tutupan lahan tidak valid atau bukan milik proyek ini.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        } else {
            $landCoverId = $landCovers->first()->id_jenis_tutupan_lahan;
        }

        $baseData = [
            'id_jenis_tutupan_lahan' => $landCoverId,
            'id_provinsi' => $proyek->id_provinsi,
            'id_kabupaten_kota' => $proyek->id_kabupaten_kota,
            'id_kecamatan' => $proyek->id_kecamatan,
            'id_desa_kelurahan' => $proyek->id_desa_kelurahan,
        ];

        $category = $validated['category'];

        // Cek duplikasi sebelum INSERT untuk mencegah data ganda di Data Master
        $namaIndo = trim($validated['nama_indonesia']);
        $namaLatin = isset($validated['nama_latin']) ? trim($validated['nama_latin']) : null;
        $lowerIndo = strtolower($namaIndo);
        $lowerLatin = $namaLatin ? strtolower($namaLatin) : null;

        if ($category === 'Provisioning') {
            $duplicate = ProvisioningService::where('id_jenis_tutupan_lahan', $landCoverId)
                ->where(function ($q) use ($lowerIndo, $lowerLatin) {
                    $q->whereRaw('LOWER(TRIM(nama_objek)) = ?', [$lowerIndo]);
                    if ($lowerLatin) {
                        $q->orWhereRaw('LOWER(TRIM(COALESCE(nama_latin, \'\'))) = ?', [$lowerLatin]);
                    }
                })
                ->first();

            if ($duplicate) {
                $duplicate->loadMissing(['jenisTutupanLahan.index', 'kabupatenKota']);
                $defaultDaerah = $proyek->kabupatenKota?->nama_kabupaten_kota ?? 'Wilayah Proyek';
                return response()->json([
                    'message' => 'Data biota dengan nama tersebut sudah ada di Data Master.',
                    'data' => $this->transformItem($category, $duplicate, $proyek, $defaultDaerah),
                    'already_exists' => true,
                ], Response::HTTP_OK);
            }

            $created = ProvisioningService::create(array_merge($baseData, [
                'nama_objek' => $validated['nama_indonesia'],
                'nama_latin' => $validated['nama_latin'] ?? null,
                'nama_daerah' => $validated['nama_daerah'] ?? null,
                'produktivitas' => $validated['produktivitas'] ?? 1.0,
                'harga_pasar' => $validated['harga_pasar'] ?? 10000,
                'luas_pemanfaatan' => 1.0,
                'satuan_luas' => 'Hektar',
                'nilai' => $validated['nilai'] ?? (($validated['produktivitas'] ?? 1.0) * ($validated['harga_pasar'] ?? 10000)),
                'kategori_tev' => $validated['kategori_tev'] ?? 'DUV',
            ]));
        } elseif ($category === 'Regulating') {
            $duplicate = RegulatingService::where('id_jenis_tutupan_lahan', $landCoverId)
                ->whereRaw('LOWER(TRIM(jenis_regulating)) = ?', [$lowerIndo])
                ->first();

            if ($duplicate) {
                $duplicate->loadMissing(['jenisTutupanLahan.index', 'kabupatenKota']);
                $defaultDaerah = $proyek->kabupatenKota?->nama_kabupaten_kota ?? 'Wilayah Proyek';
                return response()->json([
                    'message' => 'Data jasa pengaturan tersebut sudah ada di Data Master.',
                    'data' => $this->transformItem($category, $duplicate, $proyek, $defaultDaerah),
                    'already_exists' => true,
                ], Response::HTTP_OK);
            }

            $created = RegulatingService::create(array_merge($baseData, [
                'jenis_regulating' => $validated['nama_indonesia'],
                'indikator' => $validated['nama_latin'] ?? 'Indikator fungsi pengaturan',
                'satuan' => $validated['satuan'] ?? ($validated['nama_daerah'] ?? 'Hektar'),
                'nilai_indikator' => 1.0,
                'nilai' => $validated['nilai'] ?? 10000000,
                'kategori_tev' => $validated['kategori_tev'] ?? 'IUV',
            ]));
        } elseif ($category === 'Supporting') {
            $duplicate = SupportingService::where('id_jenis_tutupan_lahan', $landCoverId)
                ->whereRaw('LOWER(TRIM(fungsi_pendukung)) = ?', [$lowerIndo])
                ->first();

            if ($duplicate) {
                $duplicate->loadMissing(['jenisTutupanLahan.index', 'kabupatenKota']);
                $defaultDaerah = $proyek->kabupatenKota?->nama_kabupaten_kota ?? 'Wilayah Proyek';
                return response()->json([
                    'message' => 'Data fungsi pendukung tersebut sudah ada di Data Master.',
                    'data' => $this->transformItem($category, $duplicate, $proyek, $defaultDaerah),
                    'already_exists' => true,
                ], Response::HTTP_OK);
            }

            $created = SupportingService::create(array_merge($baseData, [
                'fungsi_pendukung' => $validated['nama_indonesia'],
                'deskripsi' => $validated['deskripsi'] ?? ($validated['nama_latin'] ?? 'Fungsi pendukung ekosistem'),
                'nilai' => $validated['nilai'] ?? 5000000,
                'kategori_tev' => $validated['kategori_tev'] ?? 'OV',
            ]));
        } else {
            $duplicate = CulturalService::where('id_jenis_tutupan_lahan', $landCoverId)
                ->whereRaw('LOWER(TRIM(nama_aktivitas)) = ?', [$lowerIndo])
                ->first();

            if ($duplicate) {
                $duplicate->loadMissing(['jenisTutupanLahan.index', 'kabupatenKota']);
                $defaultDaerah = $proyek->kabupatenKota?->nama_kabupaten_kota ?? 'Wilayah Proyek';
                return response()->json([
                    'message' => 'Data aktivitas budaya/wisata tersebut sudah ada di Data Master.',
                    'data' => $this->transformItem($category, $duplicate, $proyek, $defaultDaerah),
                    'already_exists' => true,
                ], Response::HTTP_OK);
            }

            $created = CulturalService::create(array_merge($baseData, [
                'nama_aktivitas' => $validated['nama_indonesia'],
                'deskripsi' => $validated['deskripsi'] ?? ($validated['nama_latin'] ?? 'Aktivitas nilai budaya dan wisata'),
                'jumlah_pengunjung' => 1000,
                'biaya_perjalanan' => 100000,
                'frekuensi' => 1,
                'referensi' => 'Survei Valuasi Jasa Wisata',
                'nilai' => $validated['nilai'] ?? 5000000,
                'kategori_tev' => $validated['kategori_tev'] ?? 'DUV',
            ]));
        }

        $created->loadMissing(['jenisTutupanLahan.index', 'kabupatenKota']);
        $defaultDaerah = $proyek->kabupatenKota?->nama_kabupaten_kota ?? 'Wilayah Proyek';
        $createdItem = $this->transformItem($category, $created, $proyek, $defaultDaerah);

        return response()->json([
            'message' => 'Data master berhasil ditambahkan ke proyek.',
            'data' => $createdItem,
        ], Response::HTTP_CREATED);
    }

    /**
     * Memperbarui data master lokal proyek.
     */
    public function update(Request $request, Proyek $proyek, string $category, int $id): JsonResponse
    {
        if ($authResponse = $this->authorizeProjectAccess($request, $proyek)) {
            return $authResponse;
        }

        $cat = ucfirst(strtolower($category));
        if (!isset(self::CATEGORIES[$cat])) {
            return response()->json(['message' => "Kategori '{$category}' tidak valid."], Response::HTTP_BAD_REQUEST);
        }

        $meta = self::CATEGORIES[$cat];
        $model = $meta['model'];
        $item = $model::findOrFail($id);

        // Validasi ownership terhadap proyek aktif (mencegah IDOR dan mutasi katalog global)
        $lc = $item->jenisTutupanLahan;
        if (!$lc || !$lc->index || (int) $lc->index->id_proyek !== (int) $proyek->id_proyek) {
            return response()->json([
                'message' => 'Item ini merupakan katalog acuan atau bukan milik proyek ini sehingga tidak dapat diubah langsung. Silakan tautkan terlebih dahulu ke tutupan lahan proyek Anda.',
            ], Response::HTTP_FORBIDDEN);
        }

        $validated = $request->validate([
            'nama_indonesia' => ['required', 'string', 'max:255'],
            'nama_latin' => ['nullable', 'string', 'max:255'],
            'nama_daerah' => ['nullable', 'string', 'max:255'],
            'satuan' => ['nullable', 'string', 'max:50'],
            'deskripsi' => ['nullable', 'string'],
            'produktivitas' => ['nullable', 'numeric'],
            'harga_pasar' => ['nullable', 'numeric'],
            'nilai' => ['nullable', 'numeric'],
            'id_jenis_tutupan_lahan' => ['nullable', 'integer'],
            'kategori_tev' => ['nullable', 'string', 'max:10'],
        ]);

        // Jika id_jenis_tutupan_lahan diubah, pastikan milik proyek ini
        if (!empty($validated['id_jenis_tutupan_lahan'])) {
            $valid = $proyek->indexes()->whereHas('jenisTutupanLahan', function ($q) use ($validated) {
                $q->where('id_jenis_tutupan_lahan', $validated['id_jenis_tutupan_lahan']);
            })->exists();

            if (!$valid) {
                return response()->json([
                    'message' => 'Tutupan lahan target bukan milik proyek ini.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        if ($cat === 'Provisioning') {
            $item->update([
                'nama_objek' => $validated['nama_indonesia'],
                'nama_latin' => $validated['nama_latin'] ?? $item->nama_latin,
                'nama_daerah' => $validated['nama_daerah'] ?? $item->nama_daerah,
                'id_jenis_tutupan_lahan' => array_key_exists('id_jenis_tutupan_lahan', $validated) ? $validated['id_jenis_tutupan_lahan'] : $item->id_jenis_tutupan_lahan,
                'produktivitas' => $validated['produktivitas'] ?? $item->produktivitas,
                'harga_pasar' => $validated['harga_pasar'] ?? $item->harga_pasar,
                'nilai' => $validated['nilai'] ?? $item->nilai,
                'kategori_tev' => $validated['kategori_tev'] ?? $item->kategori_tev,
            ]);
        } elseif ($cat === 'Regulating') {
            $item->update([
                'jenis_regulating' => $validated['nama_indonesia'],
                'indikator' => $validated['nama_latin'] ?? $item->indikator,
                'satuan' => $validated['satuan'] ?? ($validated['nama_daerah'] ?? $item->satuan),
                'id_jenis_tutupan_lahan' => array_key_exists('id_jenis_tutupan_lahan', $validated) ? $validated['id_jenis_tutupan_lahan'] : $item->id_jenis_tutupan_lahan,
                'nilai' => $validated['nilai'] ?? $item->nilai,
                'kategori_tev' => $validated['kategori_tev'] ?? $item->kategori_tev,
            ]);
        } elseif ($cat === 'Supporting') {
            $item->update([
                'fungsi_pendukung' => $validated['nama_indonesia'],
                'deskripsi' => $validated['deskripsi'] ?? ($validated['nama_latin'] ?? $item->deskripsi),
                'id_jenis_tutupan_lahan' => array_key_exists('id_jenis_tutupan_lahan', $validated) ? $validated['id_jenis_tutupan_lahan'] : $item->id_jenis_tutupan_lahan,
                'nilai' => $validated['nilai'] ?? $item->nilai,
                'kategori_tev' => $validated['kategori_tev'] ?? $item->kategori_tev,
            ]);
        } else {
            $item->update([
                'nama_aktivitas' => $validated['nama_indonesia'],
                'deskripsi' => $validated['deskripsi'] ?? ($validated['nama_latin'] ?? $item->deskripsi),
                'id_jenis_tutupan_lahan' => array_key_exists('id_jenis_tutupan_lahan', $validated) ? $validated['id_jenis_tutupan_lahan'] : $item->id_jenis_tutupan_lahan,
                'nilai' => $validated['nilai'] ?? $item->nilai,
                'kategori_tev' => $validated['kategori_tev'] ?? $item->kategori_tev,
            ]);
        }

        $item->loadMissing(['jenisTutupanLahan.index', 'kabupatenKota']);
        $defaultDaerah = $proyek->kabupatenKota?->nama_kabupaten_kota ?? 'Wilayah Proyek';
        $unifiedItem = $this->transformItem($cat, $item, $proyek, $defaultDaerah);

        return response()->json([
            'message' => 'Data master berhasil diperbarui.',
            'data' => $unifiedItem,
        ]);
    }

    /**
     * Menghapus data master lokal proyek.
     */
    public function destroy(Request $request, Proyek $proyek, string $category, int $id): JsonResponse
    {
        if ($authResponse = $this->authorizeProjectAccess($request, $proyek)) {
            return $authResponse;
        }

        $cat = ucfirst(strtolower($category));
        if (!isset(self::CATEGORIES[$cat])) {
            return response()->json(['message' => "Kategori '{$category}' tidak valid."], Response::HTTP_BAD_REQUEST);
        }

        $meta = self::CATEGORIES[$cat];
        $model = $meta['model'];
        $item = $model::findOrFail($id);

        // Validasi kepemilikan terhadap proyek (hanya boleh menghapus data milik proyek sendiri)
        $lc = $item->jenisTutupanLahan;
        if (!$lc || !$lc->index || (int) $lc->index->id_proyek !== (int) $proyek->id_proyek) {
            return response()->json([
                'message' => 'Item ini merupakan katalog acuan atau bukan milik proyek ini sehingga tidak dapat dihapus.',
            ], Response::HTTP_FORBIDDEN);
        }

        $item->delete();

        return response()->json([
            'message' => 'Data master berhasil dihapus dari proyek.',
        ]);
    }

    /**
     * Menautkan item data master ke tutupan lahan tertentu milik proyek.
     * Menggunakan replikasi aman agar tidak merusak data katalog asal.
     */
    public function linkToLandCover(Request $request, Proyek $proyek): JsonResponse
    {
        if ($authResponse = $this->authorizeProjectAccess($request, $proyek)) {
            return $authResponse;
        }

        $validated = $request->validate([
            'category' => ['required', 'string', 'in:Provisioning,Regulating,Supporting,Cultural'],
            'id' => ['required', 'integer'],
            'id_jenis_tutupan_lahan' => ['required', 'integer'],
        ]);

        $cat = ucfirst(strtolower($validated['category']));
        $id = $validated['id'];
        $lcId = $validated['id_jenis_tutupan_lahan'];

        // Verifikasi bahwa tutupan lahan target merupakan milik proyek ini
        $validLc = $proyek->indexes()->whereHas('jenisTutupanLahan', function ($q) use ($lcId) {
            $q->where('id_jenis_tutupan_lahan', $lcId);
        })->exists();

        if (!$validLc) {
            return response()->json([
                'message' => 'Tutupan lahan tidak valid atau bukan milik proyek ini.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $model = self::CATEGORIES[$cat]['model'];
        $item = $model::findOrFail($id);

        // Jika item sudah terikat dengan tutupan lahan target, tidak perlu duplikasi
        if ((int) $item->id_jenis_tutupan_lahan !== (int) $lcId) {
            $newItem = $item->replicate();
            $newItem->id_jenis_tutupan_lahan = $lcId;
            $newItem->id_provinsi = $proyek->id_provinsi ?: $item->id_provinsi;
            $newItem->id_kabupaten_kota = $proyek->id_kabupaten_kota ?: $item->id_kabupaten_kota;
            $newItem->id_kecamatan = $proyek->id_kecamatan ?: $item->id_kecamatan;
            $newItem->id_desa_kelurahan = $proyek->id_desa_kelurahan ?: $item->id_desa_kelurahan;
            $newItem->save();
            $item = $newItem;
        }

        $item->loadMissing(['jenisTutupanLahan.index', 'kabupatenKota']);
        $defaultDaerah = $proyek->kabupatenKota?->nama_kabupaten_kota ?? 'Wilayah Proyek';

        return response()->json([
            'message' => 'Data master berhasil ditautkan ke tutupan lahan.',
            'data' => $this->transformItem($cat, $item, $proyek, $defaultDaerah),
        ]);
    }

    /**
     * Menerapkan template master acuan ekosistem standar ke seluruh tutupan lahan proyek.
     */
    public function applyTemplate(Request $request, Proyek $proyek): JsonResponse
    {
        if ($authResponse = $this->authorizeProjectAccess($request, $proyek)) {
            return $authResponse;
        }

        $proyek->loadMissing('indexes.jenisTutupanLahan');
        $landCovers = $proyek->indexes->flatMap->jenisTutupanLahan;

        if ($landCovers->isEmpty()) {
            return response()->json([
                'message' => 'Proyek belum memiliki tutupan lahan. Silakan atur indeks dan tutupan lahan terlebih dahulu di Tahap 01/02.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $region = [
            'id_provinsi' => $proyek->id_provinsi,
            'id_kabupaten_kota' => $proyek->id_kabupaten_kota,
            'id_kecamatan' => $proyek->id_kecamatan,
            'id_desa_kelurahan' => $proyek->id_desa_kelurahan,
        ];

        $insertedCount = 0;

        foreach ($landCovers as $landCover) {
            $lcNameLower = strtolower((string) $landCover->nama_tutupan_lahan);
            $isMangrove = str_contains($lcNameLower, 'mangrove') || str_contains($lcNameLower, 'bakau');
            $isLamun = str_contains($lcNameLower, 'lamun') || str_contains($lcNameLower, 'seagrass');
            $isKarang = str_contains($lcNameLower, 'karang') || str_contains($lcNameLower, 'coral');

            $latinName = $isMangrove ? 'Rhizophora apiculata' : ($isLamun ? 'Enhalus acoroides' : ($isKarang ? 'Acropora sp.' : 'Biota Pesisir'));
            $localName = $isMangrove ? 'Bakau Minyak' : ($isLamun ? 'Lamun Tunjung' : ($isKarang ? 'Karang Cabang' : 'Lokal'));
            $luas = max((float) ($landCover->luas ?? 1), 1);
            $satuanLuas = $landCover->satuan_luas ?: 'Hektar';

            // 1. Provisioning Services (2 items per land cover)
            ProvisioningService::firstOrCreate(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'nama_objek' => 'Hasil perikanan dan biota tangkapan'],
                array_merge([
                    'nama_latin' => $latinName,
                    'nama_daerah' => $localName,
                    'produktivitas' => 1.25,
                    'harga_pasar' => 35000,
                    'luas_pemanfaatan' => $luas,
                    'satuan_luas' => $satuanLuas,
                    'referensi' => 'Katalog Master Acuan Wilayah PKSPL IPB',
                    'nilai' => 1.25 * 35000 * $luas,
                    'kategori_tev' => 'DUV',
                ], $region)
            );

            ProvisioningService::firstOrCreate(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'nama_objek' => 'Bahan pangan dan komoditas pesisir'],
                array_merge([
                    'nama_latin' => $latinName,
                    'nama_daerah' => $localName,
                    'produktivitas' => 0.75,
                    'harga_pasar' => 50000,
                    'luas_pemanfaatan' => $luas,
                    'satuan_luas' => $satuanLuas,
                    'referensi' => 'Katalog Master Acuan Wilayah PKSPL IPB',
                    'nilai' => 0.75 * 50000 * $luas,
                    'kategori_tev' => 'DUV',
                ], $region)
            );

            // 2. Regulating Services (2 items)
            RegulatingService::firstOrCreate(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'jenis_regulating' => 'Perlindungan pantai dan peredam gelombang'],
                array_merge([
                    'indikator' => 'Luas tutupan vegetasi',
                    'satuan' => $satuanLuas,
                    'nilai_indikator' => $luas,
                    'referensi' => 'Kajian Biofisik & Valuasi PKSPL IPB',
                    'nilai' => 150000000,
                    'kategori_tev' => 'IUV',
                ], $region)
            );

            RegulatingService::firstOrCreate(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'jenis_regulating' => 'Penyimpanan karbon dan serapan emisi (Blue Carbon)'],
                array_merge([
                    'indikator' => 'Estimasi stok karbon biru',
                    'satuan' => 'Ton CO2e',
                    'nilai_indikator' => 12.5,
                    'referensi' => 'Rujukan Karbon Biru Nasional',
                    'nilai' => 95000000,
                    'kategori_tev' => 'IUV',
                ], $region)
            );

            // 3. Supporting Services (2 items)
            SupportingService::firstOrCreate(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'fungsi_pendukung' => 'Habitat keanekaragaman hayati dan daur hara'],
                array_merge([
                    'deskripsi' => 'Menopang biodiversitas biota pesisir dan siklus biokimia perairan.',
                    'referensi' => 'Data Ekologi Pesisir PKSPL IPB',
                    'nilai' => 75000000,
                    'kategori_tev' => 'OV',
                ], $region)
            );

            SupportingService::firstOrCreate(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'fungsi_pendukung' => 'Nursery ground & spawning ground biota'],
                array_merge([
                    'deskripsi' => 'Daerah pemijahan dan pembesaran anakan ikan serta kepiting bakau.',
                    'referensi' => 'Data Ekologi Pesisir PKSPL IPB',
                    'nilai' => 62500000,
                    'kategori_tev' => 'OV',
                ], $region)
            );

            // 4. Cultural Services (2 items)
            CulturalService::firstOrCreate(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'nama_aktivitas' => 'Ekowisata edukasi dan konservasi pesisir'],
                array_merge([
                    'deskripsi' => 'Kegiatan wisata edukasi, pengamatan burung air, dan penelitian lapangan.',
                    'jumlah_pengunjung' => 1200,
                    'biaya_perjalanan' => 150000,
                    'frekuensi' => 1,
                    'referensi' => 'Survei Valuasi Jasa Wisata',
                    'nilai' => 180000000,
                    'kategori_tev' => 'DUV',
                ], $region)
            );

            CulturalService::firstOrCreate(
                ['id_jenis_tutupan_lahan' => $landCover->id_jenis_tutupan_lahan, 'nama_aktivitas' => 'Rekreasi bahari dan fotografi alam'],
                array_merge([
                    'deskripsi' => 'Daya tarik estetika lanskap pesisir dan fotografi.',
                    'jumlah_pengunjung' => 800,
                    'biaya_perjalanan' => 100000,
                    'frekuensi' => 1,
                    'referensi' => 'Survei Valuasi Jasa Wisata',
                    'nilai' => 80000000,
                    'kategori_tev' => 'DUV',
                ], $region)
            );

            $insertedCount += 8;
        }

        return response()->json([
            'message' => "Template master berhasil diterapkan untuk {$landCovers->count()} tutupan lahan ({$insertedCount} item layanan terdaftar).",
        ]);
    }

    /**
     * Transformasi item model jasa ekosistem ke format SATU TABEL terpadu.
     */
    private function transformItem(string $category, $item, Proyek $proyek, string $defaultDaerah): array
    {
        $meta = self::CATEGORIES[$category];
        $pkName = $meta['pk'];
        $rawId = $item->{$pkName};

        $namaIndonesia = $item->{$meta['name_col']} ?? '-';
        $namaLatin = $meta['latin_col'] ? ($item->{$meta['latin_col']} ?: '-') : '-';
        $namaDaerah = $meta['daerah_col'] ? ($item->{$meta['daerah_col']} ?: '-') : '-';

        $lc = $item->jenisTutupanLahan;
        $lcName = $lc?->nama_tutupan_lahan;

        // Klasifikasi tipe ekosistem berdasarkan tutupan lahan atau karakteristik biota
        $tipeEkosistem = 'Ekosistem Pesisir';
        $analysisText = strtolower((string) ($lcName . ' ' . $namaIndonesia . ' ' . $namaLatin . ' ' . ($item->deskripsi ?? '')));
        if (str_contains($analysisText, 'mangrove') || str_contains($analysisText, 'bakau')) {
            $tipeEkosistem = 'Mangrove';
        } elseif (str_contains($analysisText, 'lamun') || str_contains($analysisText, 'seagrass')) {
            $tipeEkosistem = 'Padang Lamun';
        } elseif (str_contains($analysisText, 'karang') || str_contains($analysisText, 'coral')) {
            $tipeEkosistem = 'Terumbu Karang';
        } elseif (str_contains($analysisText, 'estuari') || str_contains($analysisText, 'muara')) {
            $tipeEkosistem = 'Estuari Pesisir';
        } elseif ($lcName) {
            $tipeEkosistem = $lcName;
        }

        // Klasifikasi biota_type (flora vs fauna) untuk kategori Provisioning
        $biotaType = null;
        if ($category === 'Provisioning') {
            $biotaType = $this->classifyBiotaType($namaIndonesia, $namaLatin, $namaDaerah);
        }

        return [
            'id' => $meta['prefix'] . '-' . $rawId,
            'raw_id' => $rawId,
            'category' => $category,
            'biota_type' => $biotaType,
            'nama_indonesia' => $namaIndonesia,
            'nama_latin' => $namaLatin,
            'nama_daerah' => $namaDaerah,
            'daerah' => $defaultDaerah ?: ($item->kabupatenKota?->nama_kabupaten_kota ?? 'Wilayah Penelitian'),
            'landCoverId' => (string) ($item->id_jenis_tutupan_lahan ?? ''),
            'landCoverName' => $lcName,
            'tipe_ekosistem' => $tipeEkosistem,
            'usage' => $this->formatUsage($item, $proyek),
            'raw' => $item,
        ];
    }

    /**
     * Mengklasifikasikan apakah suatu item Provisioning tergolong Flora atau Fauna.
     */
    private function classifyBiotaType(string $namaIndo, string $namaLatin, string $namaDaerah): string
    {
        $text = strtolower($namaIndo . ' ' . $namaLatin . ' ' . $namaDaerah);

        $faunaKeywords = [
            'ikan', 'tongkol', 'bandeng', 'kepiting', 'udang', 'cumi', 'kerang', 'rajungan',
            'penyu', 'dugong', 'teripang', 'burung', 'elang', 'walet', 'babi', 'celeng',
            'kadal', 'bunglon', 'perling', 'madu', 'coracina', 'haliastur', 'scylla', 'chanos',
            'euthynnus', 'chelonia', 'holothuria', 'sus scrofa', 'bronchocela', 'carlia',
            'fauna', 'satwa', 'hewan', 'reptil', 'aves', 'mamalia', 'amfibi', 'pisces'
        ];

        foreach ($faunaKeywords as $kw) {
            if (str_contains($text, $kw)) {
                return 'fauna';
            }
        }

        return 'flora';
    }

    /**
     * Helper status penggunaan: HANYA index dari proyek aktif yang dianggap 'used = true'.
     */
    private function formatUsage($service, Proyek $proyek): array
    {
        $index = $service->jenisTutupanLahan?->index;
        if (!$index || (int) $index->id_proyek !== (int) $proyek->id_proyek) {
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
    }

    /**
     * Helper validasi kepemilikan proyek bagi peneliti (Mencegah IDOR).
     */
    private function authorizeProjectAccess(Request $request, Proyek $proyek): ?JsonResponse
    {
        $user = $request->user() ?? $request->user('sanctum') ?? auth('sanctum')->user();
        if ($user) {
            $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
            if ($roleName === Role::PENELITI && (int) $proyek->id_user !== (int) $user->id_user) {
                return response()->json([
                    'message' => 'Anda tidak memiliki hak akses untuk proyek ini.',
                ], Response::HTTP_FORBIDDEN);
            }
        }

        return null;
    }
}
