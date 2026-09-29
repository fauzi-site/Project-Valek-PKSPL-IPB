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
            $table->decimal('luas', 15, 2)->nullable()->after('longitude');
            $table->string('satuan_luas', 20)->nullable()->after('luas');
            // GeoJSON boundary of the project. JSON keeps the API portable for SQLite tests and PostGIS deployments.
            $table->json('geometry')->nullable()->after('satuan_luas');
            $table->json('shapefile_files')->nullable()->after('geometry');
        });

        Schema::create('indexes', function (Blueprint $table): void {
            $table->id('id_index');
            $table->foreignId('id_proyek')->constrained('proyek', 'id_proyek')->cascadeOnUpdate()->restrictOnDelete();
            $table->string('nama_index', 150);
            $table->string('kode_index', 100);
            $table->decimal('luas', 15, 2)->nullable();
            $table->string('satuan_luas', 20)->nullable();
            $table->json('geometry')->nullable();
            $table->text('deskripsi')->nullable();
            $table->timestamps();

            $table->unique(['id_proyek', 'kode_index']);
            $table->index('id_proyek');
        });

        Schema::create('jenis_tutupan_lahan', function (Blueprint $table): void {
            $table->id('id_jenis_tutupan_lahan');
            $table->foreignId('id_index')->constrained('indexes', 'id_index')->cascadeOnUpdate()->restrictOnDelete();
            $table->string('nama_tutupan_lahan', 150);
            $table->string('kategori', 100)->nullable();
            $table->decimal('luas', 15, 2)->nullable();
            $table->string('satuan_luas', 20)->nullable();
            $table->json('geometry')->nullable();
            $table->text('deskripsi')->nullable();
            $table->timestamps();

            $table->index('id_index');
        });

        foreach (['provisioning_service', 'regulating_service', 'supporting_service', 'cultural_service', 'hasil_valuasi'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->foreignId('id_jenis_tutupan_lahan')
                    ->nullable()
                    ->constrained('jenis_tutupan_lahan', 'id_jenis_tutupan_lahan')
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();
            });
        }

        $this->migrateLegacyAreas();

        foreach (['provisioning_service', 'regulating_service', 'supporting_service', 'cultural_service', 'hasil_valuasi'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropForeign(['id_area']);
                $table->dropColumn('id_area');
            });
        }
    }

    /** Convert pre-hierarchy areas into land-cover records before removing the old foreign keys. */
    private function migrateLegacyAreas(): void
    {
        $indexByProject = [];

        DB::table('area_terdampak')->orderBy('id_area')->each(function (object $area) use (&$indexByProject): void {
            if (! isset($indexByProject[$area->id_proyek])) {
                $indexByProject[$area->id_proyek] = DB::table('indexes')->insertGetId([
                    'id_proyek' => $area->id_proyek,
                    'nama_index' => 'Migrasi Area Lama',
                    'kode_index' => 'LEGACY',
                    'deskripsi' => 'Index otomatis dari area terdampak sebelum refactor tutupan lahan.',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $landCoverId = DB::table('jenis_tutupan_lahan')->insertGetId([
                'id_index' => $indexByProject[$area->id_proyek],
                'nama_tutupan_lahan' => $area->nama_area,
                'kategori' => 'Legacy Area',
                'luas' => $area->luas,
                'satuan_luas' => $area->satuan_luas,
                'geometry' => json_encode([
                    'type' => 'Point',
                    'coordinates' => [(float) $area->longitude, (float) $area->latitude],
                ], JSON_THROW_ON_ERROR),
                'deskripsi' => $area->deskripsi,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach (['provisioning_service', 'regulating_service', 'supporting_service', 'cultural_service', 'hasil_valuasi'] as $tableName) {
                DB::table($tableName)
                    ->where('id_area', $area->id_area)
                    ->update(['id_jenis_tutupan_lahan' => $landCoverId]);
            }
        });
    }

    public function down(): void
    {
        // This restores the old column shape. Data created in the new hierarchy cannot be represented as an area.
        foreach (['provisioning_service', 'regulating_service', 'supporting_service', 'cultural_service', 'hasil_valuasi'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropForeign(['id_jenis_tutupan_lahan']);
                $table->dropColumn('id_jenis_tutupan_lahan');
                $table->foreignId('id_area')->nullable()->constrained('area_terdampak', 'id_area')->cascadeOnUpdate()->restrictOnDelete();
            });
        }

        Schema::dropIfExists('jenis_tutupan_lahan');
        Schema::dropIfExists('indexes');

        Schema::table('proyek', function (Blueprint $table): void {
            $table->dropColumn(['luas', 'satuan_luas', 'geometry', 'shapefile_files']);
        });
    }
};
