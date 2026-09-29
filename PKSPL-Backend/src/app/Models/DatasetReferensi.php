<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Menyimpan metadata dataset referensi aplikasi. */
class DatasetReferensi extends Model
{
    protected $table = 'dataset_referensi';
    protected $primaryKey = 'id_dataset';
    protected $fillable = ['nama_dataset', 'kategori', 'tahun', 'file_dataset', 'tipe_file', 'sumber', 'deskripsi', 'status'];

    /** Mengubah tahun dataset menjadi bilangan bulat. */
    protected function casts(): array
    {
        return ['tahun' => 'integer'];
    }

    /** Menggunakan primary key schema untuk route model binding. */
    public function getRouteKeyName(): string
    {
        return 'id_dataset';
    }
}
