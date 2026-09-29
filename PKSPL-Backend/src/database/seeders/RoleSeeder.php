<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Mengisi empat role tetap yang digunakan aplikasi.
 *
 * Seeder menggunakan upsert agar aman dijalankan berulang tanpa membuat role
 * duplikat atau mengubah primary key yang telah dipakai user.
 */
class RoleSeeder extends Seeder
{
    /**
     * Menyimpan role admin, analyst, peneliti, dan guest.
     */
    public function run(): void
    {
        $timestamp = now();

        Role::query()->upsert([
            [
                'nama_role' => Role::SUPER_ADMIN,
                'deskripsi' => 'Role super administrator aplikasi.',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'nama_role' => Role::PENELITI,
                'deskripsi' => 'Role peneliti aplikasi.',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'nama_role' => Role::GUEST,
                'deskripsi' => 'Pengunjung yang hanya melihat data sesuai kebijakan akses.',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
        ], ['nama_role'], ['deskripsi', 'updated_at']);
    }
}
