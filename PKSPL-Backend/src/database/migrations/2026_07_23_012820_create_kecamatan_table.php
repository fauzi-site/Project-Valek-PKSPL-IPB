<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Membuat master data kecamatan per kabupaten atau kota.
     */
    public function up(): void
    {
        Schema::create('kecamatan', function (Blueprint $table): void {
            $table->id('id_kecamatan');
            $table->foreignId('id_kabupaten_kota')
                ->constrained('kabupaten_kota', 'id_kabupaten_kota')
                ->cascadeOnUpdate()
                ->restrictOnDelete();
            $table->string('kode_kecamatan');
            $table->string('nama_kecamatan');
            $table->timestamps();
        });
    }

    /**
     * Menghapus master data kecamatan saat rollback.
     */
    public function down(): void
    {
        Schema::dropIfExists('kecamatan');
    }
};
