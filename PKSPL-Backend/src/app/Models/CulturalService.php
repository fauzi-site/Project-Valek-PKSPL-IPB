<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Menyimpan nilai jasa budaya pada area terdampak. */
class CulturalService extends Model
{
    protected $table = 'cultural_service';
    protected $primaryKey = 'id_cultural';
    protected $fillable = ['id_jenis_tutupan_lahan', 'nama_aktivitas', 'jumlah_pengunjung', 'biaya_perjalanan', 'frekuensi', 'referensi', 'nilai', 'kategori_tev', 'id_provinsi', 'id_kabupaten_kota', 'id_kecamatan', 'id_desa_kelurahan'];

    /** Mengubah nilai pengukuran jasa budaya ke presisi numerik. */
    protected function casts(): array
    {
        return ['jumlah_pengunjung' => 'decimal:2', 'biaya_perjalanan' => 'decimal:2', 'frekuensi' => 'decimal:2', 'nilai' => 'decimal:2'];
    }

    /** Menggunakan primary key schema untuk route model binding. */
    public function getRouteKeyName(): string
    {
        return 'id_cultural';
    }

    /** Jasa budaya terkait dengan satu jenis tutupan lahan. */
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
