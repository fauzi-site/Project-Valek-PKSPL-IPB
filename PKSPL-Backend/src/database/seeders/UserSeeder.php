<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Mengisi akun contoh untuk setiap role aplikasi PKSPL IPB University.
 */
class UserSeeder extends Seeder
{
    /**
     * Menyimpan akun pengembangan dengan role yang konsisten.
     */
    public function run(): void
    {
        $users = [
            ['admin@gmail.com', 'Super Admin PKSPL', Role::SUPER_ADMIN],
            ['peneliti@gmail.com', 'Bima Saputra', Role::PENELITI],
            ['demo.retno@pkspl.ipb.ac.id', 'Dr. Ir. Retno Wulandari, M.Si.', Role::PENELITI],
            ['demo.fauzi@pkspl.ipb.ac.id', 'Dr. Ahmad Fauzi, S.Kel., M.Sc.', Role::PENELITI],
            ['demo.wayan@pkspl.ipb.ac.id', 'Prof. Dr. Wayan Sudarma, M.Env.', Role::PENELITI],
            ['demo.siti@pkspl.ipb.ac.id', 'Dr. Siti Nurhaliza, M.Si.', Role::PENELITI],
            ['demo.hendra@pkspl.ipb.ac.id', 'Dr. Hendra Gunawan, S.Kel., M.Si.', Role::PENELITI],
            ['peneliti.antam@pkspl.ipb.ac.id', 'Peneliti PT Antam (Tbk)', Role::PENELITI],
            ['peneliti@antam.com', 'Peneliti Reklamasi Antam', Role::PENELITI],
            ['guest@gmail.com', 'Tamu PKSPL', Role::GUEST],
        ];

        foreach ($users as [$email, $nama, $role]) {
            User::query()->updateOrCreate(
                ['email' => $email],
                [
                    'id_role' => Role::query()
                        ->where('nama_role', $role)
                        ->valueOrFail('id_role'),
                    'nama' => $nama,
                    'password' => Hash::make('password'),
                    'status' => 'Aktif',
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}
