<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

/** Memvalidasi data area terdampak dari request API. */
class AreaTerdampakRequest extends FormRequest
{
    /** Mengizinkan request karena otorisasi belum diterapkan. */
    public function authorize(): bool { return true; }

    /** Menetapkan aturan validasi untuk pembuatan dan pembaruan area. */
    public function rules(): array
    {
        // Menyesuaikan kolom wajib antara pembuatan dan pembaruan data.
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'id_proyek' => [$required, 'integer', 'exists:proyek,id_proyek'],
            'id_ekosistem' => [$required, 'integer', 'exists:ekosistem,id_ekosistem'],
            'nama_area' => [$required, 'string', 'max:150'],
            'latitude' => [$required, 'numeric', 'decimal:0,6'],
            'longitude' => [$required, 'numeric', 'decimal:0,6'],
            'luas' => [$required, 'numeric', 'decimal:0,2'],
            'satuan_luas' => [$required, 'string', 'max:20'],
            'deskripsi' => ['nullable', 'string'],
        ];
    }
}
