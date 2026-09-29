<?php

namespace App\Http\Requests\Valuation;

use Illuminate\Foundation\Http\FormRequest;

class ValuationModuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_proyek' => ['required', 'integer', 'exists:proyek,id_proyek'],
            'module_type' => ['required', 'string', 'max:100'],
            'name' => ['nullable', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'configuration' => ['nullable', 'array'],
        ];
    }
}
