<?php

namespace App\Http\Requests\AI;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Memvalidasi data basis pengetahuan AI dari request API. */
class BasisDataAiRequest extends FormRequest
{
    /** Mengizinkan request karena otorisasi belum diterapkan. */
    public function authorize(): bool { return true; }

    /** Menetapkan aturan validasi basis data AI. */
    public function rules(): array
    {
        // Menyesuaikan kolom wajib antara pembuatan dan pembaruan data.
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return ['nama_basis' => [$required, 'string', 'max:150'], 'versi' => [$required, 'string', 'max:100'], 'deskripsi' => ['nullable', 'string'], 'path_file' => [$required, 'string', 'max:255'], 'status' => [$required, Rule::in(['Aktif', 'Nonaktif'])], 'jenis_basis' => ['nullable', 'string', 'max:50'], 'model_embedding' => ['nullable', 'string', 'max:100'], 'jumlah_dokumen' => [$required, 'integer', 'min:0']];
    }
}
