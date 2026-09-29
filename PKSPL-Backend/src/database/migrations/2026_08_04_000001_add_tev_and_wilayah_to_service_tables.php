<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'provisioning_service' => ['kategori_tev' => 'DUV', 'default' => 'DUV'],
            'regulating_service' => ['kategori_tev' => 'IUV', 'default' => 'IUV'],
            'supporting_service' => ['kategori_tev' => 'OV', 'default' => 'OV'],
            'cultural_service' => ['kategori_tev' => 'EV', 'default' => 'EV'],
        ];

        foreach ($tables as $tableName => $config) {
            Schema::table($tableName, function (Blueprint $table) use ($config) {
                $table->enum('kategori_tev', ['DUV', 'IUV', 'OV', 'EV', 'BV'])->default($config['default'])->after('nilai');
                $table->foreignId('id_provinsi')->nullable()->after('kategori_tev')->constrained('provinsi', 'id_provinsi')->nullOnDelete()->cascadeOnUpdate();
                $table->foreignId('id_kabupaten_kota')->nullable()->after('id_provinsi')->constrained('kabupaten_kota', 'id_kabupaten_kota')->nullOnDelete()->cascadeOnUpdate();
                $table->foreignId('id_kecamatan')->nullable()->after('id_kabupaten_kota')->constrained('kecamatan', 'id_kecamatan')->nullOnDelete()->cascadeOnUpdate();
                $table->foreignId('id_desa_kelurahan')->nullable()->after('id_kecamatan')->constrained('desa_kelurahan', 'id_desa_kelurahan')->nullOnDelete()->cascadeOnUpdate();
            });
        }
    }

    public function down(): void
    {
        foreach (['provisioning_service', 'regulating_service', 'supporting_service', 'cultural_service'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropForeign(['id_desa_kelurahan']);
                $table->dropForeign(['id_kecamatan']);
                $table->dropForeign(['id_kabupaten_kota']);
                $table->dropForeign(['id_provinsi']);
                $table->dropColumn(['kategori_tev', 'id_provinsi', 'id_kabupaten_kota', 'id_kecamatan', 'id_desa_kelurahan']);
            });
        }
    }
};
