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
        Schema::create('provisioning_service', function (Blueprint $table) {

            // ==========================
            // Primary Key
            // ==========================
            $table->id('id_provisioning');

            // ==========================
            // Foreign Key
            // ==========================
            $table->foreignId('id_area')
                ->constrained('area_terdampak', 'id_area')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // ==========================
            // Informasi Provisioning
            // ==========================

            // Nama objek yang dimanfaatkan
            $table->string('nama_objek', 150);

            // Produktivitas objek
            $table->decimal('produktivitas', 15, 4);

            // Harga pasar per satuan
            $table->decimal('harga_pasar', 15, 2);

            // Luas pemanfaatan
            $table->decimal('luas_pemanfaatan', 15, 2);

            // Satuan luas
            $table->string('satuan_luas', 20);

            // Referensi jurnal / dataset
            $table->text('referensi')->nullable();

            // Nilai ekonomi hasil perhitungan
            $table->decimal('nilai', 18, 2)->default(0);

            // Timestamp
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
