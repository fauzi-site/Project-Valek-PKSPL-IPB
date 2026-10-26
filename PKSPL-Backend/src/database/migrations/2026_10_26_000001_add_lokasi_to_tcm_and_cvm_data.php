<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Survey respondents belong to a tourism location (e.g. Pulau Pramuka), not just
 * to a project. Respondent IDs restart at 1 for each location, so uniqueness is
 * per (project, location, respondent). Existing rows keep a NULL location.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['tcm_data', 'cvm_data'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->string('lokasi', 150)->nullable()->after('id_module');
                $table->dropUnique("{$tableName}_id_proyek_respondent_id_unique");
                $table->unique(['id_proyek', 'lokasi', 'respondent_id']);
            });
        }
    }

    public function down(): void
    {
        foreach (['tcm_data', 'cvm_data'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->dropUnique("{$tableName}_id_proyek_lokasi_respondent_id_unique");
                $table->unique(['id_proyek', 'respondent_id']);
                $table->dropColumn('lokasi');
            });
        }
    }
};
