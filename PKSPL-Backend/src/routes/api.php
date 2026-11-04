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
use App\Http\Controllers\Api\V1\Admin\AdminResearcherApplicationController;
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
    Route::get('public/projects/map', [ProyekController::class, 'publicMap']);
    Route::get('public/projects/{identifier}', [ProyekController::class, 'publicDetail']);

    // Admin Activity, Master Data & Analytics endpoints (Protected: Super Admin Only)
    Route::middleware(['auth:sanctum', 'role:Super Admin'])->group(function (): void {
        Route::get('admin/activity-logs', [AdminActivityLogController::class, 'index']);
        Route::post('admin/activity-logs', [AdminActivityLogController::class, 'store']);
        Route::get('admin/analytics/overview', [AdminAnalyticsController::class, 'overview']);

        Route::get('admin/master-data', [AdminMasterDataController::class, 'index']);
        Route::post('admin/master-data', [AdminMasterDataController::class, 'store']);
        Route::put('admin/master-data/{category}/{id}', [AdminMasterDataController::class, 'update']);
        Route::delete('admin/master-data/{category}/{id}', [AdminMasterDataController::class, 'destroy']);

        // Permohonan Akun Peneliti (Super Admin Only)
        Route::get('admin/researcher-applications', [AdminResearcherApplicationController::class, 'index']);
        Route::get('admin/researcher-applications/{user}', [AdminResearcherApplicationController::class, 'show']);
        Route::post('admin/researcher-applications/{user}/approve', [AdminResearcherApplicationController::class, 'approve']);
        Route::post('admin/researcher-applications/{user}/reject', [AdminResearcherApplicationController::class, 'reject']);

        Route::get('master-data', [AdminMasterDataController::class, 'index']);
        Route::post('master-data', [AdminMasterDataController::class, 'store']);
        Route::put('master-data/{category}/{id}', [AdminMasterDataController::class, 'update']);
        Route::delete('master-data/{category}/{id}', [AdminMasterDataController::class, 'destroy']);

        Route::apiResource('roles', RoleController::class);
        Route::apiResource('users', UserController::class);

        // Geographic master data mutations
        Route::post('provinsi', [ProvinsiController::class, 'store']);
        Route::put('provinsi/{provinsi}', [ProvinsiController::class, 'update']);
        Route::delete('provinsi/{provinsi}', [ProvinsiController::class, 'destroy']);

        Route::post('kabupaten-kota', [KabupatenKotaController::class, 'store']);
        Route::put('kabupaten-kota/{kabupatenKota}', [KabupatenKotaController::class, 'update']);
        Route::delete('kabupaten-kota/{kabupatenKota}', [KabupatenKotaController::class, 'destroy']);

        Route::post('kecamatan', [KecamatanController::class, 'store']);
        Route::put('kecamatan/{kecamatan}', [KecamatanController::class, 'update']);
        Route::delete('kecamatan/{kecamatan}', [KecamatanController::class, 'destroy']);

        Route::post('desa-kelurahan', [DesaKelurahanController::class, 'store']);
        Route::put('desa-kelurahan/{desaKelurahan}', [DesaKelurahanController::class, 'update']);
        Route::delete('desa-kelurahan/{desaKelurahan}', [DesaKelurahanController::class, 'destroy']);
    });

    // ------------------------------------------------------------
    // 1.1 AUTENTIKASI (PUBLIC)
    // ------------------------------------------------------------
    Route::get('auth/google/redirect', [AuthController::class, 'googleRedirect']);
    Route::get('auth/google/callback', [AuthController::class, 'googleCallback']);
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login'])->name('login');
    Route::get('auth/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])->name('verification.verify');
    Route::post('auth/email/resend', [AuthController::class, 'resendVerificationEmail']);
    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('auth/reset-password', [AuthController::class, 'resetPassword']);

    // ------------------------------------------------------------
    // 1.1.7 AUTHENTICATED USER SESSIONS
    // ------------------------------------------------------------
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('profile', [ProfileController::class, 'update']);
        Route::post('profile/password', [ProfileController::class, 'updatePassword']);
        Route::post('profile/presence', [AuthController::class, 'heartbeat']);

        Route::apiResource('indexes', IndexController::class);
        Route::apiResource('jenis-tutupan-lahan', JenisTutupanLahanController::class)->parameters(['jenis-tutupan-lahan' => 'jenisTutupanLahan']);
        Route::apiResource('area-terdampak', AreaTerdampakController::class)->parameters(['area-terdampak' => 'areaTerdampak']);
        Route::apiResource('ekosistem', EkosistemController::class);
        Route::apiResource('provisioning-services', ProvisioningServiceController::class)->parameters(['provisioning-services' => 'provisioningService']);
        Route::apiResource('regulating-services', RegulatingServiceController::class)->parameters(['regulating-services' => 'regulatingService']);
        Route::apiResource('supporting-services', SupportingServiceController::class)->parameters(['supporting-services' => 'supportingService']);
        Route::apiResource('cultural-services', CulturalServiceController::class)->parameters(['cultural-services' => 'culturalService']);
        Route::apiResource('metode-valuasi', MetodeValuasiController::class)->parameters(['metode-valuasi' => 'metodeValuasi']);
        Route::apiResource('hasil-valuasi', HasilValuasiController::class)->parameters(['hasil-valuasi' => 'hasilValuasi']);
        Route::apiResource('dataset-referensi', DatasetReferensiController::class)->parameters(['dataset-referensi' => 'datasetReferensi']);
        Route::apiResource('basis-data-ai', BasisDataAiController::class)->parameters(['basis-data-ai' => 'basisDataAi']);
        Route::apiResource('analisis-ai', AnalisisAiController::class)->only(['index', 'store', 'show'])->parameters(['analisis-ai' => 'analisisAi']);
        Route::apiResource('histori', HistoriController::class)->only(['index', 'store', 'show']);
    });

    // ------------------------------------------------------------
    // 1.2 PENGUJIAN AKSES BERDASARKAN PERAN
    // ------------------------------------------------------------
    Route::prefix('test')->middleware(['auth:sanctum'])->group(function (): void {
        Route::get('admin', [TestController::class, 'admin'])->middleware('role:Super Admin');
        Route::get('peneliti', [TestController::class, 'peneliti'])->middleware('role:Peneliti');
        Route::get('guest', [TestController::class, 'guest'])->middleware('role:Guest');
    });

    // ------------------------------------------------------------
    // BAB 2. WILAYAH ADMINISTRATIF (PUBLIC LOOKUP READ-ONLY)
    // ------------------------------------------------------------
    Route::get('provinsi', [ProvinsiController::class, 'index']);
    Route::get('provinsi/{provinsi}', [ProvinsiController::class, 'show']);
    Route::get('kabupaten-kota', [KabupatenKotaController::class, 'index']);
    Route::get('kabupaten-kota/{kabupatenKota}', [KabupatenKotaController::class, 'show']);
    Route::get('kecamatan', [KecamatanController::class, 'index']);
    Route::get('kecamatan/{kecamatan}', [KecamatanController::class, 'show']);
    Route::get('desa-kelurahan', [DesaKelurahanController::class, 'index']);
    Route::get('desa-kelurahan/{desaKelurahan}', [DesaKelurahanController::class, 'show']);
    Route::get('boundary-lookup', [BoundaryLookupController::class, 'lookup']);

    // ============================================================
    // BAB 3. PROYEK DAN DATA ANALISIS
    // ============================================================
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('proyek/next-code', [ProyekController::class, 'nextCode']);
        Route::delete('proyek/{proyek}/shapefile', [ProyekController::class, 'deleteShapefile']);
        Route::apiResource('proyek', ProyekController::class);

        Route::get('proyek/{proyek}/dashboard', ProyekDashboardController::class);
        Route::get('proyek/{proyek}/data-master', [ProjectDataMasterController::class, 'index']);
        Route::post('proyek/{proyek}/data-master', [ProjectDataMasterController::class, 'store']);
        Route::put('proyek/{proyek}/data-master/{category}/{id}', [ProjectDataMasterController::class, 'update']);
        Route::delete('proyek/{proyek}/data-master/{category}/{id}', [ProjectDataMasterController::class, 'destroy']);
        Route::post('proyek/{proyek}/data-master/link-land-cover', [ProjectDataMasterController::class, 'linkToLandCover']);
        Route::post('proyek/{proyek}/data-master/apply-template', [ProjectDataMasterController::class, 'applyTemplate']);

        Route::get('projects/{proyek}/data-master', [ProjectDataMasterController::class, 'index']);
        Route::post('projects/{proyek}/data-master', [ProjectDataMasterController::class, 'store']);
        Route::put('projects/{proyek}/data-master/{category}/{id}', [ProjectDataMasterController::class, 'update']);
        Route::delete('projects/{proyek}/data-master/{category}/{id}', [ProjectDataMasterController::class, 'destroy']);
        Route::post('projects/{proyek}/data-master/link-land-cover', [ProjectDataMasterController::class, 'linkToLandCover']);
        Route::post('projects/{proyek}/data-master/apply-template', [ProjectDataMasterController::class, 'applyTemplate']);
    });

    // ------------------------------------------------------------
    // LAYANAN OPERASIONAL AI
    // ------------------------------------------------------------
    Route::middleware(['auth:sanctum', 'role:Super Admin,Peneliti'])
        ->prefix('ai')
        ->group(function (): void {
            Route::get('/test', [AIController::class, 'test']);
            Route::post('/health', [AIController::class, 'health']);
            Route::post('/generate', [AIController::class, 'generate']);
        });
});

// BAB 7 didefinisikan dalam berkas terpisah untuk modul review dan diskusi.
require __DIR__ . '/api_review.php';

// BAB 8 didefinisikan dalam berkas terpisah untuk modul valuasi ekonomi terintegrasi.
require __DIR__ . '/api_valuation.php';

// BAB 9 didefinisikan dalam berkas terpisah untuk sistem chat dan diskusi interaktif.
require __DIR__ . '/api_chat.php';

