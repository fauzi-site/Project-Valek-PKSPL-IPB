<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';
        $index = $this->route('index');
        $proyekId = $this->input('id_proyek', $index?->id_proyek);

        return [
            'id_proyek' => [$required, 'integer', 'exists:proyek,id_proyek'],
            'nama_index' => [$required, 'string', 'max:150'],
            'kode_index' => [
                $required,
                'string',
                'max:100',
                Rule::unique('indexes', 'kode_index')->where(fn ($query) => $query->where('id_proyek', $proyekId))->ignore($index, 'id_index'),
            ],
            'luas' => ['nullable', 'numeric', 'decimal:0,2'],
            'satuan_luas' => ['nullable', 'string', 'max:20'],
            'geometry' => ['nullable', 'array'],
            'deskripsi' => ['nullable', 'string'],
        ];
    }
}
