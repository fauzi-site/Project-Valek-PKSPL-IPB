<?php

namespace Database\Seeders;

use App\Models\Proyek;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ValuationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = Carbon::now();
        $proyekList = Proyek::all();

        if ($proyekList->isEmpty()) {
            $this->command->warn('Tidak ada data Proyek. ValuationSeeder dilewati.');
            return;
        }

        foreach ($proyekList as $proyek) {
            $idProyek = $proyek->id_proyek;

            // 1. Project Valuation Settings
            DB::table('project_valuation_settings')->updateOrInsert(
                ['id_proyek' => $idProyek],
                [
                    'base_year' => $proyek->tahun ?: 2026,
                    'discount_rate' => 0.0500,
                    'currency' => 'IDR',
                    'analysis_period' => 10,
                    'eop_value_basis' => 'net',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );

            // 2. Valuation Modules
            $moduleTcm = DB::table('valuation_modules')
                ->where('id_proyek', $idProyek)
                ->where('module_type', 'tcm')
                ->first();

            if (!$moduleTcm) {
                $moduleIdTcm = DB::table('valuation_modules')->insertGetId([
                    'id_proyek' => $idProyek,
                    'module_type' => 'tcm',
                    'name' => 'TCM Kawasan ' . $proyek->nama_proyek,
                    'description' => 'Analisis Travel Cost Method untuk rekreasi dan valuasi jasa budaya ekosistem',
                    'created_at' => $now,
                    'updated_at' => $now,
                ], 'id_module');
            } else {
                $moduleIdTcm = $moduleTcm->id_module;
            }

            $moduleEop = DB::table('valuation_modules')
                ->where('id_proyek', $idProyek)
                ->where('module_type', 'eop')
                ->first();

            if (!$moduleEop) {
                $moduleIdEop = DB::table('valuation_modules')->insertGetId([
                    'id_proyek' => $idProyek,
                    'module_type' => 'eop',
                    'name' => 'EOP Produksi Hayati ' . $proyek->nama_proyek,
                    'description' => 'Analisis Effect on Production hasil perikanan dan biomasa lokal',
                    'created_at' => $now,
                    'updated_at' => $now,
                ], 'id_module');
            } else {
                $moduleIdEop = $moduleEop->id_module;
            }

            // 3. EOP Data
            DB::table('eop_data')->updateOrInsert(
                ['id_proyek' => $idProyek, 'id_module' => $moduleIdEop, 'commodity' => 'Hasil Tangkapan & Biomasa'],
                [
                    'quantity_before' => 1200.00,
                    'quantity_after' => 1550.00,
                    'output_price' => 35000.00,
                    'production_cost' => 7500000.00,
                    'net_value' => 35000000.00,
                    'estimation_method' => 'Market Price',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );

            // 4. TCM Data
            DB::table('tcm_data')->updateOrInsert(
                ['id_proyek' => $idProyek, 'id_module' => $moduleIdTcm, 'respondent_id' => 'R-001'],
                [
                    'distance' => 18.5,
                    'total_travel_cost' => 65000.00,
                    'annual_visits' => 5,
                    'time_cost' => 30000.00,
                    'consumer_surplus' => 150000.00,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );

            // 5. TCM Analysis
            DB::table('tcm_analyses')->updateOrInsert(
                ['id_proyek' => $idProyek, 'id_module' => $moduleIdTcm],
                [
                    'model_type' => 'poisson',
                    'dependent_variable' => 'annual_visits',
                    'consumer_surplus_per_visit' => 35000.00,
                    'total_recreation_value' => 250000000.00,
                    'r_squared' => 0.8800,
                    'n' => 120,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );

            // 6. Benefits
            DB::table('benefits')->updateOrInsert(
                ['id_proyek' => $idProyek, 'category' => 'direct_use', 'subcategory' => 'production'],
                [
                    'ecosystem_service_group' => 'provisioning',
                    'value' => 35000000.00,
                    'period_year' => null,
                    'pv_value' => null,
                    'data_source' => 'EOP Hasil Tangkapan & Biomasa',
                    'source_module' => 'eop',
                    'source_record_id' => null,
                    'description' => 'Nilai tambah produksi perikanan dan biomasa',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );

            DB::table('benefits')->updateOrInsert(
                ['id_proyek' => $idProyek, 'category' => 'direct_use', 'subcategory' => 'recreation'],
                [
                    'ecosystem_service_group' => 'cultural',
                    'value' => 250000000.00,
                    'period_year' => null,
                    'pv_value' => null,
                    'data_source' => 'TCM Kawasan ' . $proyek->nama_proyek,
                    'source_module' => 'tcm',
                    'source_record_id' => null,
                    'description' => 'Nilai rekreasi dan jasa budaya tahunan',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );

            // 7. Costs
            DB::table('costs')->updateOrInsert(
                ['id_proyek' => $idProyek, 'category' => 'direct', 'subcategory' => 'maintenance'],
                [
                    'activity_group' => 'operasional',
                    'value' => 15000000.00,
                    'year_applied' => null,
                    'pv_value' => null,
                    'description' => 'Biaya operasional tahunan pengawasan dan konservasi ekosistem',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }

        $this->command->info('Data valuasi berhasil dibuat untuk seluruh proyek (ValuationSeeder).');
    }
}
