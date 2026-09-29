<?php

namespace App\Http\Requests\AI;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Memvalidasi data analisis AI dari request API. */
class AnalisisAiRequest extends FormRequest
{
    /** Mengizinkan request karena otorisasi belum diterapkan. */
    public function authorize(): bool { return true; }

    /** Menetapkan aturan validasi data analisis AI. */
    public function rules(): array
    {
        return ['id_proyek' => ['required', 'integer', 'exists:proyek,id_proyek'], 'id_user' => ['required', 'integer', 'exists:users,id_user'], 'pertanyaan' => ['required', 'string'], 'jawaban' => ['required', 'string'], 'sumber_data' => ['nullable', 'string'], 'tipe_analisis' => ['required', Rule::in(['Chat', 'Ringkasan', 'Rekomendasi', 'Prediksi'])]];
    }
}
