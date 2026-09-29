<?php

namespace App\Http\Requests\Ecosystem;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Memvalidasi data ekosistem dari request API. */
class EkosistemRequest extends FormRequest
{
    /** Mengizinkan request karena otorisasi belum diterapkan. */
    public function authorize(): bool { return true; }

    /** Menetapkan aturan validasi ekosistem. */
    public function rules(): array
    {
        // Menyesuaikan kolom wajib antara pembuatan dan pembaruan data.
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return ['nama_ekosistem' => [$required, 'string', 'max:150'], 'deskripsi' => ['nullable', 'string'], 'status' => [$required, Rule::in(['Aktif', 'Nonaktif'])]];
    }
}
