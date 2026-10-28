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
         Schema::create('hasil_valuasi', function (Blueprint $table) {

            // ==========================
            // Primary Key
            // ==========================
            $table->id('id_hasil');

            // ==========================
            // Foreign Key
            // ==========================

            // Area yang dihitung
            $table->foreignId('id_area')
                ->constrained('area_terdampak', 'id_area')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // Metode valuasi yang digunakan
            $table->foreignId('id_metode')
                ->constrained('metode_valuasi', 'id_metode')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            // ==========================
            // Nilai Komponen TEV
            // ==========================

            // Direct Use Value (DUV)
            $table->decimal('direct_use_value', 18, 2)->default(0);

            // Indirect Use Value (IUV)
            $table->decimal('indirect_use_value', 18, 2)->default(0);

            // Option Value (OV)
            $table->decimal('option_value', 18, 2)->default(0);

            // Existence Value (EV)
            $table->decimal('existence_value', 18, 2)->default(0);

            // Bequest Value (BV)
            $table->decimal('bequest_value', 18, 2)->default(0);

            // Total Economic Value (TEV)
            $table->decimal('tev', 18, 2)->default(0);

            // Tanggal perhitungan
            $table->dateTime('tanggal_hitung');

            // Catatan tambahan
            $table->text('keterangan')->nullable();

            // Timestamp Laravel
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
