<?php

namespace App\Http\Requests\Project;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

/**
 * Form Request untuk validasi data proyek valuasi ekonomi pesisir dan laut.
 * Menangani validasi bidang dasar, referensi wilayah, geometri, dan berkas shapefile.
 */
class ProyekRequest extends FormRequest
{
    /**
     * Menentukan apakah pengguna diizinkan membuat/mengubah proyek.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Aturan validasi untuk pembuatan (POST) dan pembaruan (PUT/PATCH) proyek.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            // Identifikasi dan referensi wilayah
            'id_user' => ['nullable'],
            'kode_proyek' => ['nullable', 'string', 'max:50'],
            'id_provinsi' => ['nullable', 'integer', 'exists:provinsi,id_provinsi'],
            'id_kabupaten_kota' => ['nullable', 'integer', 'exists:kabupaten_kota,id_kabupaten_kota'],
            'id_kecamatan' => ['nullable', 'integer', 'exists:kecamatan,id_kecamatan'],
            'id_desa_kelurahan' => ['nullable', 'integer', 'exists:desa_kelurahan,id_desa_kelurahan'],

            // Informasi dasar proyek
            'nama_proyek' => [$required, 'string', 'max:150'],
            'tujuan_valuasi' => ['nullable', 'string'],
            'alamat_lengkap' => ['nullable', 'string'],
            'lokasi' => ['nullable', 'string'],
            'location' => ['nullable', 'string'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'luas' => ['nullable', 'numeric'],
            'satuan_luas' => ['nullable', 'string', 'max:20'],
            'geometry' => ['nullable'],

            // Validasi berkas shapefile individual (.shp, .shx, .dbf, .prj, .zip)
            'shp' => ['nullable', function (string $attribute, mixed $value, Closure $fail): void {
                $files = is_array($value) ? $value : [$value];
                foreach ($files as $file) {
                    if ($file instanceof UploadedFile) {
                        if (strtolower($file->getClientOriginalExtension()) !== 'shp') {
                            $fail('Berkas SHP harus berekstensi .shp.');
                        }
                    }
                }
            }],
            'shx' => ['nullable', function (string $attribute, mixed $value, Closure $fail): void {
                $files = is_array($value) ? $value : [$value];
                foreach ($files as $file) {
                    if ($file instanceof UploadedFile) {
                        if (strtolower($file->getClientOriginalExtension()) !== 'shx') {
                            $fail('Berkas SHX harus berekstensi .shx.');
                        }
                    }
                }
            }],
            'dbf' => ['nullable', function (string $attribute, mixed $value, Closure $fail): void {
                $files = is_array($value) ? $value : [$value];
                foreach ($files as $file) {
                    if ($file instanceof UploadedFile) {
                        if (strtolower($file->getClientOriginalExtension()) !== 'dbf') {
                            $fail('Berkas DBF harus berekstensi .dbf.');
                        }
                    }
                }
            }],
            'prj' => ['nullable', function (string $attribute, mixed $value, Closure $fail): void {
                $files = is_array($value) ? $value : [$value];
                foreach ($files as $file) {
                    if ($file instanceof UploadedFile) {
                        if (strtolower($file->getClientOriginalExtension()) !== 'prj') {
                            $fail('Berkas PRJ harus berekstensi .prj.');
                        }
                    }
                }
            }],
            'zip' => ['nullable', function (string $attribute, mixed $value, Closure $fail): void {
                $files = is_array($value) ? $value : [$value];
                foreach ($files as $file) {
                    if ($file instanceof UploadedFile) {
                        if (strtolower($file->getClientOriginalExtension()) !== 'zip') {
                            $fail('Berkas ZIP harus berekstensi .zip.');
                        }
                    }
                }
            }],
            'shapefile_files' => ['nullable'],
            'shapefile_files.*' => ['nullable', function (string $attribute, mixed $value, Closure $fail): void {
                if ($value instanceof UploadedFile) {
                    $ext = strtolower($value->getClientOriginalExtension());
                    if (! in_array($ext, ['shp', 'shx', 'dbf', 'prj', 'zip'])) {
                        $fail('Berkas shapefile harus berekstensi .shp, .shx, .dbf, .prj, atau .zip.');
                    }
                }
            }],

            // Metadata pendukung
            'tahun' => ['nullable', 'integer'],
            'deskripsi' => ['nullable', 'string'],
        ];
    }
}
