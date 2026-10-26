<?php

use App\Http\Controllers\Api\V1\Valuation\BenefitController;
use App\Http\Controllers\Api\V1\Valuation\CostController;
use App\Http\Controllers\Api\V1\Valuation\ProjectValuationController;
use App\Http\Controllers\Api\V1\Valuation\SurveyValuationController;
use App\Http\Controllers\Api\V1\Valuation\ValuationDataController;
use App\Http\Controllers\Api\V1\Valuation\ValuationModuleController;
use Illuminate\Support\Facades\Route;

// ============================================================
// BAB 8. VALUASI EKONOMI TERINTEGRASI
// ============================================================
Route::prefix('v1')->middleware('auth:sanctum')->group(function (): void {
    
    // 8.1 MANAJEMEN MODUL VALUASI
    Route::apiResource('valuation-modules', ValuationModuleController::class);

    // 8.2 MANAJEMEN BENEFIT
    Route::apiResource('benefits', BenefitController::class);

    // 8.3 MANAJEMEN COST
    Route::apiResource('costs', CostController::class);

    // 8.4 HASIL KALKULASI PROYEK (NPV, BCR, dll)
    Route::get('proyek/{proyek}/economic-valuation', [ProjectValuationController::class, 'getResults']);

    // 8.4.1 ANALITIK VALUASI PER KATEGORI JASA (Filtered strictly by valuation data)
    Route::get('proyek/{proyek}/valuation/analytics', [ProjectValuationController::class, 'getAnalytics']);

    // 8.6 DATA SURVEI KUESIONER TCM & CVM (Peneliti & Analyst Workflow)
    Route::get('proyek/{proyek}/survey-locations', [SurveyValuationController::class, 'locations']);
    Route::post('proyek/{proyek}/survey-locations/rename', [SurveyValuationController::class, 'renameLocation']);
    Route::get('proyek/{proyek}/tcm-data', [SurveyValuationController::class, 'getTcmData']);
    Route::post('proyek/{proyek}/tcm-data', [SurveyValuationController::class, 'saveTcmRespondent']);
    Route::post('proyek/{proyek}/tcm-data/batch', [SurveyValuationController::class, 'batchTcmRespondents']);
    Route::delete('proyek/{proyek}/tcm-data/{id_tcm}', [SurveyValuationController::class, 'deleteTcmRespondent']);
    Route::get('proyek/{proyek}/tcm-analysis', [SurveyValuationController::class, 'getTcmAnalysis']);

    Route::get('proyek/{proyek}/cvm-data', [SurveyValuationController::class, 'getCvmData']);
    Route::post('proyek/{proyek}/cvm-data', [SurveyValuationController::class, 'saveCvmRespondent']);
    Route::post('proyek/{proyek}/cvm-data/batch', [SurveyValuationController::class, 'batchCvmRespondents']);
    Route::delete('proyek/{proyek}/cvm-data/{id_cvm}', [SurveyValuationController::class, 'deleteCvmRespondent']);
    Route::get('proyek/{proyek}/cvm-analysis', [SurveyValuationController::class, 'getCvmAnalysis']);
});

// ============================================================
// BAB 8.5 VALUATION DATA CORE (Peneliti Workflow)
// ============================================================
Route::middleware('auth:sanctum')->prefix('v1/jenis-tutupan-lahan/{landCoverId}/valuation')->group(function () {
    // Konfigurasi service
    Route::get('configs', [ValuationDataController::class, 'getConfigs']);
    Route::put('configs', [ValuationDataController::class, 'upsertConfigs']);

    // Baris data valuasi
    Route::post('sync-all', [ValuationDataController::class, 'syncAllSections']);
    Route::get('rows', [ValuationDataController::class, 'getRows']);
    Route::post('rows', [ValuationDataController::class, 'addRow']);
    Route::post('rows/batch', [ValuationDataController::class, 'batchImportRows']);
    Route::post('rows/reorder', [ValuationDataController::class, 'reorderRows']);
    Route::put('rows/{rowId}', [ValuationDataController::class, 'updateRow']);
    Route::delete('rows/{rowId}', [ValuationDataController::class, 'deleteRow']);

    // Kolom custom tambahan
    Route::get('custom-columns', [ValuationDataController::class, 'getCustomColumns']);
    Route::post('custom-columns', [ValuationDataController::class, 'addCustomColumn']);
    Route::put('custom-columns/{colId}', [ValuationDataController::class, 'updateCustomColumn']);
    Route::delete('custom-columns/{colId}', [ValuationDataController::class, 'deleteCustomColumn']);
});
