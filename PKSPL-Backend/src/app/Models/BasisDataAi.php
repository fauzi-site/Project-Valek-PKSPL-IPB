<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Menyimpan metadata basis pengetahuan yang digunakan AI. */
class BasisDataAi extends Model
{
    protected $table = 'basis_data_ai';
    protected $primaryKey = 'id_basis';
    protected $fillable = ['nama_basis', 'versi', 'deskripsi', 'path_file', 'status', 'jenis_basis', 'model_embedding', 'jumlah_dokumen'];

    /** Mengubah jumlah dokumen menjadi bilangan bulat. */
    protected function casts(): array
    {
        return ['jumlah_dokumen' => 'integer'];
    }

    /** Menggunakan primary key schema untuk route model binding. */
    public function getRouteKeyName(): string
    {
        return 'id_basis';
    }
}
