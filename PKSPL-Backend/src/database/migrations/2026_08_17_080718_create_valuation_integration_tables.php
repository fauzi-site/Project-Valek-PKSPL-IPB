<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Project Valuation Settings
        Schema::create('project_valuation_settings', function (Blueprint $table) {
            $table->increments('id_setting');
            $table->integer('id_proyek')->unsigned();
            $table->integer('base_year')->nullable();
            $table->decimal('discount_rate', 6, 4)->nullable(); // e.g., 0.0500 for 5%
            $table->string('currency', 10)->default('IDR');
            $table->integer('analysis_period')->nullable();
            $table->string('eop_value_basis', 50)->default('net');
            $table->timestamps();

            $table->foreign('id_proyek')->references('id_proyek')->on('proyek')->onDelete('cascade');
        });

        // 2. Valuation Modules (Registry)
        Schema::create('valuation_modules', function (Blueprint $table) {
            $table->increments('id_module');
            $table->integer('id_proyek')->unsigned();
            $table->string('module_type', 100);
            $table->string('name', 150)->nullable();
            $table->text('description')->nullable();
            $table->jsonb('configuration')->nullable();
            $table->jsonb('calculation_result')->nullable();
            $table->timestamps();

            $table->foreign('id_proyek')->references('id_proyek')->on('proyek')->onDelete('cascade');
        });

        // 3. Benefits (Cash flows)
        Schema::create('benefits', function (Blueprint $table) {
            $table->increments('id_benefit');
            $table->integer('id_proyek')->unsigned();
            $table->string('category', 100); // direct_use, indirect_use, non_use
            $table->string('subcategory', 100)->nullable();
            $table->string('ecosystem_service_group', 100)->nullable();
            $table->decimal('value', 20, 2);
            $table->integer('period_year')->nullable();
            $table->decimal('pv_value', 20, 2)->nullable();
            $table->string('data_source', 200)->nullable();
            $table->string('source_module', 100)->nullable();
            $table->integer('source_record_id')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->foreign('id_proyek')->references('id_proyek')->on('proyek')->onDelete('cascade');
        });

        // 4. Costs (Cash flows)
        Schema::create('costs', function (Blueprint $table) {
            $table->increments('id_cost');
            $table->integer('id_proyek')->unsigned();
            $table->string('category', 100); // direct, indirect
            $table->string('subcategory', 100)->nullable();
            $table->string('activity_group', 100)->nullable();
            $table->decimal('value', 20, 2);
            $table->integer('year_applied')->nullable();
            $table->decimal('pv_value', 20, 2)->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->foreign('id_proyek')->references('id_proyek')->on('proyek')->onDelete('cascade');
        });

        // 5. Market Prices (Master)
        Schema::create('market_prices', function (Blueprint $table) {
            $table->increments('id_price');
            $table->integer('id_proyek')->unsigned()->nullable(); // Null = global
            $table->string('commodity_name', 150);
            $table->string('unit', 50);
            $table->decimal('price', 20, 2);
            $table->integer('year')->nullable();
            $table->string('source', 200)->nullable();
            $table->timestamps();

            $table->foreign('id_proyek')->references('id_proyek')->on('proyek')->onDelete('cascade');
        });

        // 6. Environmental Coefficients (Master)
        Schema::create('environmental_coefficients', function (Blueprint $table) {
            $table->increments('id_coefficient');
            $table->string('category', 100);
            $table->string('parameter', 150);
            $table->decimal('value', 15, 6);
            $table->string('unit', 50)->nullable();
            $table->string('source', 200)->nullable();
            $table->timestamps();
        });

        // 7. EOP Data
        Schema::create('eop_data', function (Blueprint $table) {
            $table->increments('id_eop');
            $table->integer('id_proyek')->unsigned();
            $table->integer('id_module')->unsigned()->nullable();
            $table->string('commodity', 150);
            $table->decimal('quantity_before', 20, 4)->nullable();
            $table->decimal('quantity_after', 20, 4)->nullable();
            $table->decimal('output_price', 20, 2)->nullable();
            $table->decimal('production_cost', 20, 2)->nullable();
            $table->decimal('net_value', 20, 2)->nullable();
            $table->string('estimation_method', 100)->nullable();
            $table->timestamps();

            $table->foreign('id_proyek')->references('id_proyek')->on('proyek')->onDelete('cascade');
            $table->foreign('id_module')->references('id_module')->on('valuation_modules')->onDelete('cascade');
        });

        // 8. TCM Data
        Schema::create('tcm_data', function (Blueprint $table) {
            $table->increments('id_tcm');
            $table->integer('id_proyek')->unsigned();
            $table->integer('id_module')->unsigned()->nullable();
            $table->string('respondent_id', 100);
            $table->decimal('distance', 15, 4)->nullable();
            $table->decimal('total_travel_cost', 20, 2)->nullable();
            $table->integer('annual_visits')->nullable();
            $table->decimal('time_cost', 20, 2)->nullable();
            $table->decimal('consumer_surplus', 20, 2)->nullable();
            $table->jsonb('socioeconomic_data')->nullable();
            $table->timestamps();

            $table->foreign('id_proyek')->references('id_proyek')->on('proyek')->onDelete('cascade');
            $table->foreign('id_module')->references('id_module')->on('valuation_modules')->onDelete('cascade');
            $table->unique(['id_proyek', 'respondent_id']);
        });

        // 9. TCM Analyses
        Schema::create('tcm_analyses', function (Blueprint $table) {
            $table->increments('id_tcm_analysis');
            $table->integer('id_proyek')->unsigned();
            $table->integer('id_module')->unsigned()->nullable();
            $table->string('model_type', 100);
            $table->string('dependent_variable', 100);
            $table->jsonb('independent_variables')->nullable();
            $table->jsonb('coefficients')->nullable();
            $table->decimal('consumer_surplus_per_visit', 20, 2)->nullable();
            $table->decimal('total_recreation_value', 20, 2)->nullable();
            $table->decimal('r_squared', 6, 4)->nullable();
            $table->integer('n')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('id_proyek')->references('id_proyek')->on('proyek')->onDelete('cascade');
            $table->foreign('id_module')->references('id_module')->on('valuation_modules')->onDelete('cascade');
        });

        // 10. CVM Data
        Schema::create('cvm_data', function (Blueprint $table) {
            $table->increments('id_cvm');
            $table->integer('id_proyek')->unsigned();
            $table->integer('id_module')->unsigned()->nullable();
            $table->string('respondent_id', 100);
            $table->string('elicitation_format', 100);
            $table->decimal('bid_amount', 20, 2)->nullable();
            $table->boolean('willingness_to_pay')->nullable();
            $table->decimal('wtp_amount', 20, 2)->nullable();
            $table->jsonb('socioeconomic_data')->nullable();
            $table->timestamps();

            $table->foreign('id_proyek')->references('id_proyek')->on('proyek')->onDelete('cascade');
            $table->foreign('id_module')->references('id_module')->on('valuation_modules')->onDelete('cascade');
            $table->unique(['id_proyek', 'respondent_id']);
        });

        // 11. CVM Analyses
        Schema::create('cvm_analyses', function (Blueprint $table) {
            $table->increments('id_cvm_analysis');
            $table->integer('id_proyek')->unsigned();
            $table->integer('id_module')->unsigned()->nullable();
            $table->string('analysis_type', 100);
            $table->integer('population')->nullable();
            $table->jsonb('independent_variables')->nullable();
            $table->jsonb('coefficients')->nullable();
            $table->decimal('median_wtp', 20, 2)->nullable();
            $table->decimal('mean_wtp', 20, 2)->nullable();
            $table->decimal('total_wtp', 20, 2)->nullable();
            $table->integer('n')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('id_proyek')->references('id_proyek')->on('proyek')->onDelete('cascade');
            $table->foreign('id_module')->references('id_module')->on('valuation_modules')->onDelete('cascade');
        });

        // 12. DUV Data
        Schema::create('duv_data', function (Blueprint $table) {
            $table->increments('id_duv');
            $table->integer('id_proyek')->unsigned();
            $table->integer('id_module')->unsigned()->nullable();
            $table->string('value_type', 100);
            $table->text('description')->nullable();
            $table->decimal('quantity', 20, 4)->nullable();
            $table->string('unit', 50)->nullable();
            $table->decimal('unit_price', 20, 2)->nullable();
            $table->decimal('production_cost', 20, 2)->nullable();
            $table->decimal('net_value', 20, 2)->nullable();
            $table->string('source', 200)->nullable();
            $table->timestamps();

            $table->foreign('id_proyek')->references('id_proyek')->on('proyek')->onDelete('cascade');
            $table->foreign('id_module')->references('id_module')->on('valuation_modules')->onDelete('cascade');
        });

        // 13. HPM Data
        Schema::create('hpm_data', function (Blueprint $table) {
            $table->increments('id_hpm');
            $table->integer('id_proyek')->unsigned();
            $table->integer('id_module')->unsigned()->nullable();
            $table->string('property_id', 100)->nullable();
            $table->decimal('transaction_price', 20, 2);
            $table->decimal('env_quality', 15, 6)->nullable();
            $table->decimal('lot_size', 15, 4)->nullable();
            $table->integer('rooms')->nullable();
            $table->jsonb('characteristics')->nullable();
            $table->timestamps();

            $table->foreign('id_proyek')->references('id_proyek')->on('proyek')->onDelete('cascade');
            $table->foreign('id_module')->references('id_module')->on('valuation_modules')->onDelete('cascade');
        });

        // 14. ABM Data
        Schema::create('abm_data', function (Blueprint $table) {
            $table->increments('id_abm');
            $table->integer('id_proyek')->unsigned();
            $table->integer('id_module')->unsigned()->nullable();
            $table->string('risk_type', 100);
            $table->decimal('averting_expenditure', 20, 2)->nullable();
            $table->decimal('lost_income', 20, 2)->nullable();
            $table->integer('affected_households')->nullable();
            $table->decimal('total_value', 20, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('id_proyek')->references('id_proyek')->on('proyek')->onDelete('cascade');
            $table->foreign('id_module')->references('id_module')->on('valuation_modules')->onDelete('cascade');
        });

        // 15. CE Data
        Schema::create('ce_data', function (Blueprint $table) {
            $table->increments('id_ce');
            $table->integer('id_proyek')->unsigned();
            $table->integer('id_module')->unsigned()->nullable();
            $table->string('respondent_id', 100);
            $table->string('scenario_title', 150);
            $table->string('chosen_alternative', 100);
            $table->jsonb('attributes')->nullable();
            $table->decimal('coefficient', 15, 6)->nullable();
            $table->decimal('cost_coefficient', 15, 6)->nullable();
            $table->decimal('implicit_price', 20, 2)->nullable();
            $table->timestamps();

            $table->foreign('id_proyek')->references('id_proyek')->on('proyek')->onDelete('cascade');
            $table->foreign('id_module')->references('id_module')->on('valuation_modules')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ce_data');
        Schema::dropIfExists('abm_data');
        Schema::dropIfExists('hpm_data');
        Schema::dropIfExists('duv_data');
        Schema::dropIfExists('cvm_analyses');
        Schema::dropIfExists('cvm_data');
        Schema::dropIfExists('tcm_analyses');
        Schema::dropIfExists('tcm_data');
        Schema::dropIfExists('eop_data');
        Schema::dropIfExists('environmental_coefficients');
        Schema::dropIfExists('market_prices');
        Schema::dropIfExists('costs');
        Schema::dropIfExists('benefits');
        Schema::dropIfExists('valuation_modules');
        Schema::dropIfExists('project_valuation_settings');
    }
};
