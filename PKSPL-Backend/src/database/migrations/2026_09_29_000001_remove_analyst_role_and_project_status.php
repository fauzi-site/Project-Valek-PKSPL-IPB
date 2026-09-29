<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Drop check constraint and column status from proyek
        DB::statement('ALTER TABLE proyek DROP CONSTRAINT IF EXISTS proyek_status_check');

        if (Schema::hasColumn('proyek', 'status')) {
            Schema::table('proyek', function (Blueprint $table): void {
                $table->dropColumn('status');
            });
        }

        // 2. Drop Analyst-specific validation table
        Schema::dropIfExists('validasi_analyst');

        // 3. Clean up Analyst role, its test users, and associated review/chat references
        $analystRole = DB::table('roles')->where('nama_role', 'Analyst')->first();

        if ($analystRole) {
            $analystUserIds = DB::table('users')
                ->where('id_role', $analystRole->id_role)
                ->pluck('id_user')
                ->toArray();

            if (!empty($analystUserIds)) {
                // Delete comments made by analyst
                if (Schema::hasTable('review_comments')) {
                    DB::table('review_comments')->whereIn('id_user', $analystUserIds)->delete();
                }

                // Delete reviews reviewed by analyst
                if (Schema::hasTable('reviews')) {
                    DB::table('reviews')->whereIn('id_reviewer', $analystUserIds)->delete();
                }

                // Delete messages sent by analyst
                if (Schema::hasTable('messages')) {
                    DB::table('messages')->whereIn('id_sender', $analystUserIds)->delete();
                }

                // Delete conversation participation by analyst
                if (Schema::hasTable('conversation_participants')) {
                    DB::table('conversation_participants')->whereIn('id_user', $analystUserIds)->delete();
                }

                // Delete activity logs by analyst
                if (Schema::hasTable('activity_logs')) {
                    DB::table('activity_logs')->whereIn('id_user', $analystUserIds)->delete();
                }

                // Delete the Analyst users safely
                DB::table('users')->whereIn('id_user', $analystUserIds)->delete();
            }

            // Delete the Analyst role from roles table
            DB::table('roles')->where('id_role', $analystRole->id_role)->delete();
        }

        // 4. Update Admin role name to Super Admin while preserving existing ID and foreign keys
        DB::table('roles')->where('nama_role', 'Admin')->update([
            'nama_role' => 'Super Admin',
            'deskripsi' => 'Role super administrator aplikasi.',
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Re-add status column to proyek
        if (!Schema::hasColumn('proyek', 'status')) {
            Schema::table('proyek', function (Blueprint $table): void {
                $table->string('status', 50)->default('Draft');
            });

            DB::statement("
                ALTER TABLE proyek
                ADD CONSTRAINT proyek_status_check
                CHECK (
                    status::text = ANY (ARRAY[
                        'Draft'::character varying,
                        'Proses'::character varying,
                        'Selesai'::character varying,
                        'Dibatalkan'::character varying,
                        'Submitted'::character varying,
                        'Need Revision'::character varying,
                        'Approved'::character varying,
                        'Published'::character varying
                    ]::text[])
                )
            ");
        }

        // 2. Re-rename Super Admin to Admin
        DB::table('roles')->where('nama_role', 'Super Admin')->update([
            'nama_role' => 'Admin',
            'deskripsi' => 'Role administrator aplikasi.',
            'updated_at' => now(),
        ]);

        // 3. Re-insert Analyst role if not exists
        if (!DB::table('roles')->where('nama_role', 'Analyst')->exists()) {
            DB::table('roles')->insert([
                'id_role' => 2,
                'nama_role' => 'Analyst',
                'deskripsi' => 'Role analyst aplikasi.',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
};
