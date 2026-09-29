<?php

namespace Database\Seeders;

use App\Models\Index;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class JenisTutupanLahanSeeder extends Seeder
{
    public function run(): void
    {
        $allIndexes = Index::all();

        foreach ($allIndexes as $index) {
            $name = $index->nama_index;
            $kategori = 'Ekosistem Pesisir';

            $lower = strtolower($name);
            if (str_contains($lower, 'mangrove')) {
                $kategori = 'Mangrove';
            } elseif (str_contains($lower, 'lamun')) {
                $kategori = 'Padang Lamun';
            } elseif (str_contains($lower, 'terumbu') || str_contains($lower, 'karang')) {
                $kategori = 'Terumbu Karang';
            } elseif (str_contains($lower, 'hutan')) {
                $kategori = 'Hutan';
            } elseif (str_contains($lower, 'reklamasi')) {
                $kategori = 'Area Reklamasi';
            } elseif (str_contains($lower, 'semak') || str_contains($lower, 'belukar')) {
                $kategori = 'Semak Belukar';
            } elseif (str_contains($lower, 'terbangun')) {
                $kategori = 'Lahan Terbangun';
            } elseif (str_contains($lower, 'estuari') || str_contains($lower, 'perairan') || str_contains($lower, 'sedimen')) {
                $kategori = 'Estuari & Perairan';
            }

            DB::table('jenis_tutupan_lahan')->updateOrInsert(
                [
                    'id_index' => $index->id_index,
                    'nama_tutupan_lahan' => $name,
                ],
                [
                    'kategori' => $kategori,
                    'luas' => $index->luas,
                    'satuan_luas' => $index->satuan_luas ?? 'Hektar',
                    'deskripsi' => $index->deskripsi ?? 'Tutupan lahan untuk analisis valuasi ekonomi.',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
