<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\CulturalService;
use App\Models\KabupatenKota;
use App\Models\JenisTutupanLahan;
use App\Models\Provinsi;
use App\Models\ProvisioningService;
use App\Models\Proyek;
use App\Models\RegulatingService;
use App\Models\Role;
use App\Models\SupportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Controller untuk mengelola Master Data Global (Super Admin)
 * dan akses tersentralisasi dengan dukungan filter multi-wilayah dan CRUD.
 */
class AdminMasterDataController extends Controller
{
    /**
     * Menampilkan daftar data master global dengan filter multi-daerah,
     * kategori jasa, pencarian, dan opsi filter dinamis.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user() ?? $request->user('sanctum') ?? auth('sanctum')->user();

        // 1. Jika request berasal dari konteks project spesifik (misal dari Peneliti atau filter project)
        if ($request->filled('project_id') || $request->filled('proyek_id')) {
            $projectId = $request->input('project_id') ?? $request->input('proyek_id');
            $proyek = Proyek::find($projectId);

            if (!$proyek) {
                return response()->json(['message' => 'Proyek tidak ditemukan.'], Response::HTTP_NOT_FOUND);
            }

            // IDOR Protection: Peneliti hanya boleh akses proyek miliknya
            if ($user) {
                $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
                if ($roleName === Role::PENELITI && (int) $proyek->id_user !== (int) $user->id_user) {
                    return response()->json([
                        'message' => 'Anda tidak memiliki hak akses untuk data proyek ini.',
                    ], Response::HTTP_FORBIDDEN);
                }
            }

            // Delegasi ke controller project master data jika perlu
            $projectController = app(\App\Http\Controllers\Api\V1\Project\ProjectDataMasterController::class);
            return $projectController->index($request, $proyek);
        }

        // 2. Query Global Master Data untuk Admin
        $provinsiId = $request->input('provinsi_id') ?? $request->input('id_provinsi');
        $kabupatenKotaId = $request->input('kabupaten_kota_id') ?? $request->input('id_kabupaten_kota');
        $categoryFilter = $request->input('category');
        $searchTerm = $request->input('search');

        $relations = ['jenisTutupanLahan.index', 'kabupatenKota', 'provinsi'];

        // Helper filter query wilayah & search
        $applyFilters = function ($query, string $category) use ($provinsiId, $kabupatenKotaId, $searchTerm) {
            if (!empty($provinsiId)) {
                $query->where('id_provinsi', $provinsiId);
            }
            if (!empty($kabupatenKotaId)) {
                $query->where('id_kabupaten_kota', $kabupatenKotaId);
            }

            if (!empty($searchTerm)) {
                $term = strtolower(trim((string) $searchTerm));
                $query->where(function ($q) use ($term, $category) {
                    if ($category === 'Provisioning') {
                        $q->whereRaw('LOWER(nama_objek) LIKE ?', ["%{$term}%"])
                          ->orWhereRaw('LOWER(nama_latin) LIKE ?', ["%{$term}%"])
                          ->orWhereRaw('LOWER(nama_daerah) LIKE ?', ["%{$term}%"]);
                    } elseif ($category === 'Regulating') {
                        $q->whereRaw('LOWER(jenis_regulating) LIKE ?', ["%{$term}%"])
                          ->orWhereRaw('LOWER(indikator) LIKE ?', ["%{$term}%"])
                          ->orWhereRaw('LOWER(satuan) LIKE ?', ["%{$term}%"]);
                    } elseif ($category === 'Supporting') {
                        $q->whereRaw('LOWER(fungsi_pendukung) LIKE ?', ["%{$term}%"])
                          ->orWhereRaw('LOWER(deskripsi) LIKE ?', ["%{$term}%"]);
                    } elseif ($category === 'Cultural') {
                        $q->whereRaw('LOWER(nama_aktivitas) LIKE ?', ["%{$term}%"])
                          ->orWhereRaw('LOWER(referensi) LIKE ?', ["%{$term}%"]);
                    }

                    // Pencarian nama kabupaten/kota atau provinsi
                    $q->orWhereHas('kabupatenKota', function ($kq) use ($term) {
                        $kq->whereRaw('LOWER(nama_kabupaten_kota) LIKE ?', ["%{$term}%"]);
                    })->orWhereHas('provinsi', function ($pq) use ($term) {
                        $pq->whereRaw('LOWER(nama_provinsi) LIKE ?', ["%{$term}%"]);
                    });
                });
            }
        };

        // Query per category
        $provList = collect();
        $regList = collect();
        $supList = collect();
        $culList = collect();

        if (empty($categoryFilter) || strtolower($categoryFilter) === 'all' || strtolower($categoryFilter) === 'provisioning') {
            $q = ProvisioningService::query()->with($relations);
            $applyFilters($q, 'Provisioning');
            $provList = $q->latest('id_provisioning')->get();
        }

        if (empty($categoryFilter) || strtolower($categoryFilter) === 'all' || strtolower($categoryFilter) === 'regulating') {
            $q = RegulatingService::query()->with($relations);
            $applyFilters($q, 'Regulating');
            $regList = $q->latest('id_regulating')->get();
        }

        if (empty($categoryFilter) || strtolower($categoryFilter) === 'all' || strtolower($categoryFilter) === 'supporting') {
            $q = SupportingService::query()->with($relations);
            $applyFilters($q, 'Supporting');
            $supList = $q->latest('id_supporting')->get();
        }

        if (empty($categoryFilter) || strtolower($categoryFilter) === 'all' || strtolower($categoryFilter) === 'cultural') {
            $q = CulturalService::query()->with($relations);
            $applyFilters($q, 'Cultural');
            $culList = $q->latest('id_cultural')->get();
        }

        // Helper usage
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

        // Unified list
        $unified = [];

        foreach ($provList as $item) {
            $unified[] = [
                'id' => 'prov-' . $item->id_provisioning,
                'raw_id' => $item->id_provisioning,
                'category' => 'Provisioning',
                'nama_indonesia' => $item->nama_objek,
                'nama_latin' => $item->nama_latin ?: '-',
                'nama_daerah' => $item->nama_daerah ?: '-',
                'id_provinsi' => $item->id_provinsi,
                'provinsi_nama' => $item->provinsi?->nama_provinsi ?: '-',
                'id_kabupaten_kota' => $item->id_kabupaten_kota,
                'kabupaten_kota_nama' => $item->kabupatenKota?->nama_kabupaten_kota ?: '-',
                'daerah' => $item->kabupatenKota?->nama_kabupaten_kota ?? ($item->provinsi?->nama_provinsi ?? 'Semua Daerah'),
                'landCoverId' => (string) ($item->id_jenis_tutupan_lahan ?? ''),
                'landCoverName' => $item->jenisTutupanLahan?->nama_tutupan_lahan ?? '-',
                'kategori_tev' => $item->kategori_tev ?? 'DUV',
                'nilai' => $item->nilai,
                'usage' => $formatUsage($item),
                'raw' => $item,
            ];
        }

        foreach ($regList as $item) {
            $unified[] = [
                'id' => 'reg-' . $item->id_regulating,
                'raw_id' => $item->id_regulating,
                'category' => 'Regulating',
                'nama_indonesia' => $item->jenis_regulating,
                'nama_latin' => $item->indikator ?: '-',
                'nama_daerah' => $item->satuan ?: '-',
                'id_provinsi' => $item->id_provinsi,
                'provinsi_nama' => $item->provinsi?->nama_provinsi ?: '-',
                'id_kabupaten_kota' => $item->id_kabupaten_kota,
                'kabupaten_kota_nama' => $item->kabupatenKota?->nama_kabupaten_kota ?: '-',
                'daerah' => $item->kabupatenKota?->nama_kabupaten_kota ?? ($item->provinsi?->nama_provinsi ?? 'Semua Daerah'),
                'landCoverId' => (string) ($item->id_jenis_tutupan_lahan ?? ''),
                'landCoverName' => $item->jenisTutupanLahan?->nama_tutupan_lahan ?? '-',
                'kategori_tev' => $item->kategori_tev ?? 'IUV',
                'nilai' => $item->nilai,
                'usage' => $formatUsage($item),
                'raw' => $item,
            ];
        }

        foreach ($supList as $item) {
            $unified[] = [
                'id' => 'sup-' . $item->id_supporting,
                'raw_id' => $item->id_supporting,
                'category' => 'Supporting',
                'nama_indonesia' => $item->fungsi_pendukung,
                'nama_latin' => $item->deskripsi ?: '-',
                'nama_daerah' => '-',
                'id_provinsi' => $item->id_provinsi,
                'provinsi_nama' => $item->provinsi?->nama_provinsi ?: '-',
                'id_kabupaten_kota' => $item->id_kabupaten_kota,
                'kabupaten_kota_nama' => $item->kabupatenKota?->nama_kabupaten_kota ?: '-',
                'daerah' => $item->kabupatenKota?->nama_kabupaten_kota ?? ($item->provinsi?->nama_provinsi ?? 'Semua Daerah'),
                'landCoverId' => (string) ($item->id_jenis_tutupan_lahan ?? ''),
                'landCoverName' => $item->jenisTutupanLahan?->nama_tutupan_lahan ?? '-',
                'kategori_tev' => $item->kategori_tev ?? 'OV',
                'nilai' => $item->nilai,
                'usage' => $formatUsage($item),
                'raw' => $item,
            ];
        }

        foreach ($culList as $item) {
            $unified[] = [
                'id' => 'cul-' . $item->id_cultural,
                'raw_id' => $item->id_cultural,
                'category' => 'Cultural',
                'nama_indonesia' => $item->nama_aktivitas,
                'nama_latin' => $item->referensi ?: '-',
                'nama_daerah' => '-',
                'id_provinsi' => $item->id_provinsi,
                'provinsi_nama' => $item->provinsi?->nama_provinsi ?: '-',
                'id_kabupaten_kota' => $item->id_kabupaten_kota,
                'kabupaten_kota_nama' => $item->kabupatenKota?->nama_kabupaten_kota ?: '-',
                'daerah' => $item->kabupatenKota?->nama_kabupaten_kota ?? ($item->provinsi?->nama_provinsi ?? 'Semua Daerah'),
                'landCoverId' => (string) ($item->id_jenis_tutupan_lahan ?? ''),
                'landCoverName' => $item->jenisTutupanLahan?->nama_tutupan_lahan ?? '-',
                'kategori_tev' => $item->kategori_tev ?? 'DUV',
                'nilai' => $item->nilai,
                'usage' => $formatUsage($item),
                'raw' => $item,
            ];
        }

        // Global Statistics
        $totalProvCount = ProvisioningService::count();
        $totalRegCount = RegulatingService::count();
        $totalSupCount = SupportingService::count();
        $totalCulCount = CulturalService::count();
        $grandTotal = $totalProvCount + $totalRegCount + $totalSupCount + $totalCulCount;

        $distinctKabCount = collect([
            ProvisioningService::distinct('id_kabupaten_kota')->pluck('id_kabupaten_kota'),
            RegulatingService::distinct('id_kabupaten_kota')->pluck('id_kabupaten_kota'),
            SupportingService::distinct('id_kabupaten_kota')->pluck('id_kabupaten_kota'),
            CulturalService::distinct('id_kabupaten_kota')->pluck('id_kabupaten_kota'),
        ])->flatten()->filter()->unique()->count();

        $distinctProvCount = collect([
            ProvisioningService::distinct('id_provinsi')->pluck('id_provinsi'),
            RegulatingService::distinct('id_provinsi')->pluck('id_provinsi'),
            SupportingService::distinct('id_provinsi')->pluck('id_provinsi'),
            CulturalService::distinct('id_provinsi')->pluck('id_provinsi'),
        ])->flatten()->filter()->unique()->count();

        // Pagination
        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 20);
        $totalFiltered = count($unified);

        $items = $perPage > 0
            ? array_slice($unified, ($page - 1) * $perPage, $perPage)
            : $unified;

        // Dynamic Options for Frontend Dropdowns
        $provincesList = Provinsi::orderBy('nama_provinsi')->get(['id_provinsi', 'nama_provinsi'])->map(fn($p) => [
            'id' => $p->id_provinsi,
            'nama' => $p->nama_provinsi,
        ]);

        $regenciesList = KabupatenKota::orderBy('nama_kabupaten_kota')->get(['id_kabupaten_kota', 'id_provinsi', 'nama_kabupaten_kota'])->map(fn($k) => [
            'id' => $k->id_kabupaten_kota,
            'id_provinsi' => $k->id_provinsi,
            'nama' => $k->nama_kabupaten_kota,
        ]);

        $landCoversList = JenisTutupanLahan::orderBy('nama_tutupan_lahan')->get(['id_jenis_tutupan_lahan', 'nama_tutupan_lahan'])->map(fn($l) => [
            'id' => $l->id_jenis_tutupan_lahan,
            'nama' => $l->nama_tutupan_lahan,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $items,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $totalFiltered,
                'last_page' => $perPage > 0 ? (int) ceil($totalFiltered / $perPage) : 1,
            ],
            'summary' => [
                'total' => $grandTotal,
                'provisioning' => $totalProvCount,
                'regulating' => $totalRegCount,
                'supporting' => $totalSupCount,
                'cultural' => $totalCulCount,
                'total_wilayah' => $distinctKabCount ?: 7,
                'total_provinsi' => $distinctProvCount ?: 5,
            ],
            'filter_options' => [
                'provinces' => $provincesList,
                'regencies' => $regenciesList,
                'categories' => ['Provisioning', 'Regulating', 'Supporting', 'Cultural'],
                'land_covers' => $landCoversList,
            ],
        ]);
    }

    /**
     * Menyimpan data master baru secara global (Admin).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => ['required', 'string', 'in:Provisioning,Regulating,Supporting,Cultural'],
            'id_provinsi' => ['nullable', 'integer', 'exists:provinsi,id_provinsi'],
            'id_kabupaten_kota' => ['nullable', 'integer', 'exists:kabupaten_kota,id_kabupaten_kota'],
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

        // Default tutupan lahan fallback
        $landCoverId = $validated['id_jenis_tutupan_lahan'] ?? JenisTutupanLahan::value('id_jenis_tutupan_lahan') ?? 1;

        $baseData = [
            'id_jenis_tutupan_lahan' => $landCoverId,
            'id_provinsi' => $validated['id_provinsi'] ?? null,
            'id_kabupaten_kota' => $validated['id_kabupaten_kota'] ?? null,
        ];

        $category = $validated['category'];
        $created = null;

        if ($category === 'Provisioning') {
            $created = ProvisioningService::create(array_merge($baseData, [
                'nama_objek' => $validated['nama_indonesia'],
                'nama_latin' => $validated['nama_latin'] ?? null,
                'nama_daerah' => $validated['nama_daerah'] ?? null,
                'produktivitas' => $validated['produktivitas'] ?? 1.0,
                'harga_pasar' => $validated['harga_pasar'] ?? ($validated['nilai'] ?? 10000),
                'luas_pemanfaatan' => 1.0,
                'satuan_luas' => 'Hektar',
                'nilai' => $validated['nilai'] ?? (($validated['produktivitas'] ?? 1.0) * ($validated['harga_pasar'] ?? 10000)),
                'kategori_tev' => $validated['kategori_tev'] ?? 'DUV',
            ]));
        } elseif ($category === 'Regulating') {
            $created = RegulatingService::create(array_merge($baseData, [
                'jenis_regulating' => $validated['nama_indonesia'],
                'indikator' => $validated['nama_latin'] ?? 'Indikator fungsi regulasi',
                'satuan' => $validated['satuan'] ?? ($validated['nama_daerah'] ?? 'Hektar'),
                'nilai_indikator' => 1.0,
                'nilai' => $validated['nilai'] ?? 10000000,
                'kategori_tev' => $validated['kategori_tev'] ?? 'IUV',
            ]));
        } elseif ($category === 'Supporting') {
            $created = SupportingService::create(array_merge($baseData, [
                'fungsi_pendukung' => $validated['nama_indonesia'],
                'deskripsi' => $validated['deskripsi'] ?? ($validated['nama_latin'] ?? 'Fungsi pendukung ekosistem'),
                'nilai' => $validated['nilai'] ?? 5000000,
                'kategori_tev' => $validated['kategori_tev'] ?? 'OV',
            ]));
        } else {
            $created = CulturalService::create(array_merge($baseData, [
                'nama_aktivitas' => $validated['nama_indonesia'],
                'referensi' => $validated['deskripsi'] ?? ($validated['nama_latin'] ?? 'Aktivitas pariwisata & budaya'),
                'nilai' => $validated['nilai'] ?? 5000000,
                'kategori_tev' => $validated['kategori_tev'] ?? 'DUV',
            ]));
        }

        // Catat di ActivityLog
        try {
            $user = $request->user() ?? auth('sanctum')->user();
            ActivityLog::create([
                'id_user' => $user?->id_user ?? 1,
                'action' => 'create_master_data',
                'description' => "Menambahkan data master {$category}: {$validated['nama_indonesia']}",
                'meta' => [
                    'category' => $category,
                    'title' => "Tambah Data Master {$category}",
                    'item' => $validated['nama_indonesia'],
                ],
            ]);
        } catch (\Throwable $e) {
            // Ignore log error
        }

        return response()->json([
            'status' => 'success',
            'message' => "Data master {$category} berhasil ditambahkan.",
            'data' => $created,
        ], Response::HTTP_CREATED);
    }

    /**
     * Memperbarui data master yang ada berdasarkan kategori dan id (Admin).
     */
    public function update(Request $request, string $category, int $id): JsonResponse
    {
        $validated = $request->validate([
            'id_provinsi' => ['nullable', 'integer', 'exists:provinsi,id_provinsi'],
            'id_kabupaten_kota' => ['nullable', 'integer', 'exists:kabupaten_kota,id_kabupaten_kota'],
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

        $cat = ucfirst(strtolower($category));
        $item = null;

        if ($cat === 'Provisioning') {
            $item = ProvisioningService::findOrFail($id);
            $item->update([
                'nama_objek' => $validated['nama_indonesia'],
                'nama_latin' => $validated['nama_latin'] ?? $item->nama_latin,
                'nama_daerah' => $validated['nama_daerah'] ?? $item->nama_daerah,
                'id_provinsi' => $validated['id_provinsi'] ?? $item->id_provinsi,
                'id_kabupaten_kota' => $validated['id_kabupaten_kota'] ?? $item->id_kabupaten_kota,
                'id_jenis_tutupan_lahan' => $validated['id_jenis_tutupan_lahan'] ?? $item->id_jenis_tutupan_lahan,
                'produktivitas' => $validated['produktivitas'] ?? $item->produktivitas,
                'harga_pasar' => $validated['harga_pasar'] ?? $item->harga_pasar,
                'nilai' => $validated['nilai'] ?? $item->nilai,
                'kategori_tev' => $validated['kategori_tev'] ?? $item->kategori_tev,
            ]);
        } elseif ($cat === 'Regulating') {
            $item = RegulatingService::findOrFail($id);
            $item->update([
                'jenis_regulating' => $validated['nama_indonesia'],
                'indikator' => $validated['nama_latin'] ?? $item->indikator,
                'satuan' => $validated['satuan'] ?? ($validated['nama_daerah'] ?? $item->satuan),
                'id_provinsi' => $validated['id_provinsi'] ?? $item->id_provinsi,
                'id_kabupaten_kota' => $validated['id_kabupaten_kota'] ?? $item->id_kabupaten_kota,
                'id_jenis_tutupan_lahan' => $validated['id_jenis_tutupan_lahan'] ?? $item->id_jenis_tutupan_lahan,
                'nilai' => $validated['nilai'] ?? $item->nilai,
                'kategori_tev' => $validated['kategori_tev'] ?? $item->kategori_tev,
            ]);
        } elseif ($cat === 'Supporting') {
            $item = SupportingService::findOrFail($id);
            $item->update([
                'fungsi_pendukung' => $validated['nama_indonesia'],
                'deskripsi' => $validated['deskripsi'] ?? ($validated['nama_latin'] ?? $item->deskripsi),
                'id_provinsi' => $validated['id_provinsi'] ?? $item->id_provinsi,
                'id_kabupaten_kota' => $validated['id_kabupaten_kota'] ?? $item->id_kabupaten_kota,
                'id_jenis_tutupan_lahan' => $validated['id_jenis_tutupan_lahan'] ?? $item->id_jenis_tutupan_lahan,
                'nilai' => $validated['nilai'] ?? $item->nilai,
                'kategori_tev' => $validated['kategori_tev'] ?? $item->kategori_tev,
            ]);
        } elseif ($cat === 'Cultural') {
            $item = CulturalService::findOrFail($id);
            $item->update([
                'nama_aktivitas' => $validated['nama_indonesia'],
                'referensi' => $validated['deskripsi'] ?? ($validated['nama_latin'] ?? $item->referensi),
                'id_provinsi' => $validated['id_provinsi'] ?? $item->id_provinsi,
                'id_kabupaten_kota' => $validated['id_kabupaten_kota'] ?? $item->id_kabupaten_kota,
                'id_jenis_tutupan_lahan' => $validated['id_jenis_tutupan_lahan'] ?? $item->id_jenis_tutupan_lahan,
                'nilai' => $validated['nilai'] ?? $item->nilai,
                'kategori_tev' => $validated['kategori_tev'] ?? $item->kategori_tev,
            ]);
        } else {
            return response()->json(['message' => 'Kategori jasa tidak valid.'], Response::HTTP_BAD_REQUEST);
        }

        // Catat di ActivityLog
        try {
            $user = $request->user() ?? auth('sanctum')->user();
            ActivityLog::create([
                'id_user' => $user?->id_user ?? 1,
                'action' => 'update_master_data',
                'description' => "Memperbarui data master {$cat}: {$validated['nama_indonesia']}",
                'meta' => [
                    'category' => $cat,
                    'title' => "Update Data Master {$cat}",
                    'item' => $validated['nama_indonesia'],
                ],
            ]);
        } catch (\Throwable $e) {
            // Ignore log error
        }

        return response()->json([
            'status' => 'success',
            'message' => "Data master {$cat} berhasil diperbarui.",
            'data' => $item,
        ]);
    }

    /**
     * Menghapus data master (Admin).
     */
    public function destroy(Request $request, string $category, int $id): JsonResponse
    {
        $cat = ucfirst(strtolower($category));
        $item = null;
        $title = '';

        if ($cat === 'Provisioning') {
            $item = ProvisioningService::findOrFail($id);
            $title = $item->nama_objek;
        } elseif ($cat === 'Regulating') {
            $item = RegulatingService::findOrFail($id);
            $title = $item->jenis_regulating;
        } elseif ($cat === 'Supporting') {
            $item = SupportingService::findOrFail($id);
            $title = $item->fungsi_pendukung;
        } elseif ($cat === 'Cultural') {
            $item = CulturalService::findOrFail($id);
            $title = $item->nama_aktivitas;
        } else {
            return response()->json(['message' => 'Kategori jasa tidak valid.'], Response::HTTP_BAD_REQUEST);
        }

        $item->delete();

        // Catat di ActivityLog
        try {
            $user = $request->user() ?? auth('sanctum')->user();
            ActivityLog::create([
                'id_user' => $user?->id_user ?? 1,
                'action' => 'delete_master_data',
                'description' => "Menghapus data master {$cat}: {$title}",
                'meta' => [
                    'category' => $cat,
                    'title' => "Hapus Data Master {$cat}",
                    'item' => $title,
                ],
            ]);
        } catch (\Throwable $e) {
            // Ignore log error
        }

        return response()->json([
            'status' => 'success',
            'message' => "Data master {$cat} '{$title}' berhasil dihapus.",
        ]);
    }
}
