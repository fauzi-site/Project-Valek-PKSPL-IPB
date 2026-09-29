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
        // ==========================
        // Tabel master ekosistem valuasi
        // ==========================
        Schema::create('valuasi_ekosistems', function (Blueprint $table) {
            $table->id();
            $table->string('nama_ekosistem', 200);
            $table->decimal('tev_ekosistem', 20, 2)->default(0)->comment('Total Economic Value (Rp)');
            $table->timestamps();
        });

        // ==========================
        // Tabel kategori jasa ekosistem per ekosistem
        // ==========================
        Schema::create('valuasi_kategori_jasas', function (Blueprint $table) {
            $table->id();

            $table->foreignId('valuasi_ekosistem_id')
                ->constrained('valuasi_ekosistems')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->string('nama_kategori', 100)->comment('Provisioning, Regulating, Supporting, Cultural');
            $table->string('kode_kategori', 10)->comment('A, B, C, D');
            $table->decimal('subtotal_kategori', 20, 2)->default(0)->comment('Subtotal jasa per kategori (Rp)');
            $table->timestamps();
        });

        // ==========================
        // Tabel item valuasi per kategori jasa
        // ==========================
        Schema::create('valuasi_item_valuasis', function (Blueprint $table) {
            $table->id();

            $table->foreignId('valuasi_kategori_jasa_id')
                ->constrained('valuasi_kategori_jasas')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            // Kode item (A.1.1, B.2, dst)
            $table->string('no', 20);

            // Nama item
            $table->string('nama_item', 200);

            // Nama latin — hanya relevan untuk Provisioning (Flora/Fauna)
            $table->string('nama_latin', 200)->nullable();

            // Nama daerah — hanya relevan untuk Provisioning
            $table->string('nama_daerah', 200)->nullable();

            // Nilai ekonomi (Rp)
            $table->decimal('total_nilai_ekonomi', 20, 2)->default(0);

            // Kategori jenis jasa
            $table->enum('kategori', [
                'provisioning_flora',
                'provisioning_fauna',
                'regulating',
                'supporting',
                'cultural',
            ]);

            $table->timestamps();
        });

        // ==========================
        // Tabel ringkasan indeks ekosistem
        // ==========================
        Schema::create('index_ekosistem_summary', function (Blueprint $table) {
            $table->id();
            $table->string('nama_ekosistem', 200);
            $table->string('kategori', 50)->comment('Provisioning, Regulating, Supporting, Cultural');
            $table->decimal('jumlah_rp', 20, 2)->default(0)->comment('Subtotal per kategori (Rp)');
            $table->decimal('tev_total', 20, 2)->default(0)->comment('TEV total semua kategori (Rp)');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('index_ekosistem_summary');
        Schema::dropIfExists('valuasi_item_valuasis');
        Schema::dropIfExists('valuasi_kategori_jasas');
        Schema::dropIfExists('valuasi_ekosistems');
    }
};

