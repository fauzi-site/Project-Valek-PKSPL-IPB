<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

class JenisTutupanLahanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'id_index' => [$required, 'integer', 'exists:indexes,id_index'],
            'nama_tutupan_lahan' => [$required, 'string', 'max:150'],
            'kategori' => ['nullable', 'string', 'max:100'],
            'luas' => ['nullable', 'numeric', 'decimal:0,2'],
            'satuan_luas' => ['nullable', 'string', 'max:20'],
            'geometry' => ['nullable', 'array'],
            'deskripsi' => ['nullable', 'string'],
        ];
    }
}
