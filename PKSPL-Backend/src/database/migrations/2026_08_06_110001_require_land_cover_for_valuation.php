<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['provisioning_service', 'regulating_service', 'supporting_service', 'cultural_service', 'hasil_valuasi'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->unsignedBigInteger('id_jenis_tutupan_lahan')->nullable(false)->change();
            });
        }
    }

    public function down(): void
    {
        foreach (['provisioning_service', 'regulating_service', 'supporting_service', 'cultural_service', 'hasil_valuasi'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->unsignedBigInteger('id_jenis_tutupan_lahan')->nullable()->change();
            });
        }
    }
};
