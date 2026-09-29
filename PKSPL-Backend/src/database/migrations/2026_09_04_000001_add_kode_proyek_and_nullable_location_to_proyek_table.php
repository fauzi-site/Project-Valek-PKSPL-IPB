<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proyek', function (Blueprint $table): void {
            if (!Schema::hasColumn('proyek', 'kode_proyek')) {
                $table->string('kode_proyek', 50)->nullable()->unique()->after('id_proyek');
            }

            $table->unsignedBigInteger('id_provinsi')->nullable()->change();
            $table->unsignedBigInteger('id_kabupaten_kota')->nullable()->change();
            $table->unsignedBigInteger('id_kecamatan')->nullable()->change();
            $table->unsignedBigInteger('id_desa_kelurahan')->nullable()->change();
        });

        // Backfill existing projects with padded code matching PROJ-001 convention
        $proyeks = DB::table('proyek')->whereNull('kode_proyek')->orderBy('id_proyek')->get();
        foreach ($proyeks as $p) {
            $code = 'PROJ-' . str_pad((string) $p->id_proyek, 3, '0', STR_PAD_LEFT);
            DB::table('proyek')->where('id_proyek', $p->id_proyek)->update(['kode_proyek' => $code]);
        }
    }

    public function down(): void
    {
        Schema::table('proyek', function (Blueprint $table): void {
            if (Schema::hasColumn('proyek', 'kode_proyek')) {
                $table->dropColumn('kode_proyek');
            }
        });
    }
};
