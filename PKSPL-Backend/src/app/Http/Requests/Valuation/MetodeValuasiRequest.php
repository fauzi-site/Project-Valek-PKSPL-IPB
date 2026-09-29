<?php

namespace App\Http\Requests\Valuation;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Memvalidasi data metode valuasi dari request API. */
class MetodeValuasiRequest extends FormRequest
{
    /** Mengizinkan request karena otorisasi belum diterapkan. */
    public function authorize(): bool { return true; }

    /** Menetapkan aturan validasi metode valuasi. */
    public function rules(): array
    {
        // Menyesuaikan kolom wajib antara pembuatan dan pembaruan data.
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return ['nama_metode' => [$required, 'string', 'max:150', Rule::unique('metode_valuasi', 'nama_metode')->ignore($this->route('metode_valuasi'), 'id_metode')], 'deskripsi' => ['nullable', 'string'], 'formula' => ['nullable', 'string'], 'parameter' => ['nullable', 'string'], 'status' => [$required, Rule::in(['Aktif', 'Nonaktif'])]];
    }
}
