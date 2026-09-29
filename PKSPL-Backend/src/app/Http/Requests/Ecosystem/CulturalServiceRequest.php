<?php

namespace App\Http\Requests\Ecosystem;

use Illuminate\Foundation\Http\FormRequest;

/** Memvalidasi data jasa budaya dari request API. */
class CulturalServiceRequest extends FormRequest
{
    /** Mengizinkan request karena otorisasi belum diterapkan. */
    public function authorize(): bool { return true; }

    /** Menetapkan aturan validasi jasa budaya. */
    public function rules(): array
    {
        // Menyesuaikan kolom wajib antara pembuatan dan pembaruan data.
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'id_jenis_tutupan_lahan' => [$required, 'integer', 'exists:jenis_tutupan_lahan,id_jenis_tutupan_lahan'],
            'nama_aktivitas' => [$required, 'string', 'max:150'],
            'jumlah_pengunjung' => [$required, 'numeric', 'decimal:0,2'],
            'biaya_perjalanan' => [$required, 'numeric', 'decimal:0,2'],
            'frekuensi' => [$required, 'numeric', 'decimal:0,2'],
            'referensi' => ['nullable', 'string'],
            'nilai' => [$required, 'numeric', 'decimal:0,2'],
            'kategori_tev' => ['nullable', 'sometimes', 'in:DUV,IUV,OV,EV,BV'],
            'id_provinsi' => ['nullable', 'sometimes', 'integer', 'exists:provinsi,id_provinsi'],
            'id_kabupaten_kota' => ['nullable', 'sometimes', 'integer', 'exists:kabupaten_kota,id_kabupaten_kota'],
            'id_kecamatan' => ['nullable', 'sometimes', 'integer', 'exists:kecamatan,id_kecamatan'],
            'id_desa_kelurahan' => ['nullable', 'sometimes', 'integer', 'exists:desa_kelurahan,id_desa_kelurahan'],
        ];
    }
}
