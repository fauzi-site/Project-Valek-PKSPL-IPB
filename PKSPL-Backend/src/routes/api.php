<?php

// Controller API versi 1 untuk modul data utama aplikasi.
use App\Http\Controllers\Api\V1\AI\AnalisisAiController;
use App\Http\Controllers\Api\V1\Project\AreaTerdampakController;
use App\Http\Controllers\Api\V1\AI\BasisDataAiController;
use App\Http\Controllers\Api\V1\Geography\BoundaryLookupController;
use App\Http\Controllers\Api\V1\Ecosystem\CulturalServiceController;
use App\Http\Controllers\Api\V1\Reference\DatasetReferensiController;
use App\Http\Controllers\Api\V1\Geography\DesaKelurahanController;
use App\Http\Controllers\Api\V1\Ecosystem\EkosistemController;
use App\Http\Controllers\Api\V1\Valuation\HasilValuasiController;
use App\Http\Controllers\Api\V1\Project\HistoriController;
use App\Http\Controllers\Api\V1\Geography\KabupatenKotaController;
use App\Http\Controllers\Api\V1\Geography\KecamatanController;
use App\Http\Controllers\Api\V1\Valuation\MetodeValuasiController;
use App\Http\Controllers\Api\V1\Project\ProyekController;
use App\Http\Controllers\Api\V1\Project\ProyekDashboardController;
use App\Http\Controllers\Api\V1\Project\ProjectDataMasterController;
use App\Http\Controllers\Api\V1\Project\IndexController;
use App\Http\Controllers\Api\V1\Project\JenisTutupanLahanController;
use App\Http\Controllers\Api\V1\Ecosystem\ProvisioningServiceController;
use App\Http\Controllers\Api\V1\Geography\ProvinsiController;
use App\Http\Controllers\Api\V1\Ecosystem\RegulatingServiceController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\User\RoleController;
use App\Http\Controllers\Api\V1\Ecosystem\SupportingServiceController;
use App\Http\Controllers\Api\V1\Auth\TestController;
use App\Http\Controllers\Api\V1\User\UserController;
use App\Http\Controllers\Api\V1\AI\AIController;
use App\Http\Controllers\Api\V1\User\ProfileController;
use App\Http\Controllers\Api\V1\Project\StatisticsController;
use App\Http\Controllers\Api\V1\Admin\AdminActivityLogController;
use App\Http\Controllers\Api\V1\Admin\AdminAnalyticsController;
use App\Http\Controllers\Api\V1\Admin\AdminMasterDataController;
use Illuminate\Support\Facades\Route;

// ============================================================
// BAB 1. AKSES DAN ADMINISTRASI API V1
// Seluruh endpoint dalam bab ini menggunakan prefiks v1.
// ============================================================
Route::prefix('v1')->group(function (): void {
    // Landing Page statistics & public project activity endpoints
    Route::get('statistics', [StatisticsController::class, 'index']);
    Route::get('public/projects/statistics', [StatisticsController::class, 'index']);
    Route::get('public/projects/activity', [StatisticsController::class, 'activity']);

    // Admin Activity and Audit Logs endpoint
    Route::get('admin/activity-logs', [AdminActivityLogController::class, 'index']);
    Route::post('admin/activity-logs', [AdminActivityLogController::class, 'store']);

    // Admin Analytics Overview endpoint (Dynamic Tren Valuasi & Riset)
    Route::get('admin/analytics/overview', [AdminAnalyticsController::class, 'overview']);

    // Admin Master Data Global endpoints (Multi-wilayah, CRUD, Statistics)
    Route::get('admin/master-data', [AdminMasterDataController::class, 'index']);
    Route::post('admin/master-data', [AdminMasterDataController::class, 'store']);
    Route::put('admin/master-data/{category}/{id}', [AdminMasterDataController::class, 'update']);
    Route::delete('admin/master-data/{category}/{id}', [AdminMasterDataController::class, 'destroy']);

    Route::get('master-data', [AdminMasterDataController::class, 'index']);
    Route::post('master-data', [AdminMasterDataController::class, 'store']);
    Route::put('master-data/{category}/{id}', [AdminMasterDataController::class, 'update']);
    Route::delete('master-data/{category}/{id}', [AdminMasterDataController::class, 'destroy']);

    // Landing Page public map projects endpoint
    Route::get('public/projects/map', [ProyekController::class, 'publicMap']);
    // ------------------------------------------------------------
    // 1.1 AUTENTIKASI
    // Menangani pendaftaran, sesi pengguna, dan integrasi Google.
    // ------------------------------------------------------------
    // 1.1.1 Mengarahkan pengguna ke autentikasi Google.
    Route::get('auth/google/redirect', [AuthController::class, 'googleRedirect']);

    // 1.1.2 Menerima hasil autentikasi dari Google.
    Route::get('auth/google/callback', [AuthController::class, 'googleCallback']);

    // 1.1.3 Mendaftarkan akun pengguna baru.
    Route::post('auth/register', [AuthController::class, 'register']);

    // 1.1.4 Membuat sesi untuk pengguna yang berhasil masuk.
    Route::post('auth/login', [AuthController::class, 'login']);

    // 1.1.5 Verifikasi Email dan kirim ulang.
    Route::get('auth/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])->name('verification.verify');
    Route::post('auth/email/resend', [AuthController::class, 'resendVerificationEmail']);

    // 1.1.6 Fitur Lupa Password dan Reset Password
    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('auth/reset-password', [AuthController::class, 'resetPassword']);

    // 1.1.7 Endpoint sesi yang memerlukan autentikasi Sanctum.
    Route::middleware('auth:sanctum')->group(function (): void {
        // 1.1.5.1 Mengakhiri sesi pengguna terautentikasi.
        Route::post('auth/logout', [AuthController::class, 'logout']);

        // 1.1.5.2 Menampilkan profil pengguna terautentikasi.
        Route::get('auth/me', [AuthController::class, 'me']);

        // 1.1.5.3 Memperbarui profil pengguna terautentikasi.
        Route::post('profile', [ProfileController::class, 'update']);

        // 1.1.5.4 Mengubah password pengguna terautentikasi.
        Route::post('profile/password', [ProfileController::class, 'updatePassword']);

        // 1.1.5.5 Memperbarui status kehadiran (heartbeat) pengguna terautentikasi.
        Route::post('profile/presence', [AuthController::class, 'heartbeat']);
    });

    // ------------------------------------------------------------
    // 1.2 PENGUJIAN AKSES BERDASARKAN PERAN
    // Prefiks ini dilindungi Sanctum dan memvalidasi peran pengguna.
    // ------------------------------------------------------------
    Route::prefix('test')->middleware(['auth:sanctum'])->group(function (): void {
        // 1.2.1 Memverifikasi akses untuk peran Super Admin.
        Route::get('admin', [TestController::class, 'admin'])->middleware('role:Super Admin');

        // 1.2.2 Memverifikasi akses untuk peran Peneliti.
        Route::get('peneliti', [TestController::class, 'peneliti'])->middleware('role:Peneliti');

        // 1.2.3 Memverifikasi akses untuk peran Guest.
        Route::get('guest', [TestController::class, 'guest'])->middleware('role:Guest');
    });

    // ------------------------------------------------------------
    // 1.3 MANAJEMEN PERAN
    // Menyediakan CRUD peran dengan nama yang telah disepakati.
    // ------------------------------------------------------------

    // 1.3.1 Mengelola daftar, detail, pembuatan, perubahan, dan penghapusan peran.
    Route::apiResource('roles', RoleController::class);

    // ------------------------------------------------------------
    // 1.4 MANAJEMEN PENGGUNA
    // Mengelola akun pengguna aplikasi.
    // ------------------------------------------------------------
    // 1.4.1 Mengelola daftar, detail, pembuatan, perubahan, dan penghapusan pengguna.
    Route::middleware(['auth:sanctum', 'role:Super Admin'])->group(function (): void {
        Route::apiResource('users', UserController::class);
    });

    // ============================================================
    // BAB 2. WILAYAH ADMINISTRATIF
    // Menyediakan master wilayah untuk kebutuhan data analisis.
    // ============================================================

    // ------------------------------------------------------------
    // 2.1 PROVINSI
    // ------------------------------------------------------------
    // 2.1.1 Mengelola CRUD master provinsi.
    Route::apiResource('provinsi', ProvinsiController::class);

    // ------------------------------------------------------------
    // 2.2 KABUPATEN/KOTA
    // ------------------------------------------------------------
    // 2.2.1 Mengelola CRUD master kabupaten/kota dengan binding kabupatenKota.
    Route::apiResource('kabupaten-kota', KabupatenKotaController::class)->parameters(['kabupaten-kota' => 'kabupatenKota']);

    // ------------------------------------------------------------
    // 2.3 KECAMATAN
    // ------------------------------------------------------------
    // 2.3.1 Mengelola CRUD master kecamatan.
    Route::apiResource('kecamatan', KecamatanController::class);

    // ------------------------------------------------------------
    // 2.4 DESA / KELURAHAN
    // ------------------------------------------------------------
    // 2.4.1 Mengelola CRUD master desa atau kelurahan.
    Route::apiResource('desa-kelurahan', DesaKelurahanController::class)->parameters(['desa-kelurahan' => 'desaKelurahan']);

    // ------------------------------------------------------------
    // 2.5 BOUNDARY LOOKUP (GEOSPATIAL POLYGON)
    // ------------------------------------------------------------
    // 2.5.1 Lookup polygon GeoJSON untuk wilayah berdasarkan level dan kode.
    Route::get('boundary-lookup', [BoundaryLookupController::class, 'lookup']);

    // ============================================================
    // BAB 3. PROYEK DAN DATA ANALISIS
    // Mendukung pengelolaan proyek serta data dasar analisis valuasi.
    // ============================================================

    // ------------------------------------------------------------
    // 3.1 PROYEK
    // ------------------------------------------------------------
    // 3.1.1 Mengelola CRUD proyek analisis valuasi dengan proteksi Sanctum.
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('proyek/next-code', [ProyekController::class, 'nextCode']);
        Route::delete('proyek/{proyek}/shapefile', [ProyekController::class, 'deleteShapefile']);
        Route::apiResource('proyek', ProyekController::class);

        // ------------------------------------------------------------
        // 3.2 DASHBOARD & DATA MASTER PROYEK
        // ------------------------------------------------------------
        // 3.2.1 Menyajikan ringkasan untuk proyek pada parameter {proyek}.
        Route::get('proyek/{proyek}/dashboard', ProyekDashboardController::class);

        // 3.2.2 Menyajikan dan mengelola Data Master terpadu berbasis wilayah proyek aktif
        Route::get('proyek/{proyek}/data-master', [ProjectDataMasterController::class, 'index']);
        Route::post('proyek/{proyek}/data-master', [ProjectDataMasterController::class, 'store']);
        Route::get('projects/{proyek}/data-master', [ProjectDataMasterController::class, 'index']);
        Route::post('projects/{proyek}/data-master', [ProjectDataMasterController::class, 'store']);
    });

    // ------------------------------------------------------------
    // 3.3 INDEKS
    // ------------------------------------------------------------
    // 3.3.1 Mengelola CRUD nilai indeks yang digunakan dalam analisis.
    Route::apiResource('indexes', IndexController::class);

    // ------------------------------------------------------------
    // 3.4 JENIS TUTUPAN LAHAN
    // ------------------------------------------------------------
    // 3.4.1 Mengelola CRUD dengan binding model jenisTutupanLahan.
    Route::apiResource('jenis-tutupan-lahan', JenisTutupanLahanController::class)->parameters(['jenis-tutupan-lahan' => 'jenisTutupanLahan']);

    // ------------------------------------------------------------
    // 3.5 AREA TERDAMPAK
    // ------------------------------------------------------------
    // 3.5.1 Mengelola CRUD area terdampak dengan binding areaTerdampak.
    Route::apiResource('area-terdampak', AreaTerdampakController::class)->parameters(['area-terdampak' => 'areaTerdampak']);

    // ============================================================
    // BAB 4. EKOSISTEM DAN JASA EKOSISTEM
    // Mengelola ekosistem serta komponen jasa ekosistem.
    // ============================================================

    // ------------------------------------------------------------
    // 4.1 EKOSISTEM
    // ------------------------------------------------------------
    // 4.1.1 Mengelola CRUD master ekosistem.
    Route::apiResource('ekosistem', EkosistemController::class);

    // ------------------------------------------------------------
    // 4.2 JASA PENYEDIAAN
    // ------------------------------------------------------------
    // 4.2.1 Mengelola CRUD dengan binding provisioningService.
    Route::apiResource('provisioning-services', ProvisioningServiceController::class)->parameters(['provisioning-services' => 'provisioningService']);

    // ------------------------------------------------------------
    // 4.3 JASA PENGATURAN
    // ------------------------------------------------------------
    // 4.3.1 Mengelola CRUD dengan binding regulatingService.
    Route::apiResource('regulating-services', RegulatingServiceController::class)->parameters(['regulating-services' => 'regulatingService']);

    // ------------------------------------------------------------
    // 4.4 JASA PENDUKUNG
    // ------------------------------------------------------------
    // 4.4.1 Mengelola CRUD dengan binding supportingService.
    Route::apiResource('supporting-services', SupportingServiceController::class)->parameters(['supporting-services' => 'supportingService']);

    // ------------------------------------------------------------
    // 4.5 JASA BUDAYA
    // ------------------------------------------------------------
    // 4.5.1 Mengelola CRUD dengan binding culturalService.
    Route::apiResource('cultural-services', CulturalServiceController::class)->parameters(['cultural-services' => 'culturalService']);

    // ============================================================
    // BAB 5. VALUASI
    // Menyediakan konfigurasi metode dan hasil valuasi.
    // ============================================================

    // ------------------------------------------------------------
    // 5.1 METODE VALUASI
    // ------------------------------------------------------------
    // 5.1.1 Mengelola CRUD dengan binding metodeValuasi.
    Route::apiResource('metode-valuasi', MetodeValuasiController::class)->parameters(['metode-valuasi' => 'metodeValuasi']);

    // ------------------------------------------------------------
    // 5.2 HASIL VALUASI
    // ------------------------------------------------------------
    // 5.2.1 Mengelola CRUD dengan binding hasilValuasi.
    Route::apiResource('hasil-valuasi', HasilValuasiController::class)->parameters(['hasil-valuasi' => 'hasilValuasi']);

    // ============================================================
    // BAB 6. KECERDASAN BUATAN DAN VALIDASI
    // Menyediakan data referensi, proses AI, dan hasil validasi analis.
    // ============================================================

    // ------------------------------------------------------------
    // 6.1 DATASET REFERENSI
    // ------------------------------------------------------------
    // 6.1.1 Mengelola CRUD dengan binding datasetReferensi.
    Route::apiResource('dataset-referensi', DatasetReferensiController::class)->parameters(['dataset-referensi' => 'datasetReferensi']);

    // ------------------------------------------------------------
    // 6.2 BASIS DATA AI
    // ------------------------------------------------------------
    // 6.2.1 Mengelola CRUD dengan binding basisDataAi.
    Route::apiResource('basis-data-ai', BasisDataAiController::class)->parameters(['basis-data-ai' => 'basisDataAi']);

    // ------------------------------------------------------------
    // 6.3 ANALISIS AI
    // ------------------------------------------------------------
    // 6.3.1 Menyediakan daftar, pembuatan, dan detail dengan binding analisisAi.
    Route::apiResource('analisis-ai', AnalisisAiController::class)->only(['index', 'store', 'show'])->parameters(['analisis-ai' => 'analisisAi']);

    // ------------------------------------------------------------
    // 6.4 HISTORI ANALISIS
    // ------------------------------------------------------------
    // 6.4.1 Menyediakan daftar, pembuatan, dan detail histori analisis.
    Route::apiResource('histori', HistoriController::class)->only(['index', 'store', 'show']);

    // ------------------------------------------------------------
    // 6.5 LAYANAN OPERASIONAL AI
    // Hanya pengguna dengan peran Super Admin atau Peneliti yang dapat mengaksesnya.
    // ------------------------------------------------------------
    Route::middleware(['auth:sanctum', 'role:Super Admin,Peneliti'])
        ->prefix('ai')
        ->group(function (): void {
            // 6.5.1 Menguji ketersediaan integrasi AI.
            Route::get('/test', [AIController::class, 'test']);

            // 6.5.2 Memeriksa kesehatan layanan AI.
            Route::post('/health', [AIController::class, 'health']);

            // 6.5.3 Memproses permintaan pembuatan respons AI.
            Route::post('/generate', [AIController::class, 'generate']);
        });
});

// BAB 7 didefinisikan dalam berkas terpisah untuk modul review dan diskusi.
require __DIR__ . '/api_review.php';

// BAB 8 didefinisikan dalam berkas terpisah untuk modul valuasi ekonomi terintegrasi.
require __DIR__ . '/api_valuation.php';

// BAB 9 didefinisikan dalam berkas terpisah untuk sistem chat dan diskusi interaktif.
require __DIR__ . '/api_chat.php';

