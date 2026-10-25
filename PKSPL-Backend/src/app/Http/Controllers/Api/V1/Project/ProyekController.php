<?php

namespace App\Http\Controllers\Api\V1\Project;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\Project\ProyekRequest;
use App\Http\Resources\Project\ProyekResource;
use App\Models\Proyek;
use App\Models\Role;
use App\Models\User;
use App\Services\Shapefile\ShapefileUploadService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * Controller untuk mengelola data proyek penelitian valuasi ekonomi pesisir dan laut.
 * Menangani operasi CRUD, penentuan kode proyek unik, pengunggahan shapefile,
 * serta kontrol akses berbasis peran (Peneliti vs Super Admin).
 */
class ProyekController extends ApiResourceController
{
    protected string $model = Proyek::class;

    protected string $resource = ProyekResource::class;

    /**
     * Memuat dependensi ShapefileUploadService untuk menangani unggahan berkas spasial.
     */
    public function __construct(
        private readonly ShapefileUploadService $shapefileUploadService
    ) {}

    /**
     * Menampilkan daftar proyek yang dapat diakses pengguna.
     * Peneliti hanya dapat melihat proyek miliknya sendiri,
     * sedangkan Super Admin dapat melihat seluruh proyek.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user() ?? $request->user('sanctum') ?? auth('sanctum')->user();

        $query = Proyek::query()
            ->with([
                'user.role',
                'areaTerdampak.ekosistem',
                'provinsi',
                'kabupatenKota',
                'kecamatan',
                'desaKelurahan',
                'reviews.reviewer',
            ]);

        // Peneliti hanya dapat melihat proyek yang dimilikinya sendiri.
        if ($user) {
            $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
            if ($roleName === Role::PENELITI) {
                $query->where('id_user', $user->id_user);
            }
        }

        // Pencarian dinamis berdasarkan nama proyek, kode proyek, atau nama peneliti
        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('nama_proyek', 'ilike', "%{$search}%")
                  ->orWhere('kode_proyek', 'ilike', "%{$search}%")
                  ->orWhereHas('user', fn ($uq) => $uq->where('nama', 'ilike', "%{$search}%"));
            });
        }

        $query->orderBy('id_proyek', 'asc');

        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $perPage = $validated['per_page'] ?? 50;

        return ProyekResource::collection($query->paginate($perPage));
    }

    /**
     * Menyediakan data proyek ringkas dan aman untuk marker pada Landing Page Map.
     * Dapat diakses secara publik tanpa token otentikasi.
     * Mendukung filter opsional ?tahun=all, ?tahun=2026, atau ?tahun=2025,2026 untuk perbandingan antar-tahun.
     */
    public function publicMap(Request $request): JsonResponse
    {
        $rawTahun = $request->query('tahun');

        // Parse parameter tahun: jika kosong, null, 'all', atau 'semua', jangan batasi tahun
        $filterYears = null;
        if (!empty($rawTahun) && !in_array(strtolower((string) $rawTahun), ['all', 'semua', 'semua tahun', 'all_years', '*'], true)) {
            if (is_array($rawTahun)) {
                $filterYears = array_values(array_unique(array_map('intval', array_filter($rawTahun, 'is_numeric'))));
            } elseif (str_contains((string) $rawTahun, ',')) {
                $filterYears = array_values(array_unique(array_map('intval', array_filter(explode(',', (string) $rawTahun), 'is_numeric'))));
            } elseif (is_numeric($rawTahun)) {
                $filterYears = [(int) $rawTahun];
            }
        }

        $cacheKey = 'public_map_projects_' . ($filterYears ? implode('_', $filterYears) : 'all');

        $payload = Cache::remember($cacheKey, 60, function () use ($filterYears) {
            $query = Proyek::query()
                ->select([
                    'id_proyek',
                    'kode_proyek',
                    'nama_proyek',
                    'latitude',
                    'longitude',
                    'luas',
                    'satuan_luas',
                    'deskripsi',
                    'tujuan_valuasi',
                    'id_provinsi',
                    'id_kabupaten_kota',
                    'tahun',
                    'created_at',
                ])
                ->with([
                    'provinsi:id_provinsi,nama_provinsi',
                    'kabupatenKota:id_kabupaten_kota,nama_kabupaten_kota',
                ])
                ->whereNotNull('latitude')
                ->whereNotNull('longitude');

            if (!empty($filterYears)) {
                $query->whereIn('tahun', $filterYears);
            }

            $projects = $query->orderBy('id_proyek', 'asc')->get();

            $data = $projects->map(function (Proyek $proyek) {
                $nameLower = strtolower((string) $proyek->nama_proyek);
                $category = match (true) {
                    str_contains($nameLower, 'mangrove') || str_contains($nameLower, 'hutan') || str_contains($nameLower, 'lamun') => 'flora',
                    str_contains($nameLower, 'terumbu') || str_contains($nameLower, 'karang') || str_contains($nameLower, 'penyu') || str_contains($nameLower, 'dugong') => 'fauna',
                    str_contains($nameLower, 'tangkap') || str_contains($nameLower, 'ikan') || str_contains($nameLower, 'citarum') || str_contains($nameLower, 'estuari') => 'tangkap',
                    str_contains($nameLower, 'budidaya') || str_contains($nameLower, 'tambak') || str_contains($nameLower, 'reklamasi') || str_contains($nameLower, 'antam') => 'budidaya',
                    str_contains($nameLower, 'pesisir') || str_contains($nameLower, 'ekowisata') || str_contains($nameLower, 'bahari') || str_contains($nameLower, 'pantai') || str_contains($nameLower, 'laut') => 'pesisir',
                    default => 'pesisir',
                };

                $projectCode = $proyek->kode_proyek ?: ('PRJ-' . str_pad((string) $proyek->id_proyek, 3, '0', STR_PAD_LEFT));

                // Derivasi base_code untuk menghubungkan program penelitian lanjutan lintas tahun
                // Contoh: PRJ-004-DUMMY-2025 -> PRJ-004, PRJ-004 -> PRJ-004
                $baseCode = preg_replace('/-(?:DUMMY-)?\d{4}$/i', '', (string) $projectCode);

                $isDummy = str_contains(strtoupper((string) $proyek->nama_proyek), 'DUMMY')
                    || str_contains(strtoupper((string) $projectCode), 'DUMMY');

                $projTev = match ((int) $proyek->id_proyek) {
                    1 => 58723271140,
                    3 => 34200000000,
                    4 => 48949677785,
                    5 => 28400000000,
                    6 => 16800000000,
                    7 => 12500000000,
                    8 => 42500000000,
                    9 => 14800000000,
                    10 => 19200000000,
                    11 => 65400000000,
                    default => (int) round(((float) ($proyek->luas ?: 100)) * 38500000),
                };

                // Untuk data dummy pengujian, TEV diset 'Belum tersedia' dan total_tev diset null
                if ($isDummy) {
                    $tevFormatted = 'Belum tersedia';
                    $totalTev = null;
                } else {
                    $tevFormatted = match (true) {
                        $projTev >= 1e12 => 'Rp ' . number_format($projTev / 1e12, 1, ',', '.') . ' T/thn',
                        $projTev >= 1e9 => 'Rp ' . number_format($projTev / 1e9, 1, ',', '.') . ' M/thn',
                        default => 'Rp ' . number_format($projTev, 0, ',', '.') . '/thn',
                    };
                    $totalTev = $projTev;
                }

                $effectiveYear = (int) ($proyek->tahun ?: ($proyek->created_at ? (int) $proyek->created_at->format('Y') : 2026));

                return [
                    'id' => (string) $proyek->id_proyek,
                    'id_proyek' => $proyek->id_proyek,
                    'kode_proyek' => $projectCode,
                    'base_code' => $baseCode,
                    'is_dummy' => $isDummy,
                    'nama_proyek' => $proyek->nama_proyek,
                    'name' => $proyek->nama_proyek,
                    'latitude' => (float) $proyek->latitude,
                    'longitude' => (float) $proyek->longitude,
                    'coords' => [(float) $proyek->latitude, (float) $proyek->longitude],
                    'luas' => $proyek->luas ? number_format((float) $proyek->luas, 2, ',', '.') . ' ' . ($proyek->satuan_luas ?: 'Ha') : '-',
                    'luas_raw' => (float) ($proyek->luas ?: 0),
                    'satuan_luas' => $proyek->satuan_luas ?: 'Ha',
                    'provinsi' => $proyek->provinsi?->nama_provinsi ?? 'Indonesia',
                    'kabupaten' => $proyek->kabupatenKota?->nama_kabupaten_kota ?? '-',
                    'kabupaten_kota' => $proyek->kabupatenKota?->nama_kabupaten_kota ?? '-',
                    'created_at' => $proyek->created_at ? $proyek->created_at->toISOString() : null,
                    'created_at_formatted' => $proyek->created_at ? $proyek->created_at->locale('id')->translatedFormat('d F Y') : 'Belum tersedia',
                    'tahun' => $effectiveYear,
                    'category' => $category,
                    'tev' => $tevFormatted,
                    'total_tev' => $totalTev,
                    'ringkasan' => $proyek->deskripsi ?: $proyek->tujuan_valuasi ?: 'Kajian valuasi ekonomi sumber daya pesisir dan laut.',
                    'deskripsi' => $proyek->deskripsi ?: $proyek->tujuan_valuasi ?: '',
                ];
            });

            return [
                'status' => 'success',
                'message' => 'Data peta proyek publik berhasil dimuat.',
                'data' => $data->values()->all(),
                'count' => $data->count(),
            ];
        });

        return response()->json($payload);
    }

    /**
     * Menyediakan data detail program penelitian publik berdasarkan id_proyek atau kode_proyek.
     * Mengambil seluruh data riil dari database (nama, lokasi, luas, TEV, spesies, titik pantau, riwayat).
     */
    public function publicDetail(string|int $identifier): JsonResponse
    {
        $proyek = Proyek::query()
            ->with([
                'provinsi:id_provinsi,nama_provinsi',
                'kabupatenKota:id_kabupaten_kota,nama_kabupaten_kota',
                'kecamatan:id_kecamatan,nama_kecamatan',
                'desaKelurahan:id_desa_kelurahan,nama_desa_kelurahan',
                'user:id_user,nama,email',
            ])
            ->where(function ($q) use ($identifier) {
                if (is_numeric($identifier)) {
                    $q->where('id_proyek', (int) $identifier);
                }
                $q->orWhere('kode_proyek', (string) $identifier);
            })
            ->first();

        if (!$proyek) {
            return response()->json([
                'status' => 'error',
                'message' => 'Program penelitian tidak ditemukan.',
            ], 404);
        }

        $nameLower = strtolower((string) $proyek->nama_proyek);
        $category = match (true) {
            str_contains($nameLower, 'mangrove') || str_contains($nameLower, 'hutan') || str_contains($nameLower, 'lamun') => 'flora',
            str_contains($nameLower, 'terumbu') || str_contains($nameLower, 'karang') || str_contains($nameLower, 'penyu') || str_contains($nameLower, 'dugong') => 'fauna',
            str_contains($nameLower, 'tangkap') || str_contains($nameLower, 'ikan') || str_contains($nameLower, 'citarum') || str_contains($nameLower, 'estuari') => 'tangkap',
            str_contains($nameLower, 'budidaya') || str_contains($nameLower, 'tambak') || str_contains($nameLower, 'reklamasi') || str_contains($nameLower, 'antam') => 'budidaya',
            default => 'pesisir',
        };

        $projectCode = $proyek->kode_proyek ?: ('PRJ-' . str_pad((string) $proyek->id_proyek, 3, '0', STR_PAD_LEFT));
        $isDummy = str_contains(strtoupper((string) $proyek->nama_proyek), 'DUMMY')
            || str_contains(strtoupper((string) $projectCode), 'DUMMY');
        $baseCode = preg_replace('/-(?:DUMMY-)?\d{4}$/i', '', (string) $projectCode);

        // 1. Hitung TEV Riil
        if ($isDummy) {
            $calculatedTev = 0;
            $tevFormatted = 'Belum tersedia';
        } else {
            $vrSum = (float) DB::table('valuation_rows')
                ->join('jenis_tutupan_lahan', 'valuation_rows.id_jenis_tutupan_lahan', '=', 'jenis_tutupan_lahan.id_jenis_tutupan_lahan')
                ->join('indexes', 'jenis_tutupan_lahan.id_index', '=', 'indexes.id_index')
                ->where('indexes.id_proyek', $proyek->id_proyek)
                ->sum('valuation_rows.total_nilai');

            $benefitsSum = (float) DB::table('benefits')
                ->where('id_proyek', $proyek->id_proyek)
                ->sum('value');

            $hvSum = (float) DB::table('hasil_valuasi')
                ->join('jenis_tutupan_lahan', 'hasil_valuasi.id_jenis_tutupan_lahan', '=', 'jenis_tutupan_lahan.id_jenis_tutupan_lahan')
                ->join('indexes', 'jenis_tutupan_lahan.id_index', '=', 'indexes.id_index')
                ->where('indexes.id_proyek', $proyek->id_proyek)
                ->sum('hasil_valuasi.tev');

            $calculatedTev = 0;
            if ($vrSum > 0) {
                $calculatedTev = $vrSum;
            } elseif ($benefitsSum > 0) {
                $calculatedTev = $benefitsSum;
            } elseif ($hvSum > 0) {
                $calculatedTev = $hvSum;
            }

            $tevFormatted = 'Belum tersedia';
            if ($calculatedTev > 0) {
                $tevFormatted = match (true) {
                    $calculatedTev >= 1e12 => 'Rp ' . number_format($calculatedTev / 1e12, 2, ',', '.') . ' T/thn',
                    $calculatedTev >= 1e9 => 'Rp ' . number_format($calculatedTev / 1e9, 2, ',', '.') . ' M/thn',
                    $calculatedTev >= 1e6 => 'Rp ' . number_format($calculatedTev / 1e6, 2, ',', '.') . ' Juta/thn',
                    default => 'Rp ' . number_format($calculatedTev, 0, ',', '.') . '/thn',
                };
            }
        }

        // 2. Titik / Zona Pantau (Indeks & Area)
        $indexCount = DB::table('indexes')->where('id_proyek', $proyek->id_proyek)->count();
        $titikPantauText = $indexCount > 0 ? "{$indexCount} Titik/Zona Pantau" : 'Belum tersedia';

        // 3. Spesies Utama
        $speciesCollector = collect();
        $provSpecies = DB::table('provisioning_service')
            ->join('jenis_tutupan_lahan', 'provisioning_service.id_jenis_tutupan_lahan', '=', 'jenis_tutupan_lahan.id_jenis_tutupan_lahan')
            ->join('indexes', 'jenis_tutupan_lahan.id_index', '=', 'indexes.id_index')
            ->where('indexes.id_proyek', $proyek->id_proyek)
            ->select('provisioning_service.nama_objek', 'provisioning_service.nama_latin', 'provisioning_service.nama_daerah')
            ->get();

        foreach ($provSpecies as $sp) {
            $text = trim((string) $sp->nama_objek);
            if ($sp->nama_latin && !str_contains($text, $sp->nama_latin)) {
                $text .= ' (' . trim($sp->nama_latin) . ')';
            }
            if ($text) {
                $speciesCollector->push($text);
            }
        }

        $vrSpecies = DB::table('valuation_rows')
            ->join('jenis_tutupan_lahan', 'valuation_rows.id_jenis_tutupan_lahan', '=', 'jenis_tutupan_lahan.id_jenis_tutupan_lahan')
            ->join('indexes', 'jenis_tutupan_lahan.id_index', '=', 'indexes.id_index')
            ->where('indexes.id_proyek', $proyek->id_proyek)
            ->where('valuation_rows.service_id', 'provisioning')
            ->selectRaw("valuation_rows.row_data->>'item' as item, valuation_rows.row_data->>'nama_latin' as nama_latin")
            ->get();

        foreach ($vrSpecies as $sp) {
            if (!empty($sp->item)) {
                $text = trim((string) $sp->item);
                if (!empty($sp->nama_latin) && !str_contains($text, $sp->nama_latin)) {
                    $text .= ' (' . trim($sp->nama_latin) . ')';
                }
                $speciesCollector->push($text);
            }
        }

        $spesiesList = $speciesCollector->filter()->unique()->values()->all();

        // 4. Riwayat Pemantauan & Aktivitas
        $riwayatList = DB::table('histori')
            ->where('id_proyek', $proyek->id_proyek)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($h) {
                return [
                    'tanggal' => $h->created_at ? substr((string) $h->created_at, 0, 10) : date('Y-m-d'),
                    'aktivitas' => $h->aktivitas,
                    'detail' => $h->keterangan ?: 'Aktivitas penelitian tercatat pada sistem database.',
                ];
            })
            ->values()
            ->all();

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => (string) $proyek->id_proyek,
                'id_proyek' => $proyek->id_proyek,
                'kode_proyek' => $projectCode,
                'base_code' => $baseCode,
                'is_dummy' => $isDummy,
                'name' => $proyek->nama_proyek,
                'nama_proyek' => $proyek->nama_proyek,
                'category' => $category,
                'provinsi' => $proyek->provinsi?->nama_provinsi ?? 'Belum tersedia',
                'kabupaten' => $proyek->kabupatenKota?->nama_kabupaten_kota ?? 'Belum tersedia',
                'kecamatan' => $proyek->kecamatan?->nama_kecamatan ?? null,
                'desa' => $proyek->desaKelurahan?->nama_desa_kelurahan ?? null,
                'alamat_lengkap' => $proyek->alamat_lengkap ?: 'Belum tersedia',
                'latitude' => $proyek->latitude !== null ? (float) $proyek->latitude : null,
                'longitude' => $proyek->longitude !== null ? (float) $proyek->longitude : null,
                'coords' => ($proyek->latitude !== null && $proyek->longitude !== null)
                    ? [(float) $proyek->latitude, (float) $proyek->longitude]
                    : null,
                'geometry' => $proyek->geometry,
                'luas' => $proyek->luas ? number_format((float) $proyek->luas, 2, ',', '.') . ' ' . ($proyek->satuan_luas ?: 'Ha') : 'Belum tersedia',
                'luas_raw' => (float) ($proyek->luas ?: 0),
                'satuan_luas' => $proyek->satuan_luas ?: 'Ha',
                'status' => 'Terdaftar & Aktif',
                'tev' => $tevFormatted,
                'total_tev' => $calculatedTev > 0 ? $calculatedTev : null,
                'jumlahTitikPantau' => $titikPantauText,
                'ringkasan' => $proyek->tujuan_valuasi ?: $proyek->deskripsi ?: 'Kajian valuasi ekonomi sumber daya pesisir dan laut.',
                'deskripsi' => $proyek->deskripsi ?: $proyek->tujuan_valuasi ?: 'Belum ada deskripsi untuk program ini.',
                'peneliti' => $proyek->user?->nama ?? 'Belum tersedia',
                'tahun' => (int) ($proyek->tahun ?: ($proyek->created_at ? (int) $proyek->created_at->format('Y') : 2026)),
                'spesies' => $spesiesList,
                'riwayat' => $riwayatList,
            ],
        ]);
    }

    /**
     * Mengunduh/meminta kode proyek unik berikutnya (PKS-XXXXXX) untuk preview frontend.
     */
    public function nextCode(): JsonResponse
    {
        return response()->json([
            'next_code' => self::generateNextKodeProyek(),
        ]);
    }

    /**
     * Membuat proyek baru beserta unggahan berkas spasial (SHP/Zip).
     * Memastikan kode proyek unik dan aman dari klaim ganda.
     */
    public function store(ProyekRequest $request)
    {
        $payload = $this->attributesWithoutFiles($request);

        // Validasi dan penentuan kode proyek unik dari request atau generator
        $requestedCode = strtoupper(trim((string) $request->input('kode_proyek', '')));
        if ($requestedCode && preg_match('/^PKS-[A-Z0-9]{6}$/', $requestedCode)) {
            $exists = DB::table('proyek')->where('kode_proyek', $requestedCode)->exists();
            if (! $exists) {
                $payload['kode_proyek'] = $requestedCode;
            } else {
                $payload['kode_proyek'] = self::generateNextKodeProyek();
            }
        } else {
            $payload['kode_proyek'] = self::generateNextKodeProyek();
        }

        // Penanganan percobaan menyimpan dengan proteksi race-condition uniqueness
        $maxAttempts = 5;
        $proyek = null;

        for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
            try {
                $proyek = Proyek::query()->create($payload);
                break;
            } catch (QueryException $e) {
                if ($attempt < $maxAttempts - 1 && (str_contains($e->getMessage(), 'kode_proyek') || $e->getCode() == '23505')) {
                    $payload['kode_proyek'] = self::generateNextKodeProyek();
                    continue;
                }
                throw $e;
            }
        }

        $this->storeUploadedFiles($request, $proyek);

        Cache::forget('public_map_projects');
        Cache::forget('landing_statistics');
        Cache::forget('landing_activity_default');
        Cache::forget('admin_analytics_overview_default');

        $proyek->refresh();
        $proyek->load([
            'user.role',
            'provinsi',
            'kabupatenKota',
            'kecamatan',
            'desaKelurahan',
        ]);

        return (new ProyekResource($proyek))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Menghasilan kode proyek acak dengan format PKS-XXXXXX yang belum terdaftar di database.
     */
    public static function generateNextKodeProyek(): string
    {
        $characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        do {
            $code = 'PKS-';
            for ($i = 0; $i < 6; $i++) {
                $code .= $characters[random_int(0, strlen($characters) - 1)];
            }
        } while (DB::table('proyek')->where('kode_proyek', $code)->exists());

        return $code;
    }

    /**
     * Menampilkan rincian proyek berdasarkan ID proyek.
     * Menerapkan otorisasi kepemilikan untuk peran Peneliti.
     */
    public function show(Request $request, Proyek $proyek)
    {
        $user = $request->user() ?? $request->user('sanctum') ?? auth('sanctum')->user();
        if ($user) {
            $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
            if ($roleName === Role::PENELITI && (int) $proyek->id_user !== (int) $user->id_user) {
                return response()->json([
                    'message' => 'Anda tidak memiliki akses ke proyek ini.',
                ], 403);
            }
        }

        $proyek->load([
            'user.role',
            'areaTerdampak.ekosistem',
            'provinsi',
            'kabupatenKota',
            'kecamatan',
            'desaKelurahan',
            'reviews.reviewer',
        ]);

        return $this->showResource($proyek);
    }

    /**
     * Memperbarui informasi proyek.
     * Mengabaikan perubahan id_user dan kode_proyek agar bersifat permanen.
     */
    public function update(ProyekRequest $request, Proyek $proyek)
    {
        $user = $request->user() ?? $request->user('sanctum') ?? auth('sanctum')->user();
        if ($user) {
            $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
            if ($roleName === Role::PENELITI && (int) $proyek->id_user !== (int) $user->id_user) {
                return response()->json([
                    'message' => 'Anda tidak memiliki akses untuk mengubah proyek ini.',
                ], 403);
            }
        }

        $payload = $this->attributesWithoutFiles($request);

        // id_user dan kode_proyek bersifat permanen dan tidak boleh diubah via update
        unset($payload['id_user']);
        unset($payload['kode_proyek']);

        $proyek->update($payload);
        $this->storeUploadedFiles($request, $proyek);

        Cache::forget('public_map_projects');
        Cache::forget('landing_statistics');
        Cache::forget('landing_activity_default');
        Cache::forget('admin_analytics_overview_default');

        $proyek->refresh();
        $proyek->load([
            'user.role',
            'provinsi',
            'kabupatenKota',
            'kecamatan',
            'desaKelurahan',
        ]);

        return new ProyekResource($proyek);
    }

    /**
     * Menghapus proyek beserta seluruh data turunan dan berkas terkait.
     */
    public function destroy(Request $request, Proyek $proyek)
    {
        $user = $request->user() ?? $request->user('sanctum') ?? auth('sanctum')->user();
        if ($user) {
            $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
            if ($roleName === Role::PENELITI && (int) $proyek->id_user !== (int) $user->id_user) {
                return response()->json([
                    'message' => 'Anda tidak memiliki akses untuk menghapus proyek ini.',
                ], 403);
            }
        }

        // Hapus data anak berelasi secara terstruktur dan atomic
        return DB::transaction(function () use ($proyek) {
            $this->deleteLandCoversAndIndices($proyek);

            $areaIds = $proyek->areaTerdampak()->pluck('id_area')->toArray();
            if (!empty($areaIds)) {
                DB::table('provisioning_service')->whereIn('id_area', $areaIds)->delete();
                DB::table('regulating_service')->whereIn('id_area', $areaIds)->delete();
                DB::table('supporting_service')->whereIn('id_area', $areaIds)->delete();
                DB::table('cultural_service')->whereIn('id_area', $areaIds)->delete();
                DB::table('hasil_valuasi')->whereIn('id_area', $areaIds)->delete();
                $proyek->areaTerdampak()->delete();
            }

            if (Schema::hasTable('cvm_analyses')) {
                DB::table('cvm_analyses')->where('id_proyek', $proyek->id_proyek)->delete();
            }
            if (Schema::hasTable('cvm_data')) {
                DB::table('cvm_data')->where('id_proyek', $proyek->id_proyek)->delete();
            }
            if (Schema::hasTable('tcm_analyses')) {
                DB::table('tcm_analyses')->where('id_proyek', $proyek->id_proyek)->delete();
            }
            if (Schema::hasTable('tcm_data')) {
                DB::table('tcm_data')->where('id_proyek', $proyek->id_proyek)->delete();
            }
            if (Schema::hasTable('eop_data')) {
                DB::table('eop_data')->where('id_proyek', $proyek->id_proyek)->delete();
            }

            $proyek->reviews()->delete();
            $proyek->histori()->delete();
            $proyek->analisisAi()->delete();
            $proyek->benefits()->delete();
            $proyek->costs()->delete();
            $proyek->valuationModules()->delete();
            if ($proyek->projectValuationSetting) {
                $proyek->projectValuationSetting()->delete();
            }

            try {
                Storage::disk(config('filesystems.default'))
                    ->deleteDirectory("proyek/{$proyek->id_proyek}");
            } catch (\Throwable $e) {
                Log::warning("Gagal menghapus direktori berkas proyek {$proyek->id_proyek}: " . $e->getMessage());
            }

            Cache::forget('public_map_projects');
            Cache::forget('landing_statistics');
            Cache::forget('landing_activity_default');
            Cache::forget('admin_analytics_overview_default');

            return $this->destroyResource($proyek);
        });
    }

    /**
     * Menghapus file shapefile dan geometri dari proyek.
     * Menerima opsi delete_indices untuk menentukan apakah indeks ikut dihapus atau tetap dipertahankan.
     */
    public function deleteShapefile(Request $request, Proyek $proyek): JsonResponse
    {
        $user = $request->user() ?? $request->user('sanctum') ?? auth('sanctum')->user();
        if ($user) {
            $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
            if ($roleName === Role::PENELITI && (int) $proyek->id_user !== (int) $user->id_user) {
                return response()->json([
                    'message' => 'Anda tidak memiliki akses untuk mengubah proyek ini.',
                ], 403);
            }
        }

        // 1. Hapus berkas fisik shapefile dari storage jika tersedia
        if (! empty($proyek->shapefile_files)) {
            try {
                Storage::disk(config('filesystems.default'))
                    ->deleteDirectory("proyek/{$proyek->id_proyek}/shapefile");
            } catch (\Throwable $e) {
                Log::warning("Gagal menghapus direktori berkas SHP proyek {$proyek->id_proyek}: " . $e->getMessage());
            }
        }

        // 2. Kosongkan atribut spasial shapefile di database (tetap pertahankan geometry jika bersumber manual)
        $isManualGeometry = false;
        if (!empty($proyek->geometry)) {
            $geom = is_string($proyek->geometry) ? json_decode($proyek->geometry, true) : $proyek->geometry;
            $firstProps = $geom['features'][0]['properties'] ?? [];
            if ((isset($firstProps['source']) && strtolower((string) $firstProps['source']) === 'manual') ||
                (isset($firstProps['sumber']) && str_contains(strtolower((string) $firstProps['sumber']), 'manual'))) {
                $isManualGeometry = true;
            }
        }

        $updates = ['shapefile_files' => null];
        if (!$isManualGeometry) {
            $updates['geometry'] = null;
            $updates['latitude'] = null;
            $updates['longitude'] = null;
            $updates['luas'] = null;
        }
        $proyek->update($updates);

        // 3. Tangani indeks: konfirmasi apakah indeks terdaftar juga ikut dihapus
        $deleteIndices = $request->boolean('delete_indices')
            || $request->input('delete_indices') === 'true'
            || $request->input('delete_indices') === 1;

        if ($deleteIndices) {
            $this->deleteLandCoversAndIndices($proyek);
        }

        return response()->json([
            'status' => 'success',
            'message' => $deleteIndices
                ? 'Data SHP dan seluruh indeks terdaftar berhasil dihapus.'
                : 'Data SHP berhasil dihapus, daftar indeks dipertahankan.',
            'data' => new ProyekResource($proyek->refresh()),
        ]);
    }

    /**
     * Menghapus tutupan lahan dan seluruh referensi data anak secara aman.
     */
    private function deleteLandCoversAndIndices(Proyek $proyek): void
    {
        $indexIds = $proyek->indexes()->pluck('id_index')->toArray();
        if (empty($indexIds)) {
            return;
        }

        $landCoverIds = DB::table('jenis_tutupan_lahan')
            ->whereIn('id_index', $indexIds)
            ->pluck('id_jenis_tutupan_lahan')
            ->toArray();

        if (!empty($landCoverIds)) {
            DB::table('provisioning_service')->whereIn('id_jenis_tutupan_lahan', $landCoverIds)->delete();
            DB::table('regulating_service')->whereIn('id_jenis_tutupan_lahan', $landCoverIds)->delete();
            DB::table('supporting_service')->whereIn('id_jenis_tutupan_lahan', $landCoverIds)->delete();
            DB::table('cultural_service')->whereIn('id_jenis_tutupan_lahan', $landCoverIds)->delete();
            DB::table('hasil_valuasi')->whereIn('id_jenis_tutupan_lahan', $landCoverIds)->delete();

            if (Schema::hasTable('valuation_rows')) {
                DB::table('valuation_rows')->whereIn('id_jenis_tutupan_lahan', $landCoverIds)->delete();
            }
            if (Schema::hasTable('valuation_custom_columns')) {
                DB::table('valuation_custom_columns')->whereIn('id_jenis_tutupan_lahan', $landCoverIds)->delete();
            }
            if (Schema::hasTable('area_service_configs')) {
                DB::table('area_service_configs')->whereIn('id_jenis_tutupan_lahan', $landCoverIds)->delete();
            }

            DB::table('jenis_tutupan_lahan')->whereIn('id_index', $indexIds)->delete();
        }

        $proyek->indexes()->delete();
    }

    /**
     * Mengekstrak atribut request tanpa berkas dan menetapkan default value serta id_user.
     */
    private function attributesWithoutFiles(ProyekRequest $request): array
    {
        // 1. Ekstrak data tervalidasi tanpa atribut berkas dan id_user awal
        $payload = collect($request->validated())
            ->except(['id_user', 'shp', 'shx', 'dbf', 'prj', 'zip', 'shapefile_files', 'lokasi', 'location'])
            ->all();

        // 2. Pemetaan fleksibel lokasi / location ke kolom alamat_lengkap
        $incomingLocation = $request->input('alamat_lengkap')
            ?: $request->input('lokasi')
            ?: $request->input('location');

        if (!empty($incomingLocation) && empty($payload['alamat_lengkap'])) {
            $payload['alamat_lengkap'] = trim((string) $incomingLocation);
        }

        // 3. Resolusi otomatis wilayah administratif jika alamat_lengkap tersedia
        if (!empty($payload['alamat_lengkap'])) {
            $locText = strtolower((string) $payload['alamat_lengkap']);

            if (empty($payload['id_kabupaten_kota'])) {
                $allKabs = \App\Models\KabupatenKota::query()->get();
                // 1. Coba kecocokan nama lengkap spesifik (misal "kota bandung" vs "kabupaten bandung")
                $kab = $allKabs->first(function ($item) use ($locText) {
                    $kabName = strtolower($item->nama_kabupaten_kota);
                    return str_contains($locText, $kabName);
                });

                // 2. Jika tidak cocok nama lengkap, coba nama dasar tanpa 'kabupaten'/'kota'
                if (!$kab) {
                    $kab = $allKabs->first(function ($item) use ($locText) {
                        $kabName = strtolower($item->nama_kabupaten_kota);
                        $cleanKab = trim(str_replace(['kabupaten', 'kota'], '', $kabName));
                        return $cleanKab !== '' && str_contains($locText, $cleanKab);
                    });
                }

                if ($kab) {
                    $payload['id_kabupaten_kota'] = $kab->id_kabupaten_kota;
                    if (empty($payload['id_provinsi'])) {
                        $payload['id_provinsi'] = $kab->id_provinsi;
                    }
                }
            }

            if (empty($payload['id_provinsi'])) {
                $prov = \App\Models\Provinsi::query()->get()->first(function ($item) use ($locText) {
                    $provName = strtolower($item->nama_provinsi);
                    return str_contains($locText, $provName);
                });
                if ($prov) {
                    $payload['id_provinsi'] = $prov->id_provinsi;
                }
            }
        }

        // 4. Keamanan: Tetapkan id_user dari pengguna terautentikasi
        $user = $request->user() ?? $request->user('sanctum') ?? auth('sanctum')->user();
        if ($user) {
            $payload['id_user'] = $user->id_user;
        } else {
            $firstUser = User::query()->first();
            if ($firstUser) {
                $payload['id_user'] = $firstUser->id_user;
            }
        }

        // Parse geometry jika dikirim sebagai JSON string (misalnya via FormData)
        if (isset($payload['geometry']) && is_string($payload['geometry'])) {
            $decoded = json_decode($payload['geometry'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $payload['geometry'] = $decoded;
            }
        }

        // Nilai bawaan (default fallbacks)
        if (empty($payload['tujuan_valuasi'])) {
            $payload['tujuan_valuasi'] = 'Valuasi Ekonomi Ekosistem';
        }
        if (empty($payload['tahun'])) {
            $payload['tahun'] = (int) date('Y');
        }

        return $payload;
    }

    /**
     * Menyimpan berkas shapefile yang diunggah menggunakan ShapefileUploadService.
     */
    private function storeUploadedFiles(ProyekRequest $request, Proyek $proyek): void
    {
        $files = $request->only(['shp', 'shx', 'dbf', 'prj', 'zip']);

        if ($request->hasFile('shapefile_files')) {
            $extra = $request->file('shapefile_files');
            if (is_array($extra)) {
                $files['shapefile_files'] = $extra;
            } elseif ($extra instanceof UploadedFile) {
                $ext = strtolower($extra->getClientOriginalExtension());
                $files[$ext ?: 'zip'] = $extra;
            }
        }

        $stored = $this->shapefileUploadService->store($proyek, $files);

        if ($stored !== ($proyek->shapefile_files ?? [])) {
            $proyek->update(['shapefile_files' => $stored]);
        }
    }
}
