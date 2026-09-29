<?php

namespace App\Http\Requests\Reference;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Memvalidasi data dataset referensi dari request API. */
class DatasetReferensiRequest extends FormRequest
{
    /** Mengizinkan request karena otorisasi belum diterapkan. */
    public function authorize(): bool { return true; }

    /** Menetapkan aturan validasi dataset referensi. */
    public function rules(): array
    {
        // Menyesuaikan kolom wajib antara pembuatan dan pembaruan data.
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return ['nama_dataset' => [$required, 'string', 'max:150'], 'kategori' => [$required, 'string', 'max:100'], 'tahun' => ['nullable', 'integer', 'between:1901,2155'], 'file_dataset' => [$required, 'string', 'max:255'], 'tipe_file' => ['nullable', 'string', 'max:20'], 'sumber' => [$required, 'string', 'max:255'], 'deskripsi' => ['nullable', 'string'], 'status' => [$required, Rule::in(['Aktif', 'Nonaktif'])]];
    }
}
