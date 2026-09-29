<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
/** Mengisi area terdampak yang terkait proyek dan ekosistem. */
class AreaTerdampakSeeder extends Seeder { public function run(): void { foreach ([['Sabuk Mangrove Kutuh','Revitalisasi Mangrove Teluk Benoa','Mangrove',-8.821000,115.168000,45.50],['Zona Rekreasi Hutan Kota','Kajian Hutan Kota Jakarta','Hutan Kota',-6.229000,106.807000,12.75],['Karang Tanjung Benoa','Pemantauan Terumbu Karang Bali','Terumbu Karang',-8.756000,115.225000,28.40]] as [$nama,$proyek,$ekosistem,$lat,$lng,$luas]) DB::table('area_terdampak')->updateOrInsert(['nama_area'=>$nama],['id_proyek'=>DB::table('proyek')->where('nama_proyek',$proyek)->value('id_proyek'),'id_ekosistem'=>DB::table('ekosistem')->where('nama_ekosistem',$ekosistem)->value('id_ekosistem'),'latitude'=>$lat,'longitude'=>$lng,'luas'=>$luas,'satuan_luas'=>'Hektar','deskripsi'=>'Area contoh untuk pengukuran jasa ekosistem.']); } }
