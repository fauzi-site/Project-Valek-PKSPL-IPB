<?php

use App\Http\Controllers\Api\V1\AnalisisAiController;
use App\Http\Controllers\Api\V1\AreaTerdampakController;
use App\Http\Controllers\Api\V1\BasisDataAiController;
use App\Http\Controllers\Api\V1\CulturalServiceController;
use App\Http\Controllers\Api\V1\DatasetReferensiController;
use App\Http\Controllers\Api\V1\EkosistemController;
use App\Http\Controllers\Api\V1\HasilValuasiController;
use App\Http\Controllers\Api\V1\HistoriController;
use App\Http\Controllers\Api\V1\KabupatenKotaController;
use App\Http\Controllers\Api\V1\KecamatanController;
use App\Http\Controllers\Api\V1\MetodeValuasiController;
use App\Http\Controllers\Api\V1\ProyekController;
use App\Http\Controllers\Api\V1\ProvisioningServiceController;
use App\Http\Controllers\Api\V1\ProvinsiController;
use App\Http\Controllers\Api\V1\RegulatingServiceController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\SupportingServiceController;
use App\Http\Controllers\Api\V1\TestController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\AIController;
use App\Http\Controllers\Api\V1\ValidasiAnalystController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('auth/google/redirect', [AuthController::class, 'googleRedirect']);
    Route::get('auth/google/callback', [AuthController::class, 'googleCallback']);
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);
    });

    Route::prefix('test')->middleware(['auth:sanctum'])->group(function (): void {
        Route::get('admin', [TestController::class, 'admin'])->middleware('role:Administrator');
        Route::get('analyst', [TestController::class, 'analyst'])->middleware('role:Analyst');
        Route::get('peneliti', [TestController::class, 'peneliti'])->middleware('role:Peneliti');
        Route::get('guest', [TestController::class, 'guest'])->middleware('role:Guest');
    });
    // CRUD role dibatasi oleh RoleRequest pada empat nama role yang disepakati.
    Route::apiResource('roles', RoleController::class);
    Route::apiResource('users', UserController::class);
    Route::apiResource('provinsi', ProvinsiController::class);
    Route::apiResource('kabupaten-kota', KabupatenKotaController::class)->parameters(['kabupaten-kota' => 'kabupatenKota']);
    Route::apiResource('kecamatan', KecamatanController::class);
    Route::apiResource('proyek', ProyekController::class);
    Route::apiResource('ekosistem', EkosistemController::class);
    Route::apiResource('area-terdampak', AreaTerdampakController::class)->parameters(['area-terdampak' => 'areaTerdampak']);
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
    Route::apiResource('validasi-analyst', ValidasiAnalystController::class)->parameters(['validasi-analyst' => 'validasiAnalyst']);

    Route::middleware(['auth:sanctum','role:Admin,Analyst,Peneliti'])
        ->prefix('ai')
        ->group(function (): void {
            Route::get('/test', [AIController::class, 'test']);
            Route::post('/health', [AIController::class, 'health']);
            Route::post('/generate', [AIController::class, 'generate']);
        });
});
