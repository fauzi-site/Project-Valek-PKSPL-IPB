<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Mengisi kabupaten atau kota sesuai provinsi induknya. */
class KabupatenKotaSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([['3171', 'Kota Jakarta Selatan', 'Kota', '31'], ['3204', 'Kabupaten Bandung', 'Kabupaten', '32'], ['3273', 'Kota Bandung', 'Kota', '32'], ['5103', 'Kabupaten Badung', 'Kabupaten', '51']] as [$kode, $nama, $tipe, $provinsi]) {
            DB::table('kabupaten_kota')->updateOrInsert(['kode_kabupaten_kota' => $kode], ['id_provinsi' => DB::table('provinsi')->where('kode_provinsi', $provinsi)->value('id_provinsi'), 'nama_kabupaten_kota' => $nama, 'tipe' => $tipe]);
        }

        // Sinkronkan seluruh kabupaten/kota dari administrative_boundaries jika tersedia
        if (\Illuminate\Support\Facades\Schema::hasTable('administrative_boundaries')) {
            $boundaries = DB::table('administrative_boundaries')->where('level', 2)->get();
            $provMap = DB::table('provinsi')->pluck('id_provinsi', 'kode_provinsi')->all();
            foreach ($boundaries as $b) {
                $provCode = substr($b->code, 0, 2);
                $provId = $provMap[$provCode] ?? null;
                if ($provId) {
                    $isKota = (strlen($b->code) >= 3 && substr($b->code, 2, 1) === '7') || str_starts_with(strtolower($b->name), 'kota');
                    $tipe = $isKota ? 'Kota' : 'Kabupaten';
                    $cleanName = preg_replace('/^(Kabupaten|Kota)\s+/i', '', trim($b->name));
                    $fullName = ($tipe === 'Kota' ? 'Kota ' : 'Kabupaten ') . $cleanName;
                    DB::table('kabupaten_kota')->updateOrInsert(
                        ['kode_kabupaten_kota' => $b->code],
                        [
                            'id_provinsi' => $provId,
                            'nama_kabupaten_kota' => $fullName,
                            'tipe' => $tipe,
                        ]
                    );
                }
            }
        }
    }
}
