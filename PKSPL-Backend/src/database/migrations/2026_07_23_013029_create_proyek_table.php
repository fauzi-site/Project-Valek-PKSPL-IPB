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
        Schema::create('proyek', function (Blueprint $table) {

            // Primary Key
            $table->id('id_proyek');

            // Foreign Key ke tabel users
            $table->foreignId('id_user')
                ->constrained('users', 'id_user')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // Referensi wilayah proyek.
            $table->foreignId('id_provinsi')
                ->constrained('provinsi', 'id_provinsi')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->foreignId('id_kabupaten_kota')
                ->constrained('kabupaten_kota', 'id_kabupaten_kota')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->foreignId('id_kecamatan')
                ->constrained('kecamatan', 'id_kecamatan')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->foreignId('id_desa_kelurahan')
                ->constrained('desa_kelurahan', 'id_desa_kelurahan')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // Informasi proyek.
            $table->string('nama_proyek', 150);

            $table->text('tujuan_valuasi');

            $table->text('alamat_lengkap')->nullable();

            $table->decimal('latitude', 10, 6)->nullable();

            $table->decimal('longitude', 10, 6)->nullable();

            $table->year('tahun');

            $table->text('deskripsi')->nullable();

            // Status proyek
            $table->enum('status', [
                'Draft',
                'Proses',
                'Selesai',
                'Dibatalkan'
            ])->default('Draft');

            // Timestamp Laravel
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('proyek');
    }
};
