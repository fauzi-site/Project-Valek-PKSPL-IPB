<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

/** Memvalidasi catatan histori aktivitas dari request API. */
class HistoriRequest extends FormRequest
{
    /** Mengizinkan request karena otorisasi belum diterapkan. */
    public function authorize(): bool { return true; }

    /** Menetapkan aturan validasi histori aktivitas. */
    public function rules(): array
    {
        return ['id_user' => ['required', 'integer', 'exists:users,id_user'], 'id_proyek' => ['required', 'integer', 'exists:proyek,id_proyek'], 'aktivitas' => ['required', 'string', 'max:255'], 'keterangan' => ['nullable', 'string']];
    }
}
