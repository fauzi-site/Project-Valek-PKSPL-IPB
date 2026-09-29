<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Akun sistem inti: admin, analyst, peneliti, guest
        DB::table('users')
            ->whereIn('email', [
                'admin@gmail.com',
                'analyst@gmail.com',
                'peneliti@gmail.com',
                'guest@gmail.com',
            ])
            ->whereNull('email_verified_at')
            ->update([
                'email_verified_at' => now(),
            ]);

        // 2. Akun historis yang dibuat sebelum atau pada saat fitur verifikasi diterapkan (2026-09-04 23:59:59)
        DB::table('users')
            ->where('created_at', '<=', '2026-09-04 23:59:59')
            ->whereNull('email_verified_at')
            ->update([
                'email_verified_at' => now(),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Tidak melakukan operasi destruktif pada rollback status verifikasi
    }
};
