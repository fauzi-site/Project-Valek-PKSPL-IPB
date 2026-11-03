<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Menyimpan kategori biota (flora/fauna) dan satuan hasil pada master provisioning,
 * sehingga tidak lagi ditebak dari kata kunci nama.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provisioning_service', function (Blueprint $table) {
            $table->string('jenis_biota', 10)->nullable()->after('nama_daerah');
            $table->string('satuan_hasil', 30)->nullable()->after('jenis_biota');
        });
    }

    public function down(): void
    {
        Schema::table('provisioning_service', function (Blueprint $table) {
            $table->dropColumn(['jenis_biota', 'satuan_hasil']);
        });
    }
};
