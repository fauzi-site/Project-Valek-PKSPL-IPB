<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Membuat master data desa dan kelurahan per kecamatan.
     */
    public function up(): void
    {
        Schema::create('desa_kelurahan', function (Blueprint $table): void {
            $table->id('id_desa_kelurahan');
            $table->foreignId('id_kecamatan')
                ->constrained('kecamatan', 'id_kecamatan')
                ->cascadeOnUpdate()
                ->restrictOnDelete();
            $table->string('kode_desa_kelurahan');
            $table->string('nama_desa_kelurahan');
            $table->enum('tipe', ['Desa', 'Kelurahan']);
            $table->timestamps();
        });
    }

    /**
     * Menghapus master data desa dan kelurahan saat rollback.
     */
    public function down(): void
    {
        Schema::dropIfExists('desa_kelurahan');
    }
};
