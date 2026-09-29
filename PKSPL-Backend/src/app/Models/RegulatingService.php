<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Menyimpan nilai jasa pengaturan pada area terdampak. */
class RegulatingService extends Model
{
    protected $table = 'regulating_service';
    protected $primaryKey = 'id_regulating';
    protected $fillable = ['id_jenis_tutupan_lahan', 'jenis_regulating', 'indikator', 'satuan', 'nilai_indikator', 'referensi', 'nilai', 'kategori_tev', 'id_provinsi', 'id_kabupaten_kota', 'id_kecamatan', 'id_desa_kelurahan'];

    /** Mengubah nilai indikator dan ekonomi ke presisi numerik. */
    protected function casts(): array
    {
        return ['nilai_indikator' => 'decimal:4', 'nilai' => 'decimal:2'];
    }

    /** Menggunakan primary key schema untuk route model binding. */
    public function getRouteKeyName(): string
    {
        return 'id_regulating';
    }

    /** Jasa pengaturan terkait dengan satu jenis tutupan lahan. */
    public function jenisTutupanLahan(): BelongsTo
    {
        return $this->belongsTo(JenisTutupanLahan::class, 'id_jenis_tutupan_lahan', 'id_jenis_tutupan_lahan');
    }

    public function provinsi(): BelongsTo
    {
        return $this->belongsTo(Provinsi::class, 'id_provinsi', 'id_provinsi');
    }

    public function kabupatenKota(): BelongsTo
    {
        return $this->belongsTo(KabupatenKota::class, 'id_kabupaten_kota', 'id_kabupaten_kota');
    }

    public function kecamatan(): BelongsTo
    {
        return $this->belongsTo(Kecamatan::class, 'id_kecamatan', 'id_kecamatan');
    }

    public function desaKelurahan(): BelongsTo
    {
        return $this->belongsTo(DesaKelurahan::class, 'id_desa_kelurahan', 'id_desa_kelurahan');
    }
}
