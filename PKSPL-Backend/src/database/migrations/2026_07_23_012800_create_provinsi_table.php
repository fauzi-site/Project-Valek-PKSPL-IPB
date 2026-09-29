<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Membuat master data provinsi sebelum proyek direferensikan.
     */
    public function up(): void
    {
        Schema::create('provinsi', function (Blueprint $table): void {
            $table->id('id_provinsi');
            $table->string('kode_provinsi');
            $table->string('nama_provinsi');
            $table->timestamps();
        });
    }

    /**
     * Menghapus master data provinsi saat rollback.
     */
    public function down(): void
    {
        Schema::dropIfExists('provinsi');
    }
};
