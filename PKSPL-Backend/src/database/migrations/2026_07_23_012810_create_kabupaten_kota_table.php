<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Membuat master data kabupaten dan kota per provinsi.
     */
    public function up(): void
    {
        Schema::create('kabupaten_kota', function (Blueprint $table): void {
            $table->id('id_kabupaten_kota');
            $table->foreignId('id_provinsi')
                ->constrained('provinsi', 'id_provinsi')
                ->cascadeOnUpdate()
                ->restrictOnDelete();
            $table->string('kode_kabupaten_kota');
            $table->string('nama_kabupaten_kota');
            $table->enum('tipe', ['Kabupaten', 'Kota']);
            $table->timestamps();
        });
    }

    /**
     * Menghapus master data kabupaten dan kota saat rollback.
     */
    public function down(): void
    {
        Schema::dropIfExists('kabupaten_kota');
    }
};
