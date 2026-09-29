<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Mengisi hasil valuasi, analisis AI, histori, dan validasi contoh. */
class ProsesAnalisisSeeder extends Seeder
{
    /** Menyimpan data proses yang memiliki referensi valid ke proyek dan user. */
    public function run(): void
    {
        $peneliti = DB::table('users')->where('email', 'peneliti@gmail.com')->value('id_user');
        $metode = DB::table('metode_valuasi')->where('nama_metode', 'Harga Pasar')->value('id_metode');

        foreach (DB::table('jenis_tutupan_lahan')->get() as $tutupanLahan) {
            DB::table('hasil_valuasi')->updateOrInsert(['id_jenis_tutupan_lahan' => $tutupanLahan->id_jenis_tutupan_lahan, 'id_metode' => $metode], ['direct_use_value' => 218750, 'indirect_use_value' => 150000000, 'option_value' => 25000000, 'existence_value' => 50000000, 'bequest_value' => 15000000, 'tev' => 240218750, 'tanggal_hitung' => now(), 'keterangan' => 'Nilai contoh berdasarkan data seeder.']);
        }

        $tipeList = ['Ringkasan', 'Rekomendasi', 'Prediksi'];
        $pertanyaanList = [
            'Apa manfaat utama ekosistem pada area ini?',
            'Tindakan pengelolaan apa yang perlu diprioritaskan?',
            'Bagaimana kecenderungan nilai ekonomi area ini?',
        ];

        foreach (DB::table('proyek')->orderBy('id_proyek')->get() as $index => $proyek) {
            $tipe = $tipeList[$index % count($tipeList)];
            $pertanyaan = $pertanyaanList[$index % count($pertanyaanList)];
            DB::table('analisis_ai')->updateOrInsert(['id_proyek' => $proyek->id_proyek, 'id_user' => $peneliti, 'pertanyaan' => $pertanyaan], ['jawaban' => 'Analisis contoh menggunakan data proyek, area terdampak, dan referensi yang tersedia.', 'sumber_data' => 'Knowledge Base Valuasi Ekosistem', 'tipe_analisis' => $tipe]);
            DB::table('histori')->updateOrInsert(['id_user' => $peneliti, 'id_proyek' => $proyek->id_proyek, 'aktivitas' => 'Membuat proyek valuasi'], ['keterangan' => 'Proyek contoh dibuat melalui proses seeding.']);
        }
    }
}
