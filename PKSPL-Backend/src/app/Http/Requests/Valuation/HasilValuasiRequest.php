<?php

namespace App\Http\Requests\Valuation;

use Illuminate\Foundation\Http\FormRequest;

/** Memvalidasi data hasil valuasi dari request API. */
class HasilValuasiRequest extends FormRequest
{
    /** Mengizinkan request karena otorisasi belum diterapkan. */
    public function authorize(): bool { return true; }

    /** Menetapkan aturan validasi komponen nilai valuasi. */
    public function rules(): array
    {
        // Menyesuaikan kolom wajib antara pembuatan dan pembaruan data.
        $required = $this->isMethod('post') ? 'required' : 'sometimes';
        return [
            'id_jenis_tutupan_lahan' => [$required, 'integer', 'exists:jenis_tutupan_lahan,id_jenis_tutupan_lahan'],
            'id_metode' => [$required, 'integer', 'exists:metode_valuasi,id_metode'],
            'tanggal_hitung' => [$required, 'date'],
            'keterangan' => ['nullable', 'string'],
        ];
    }
}
