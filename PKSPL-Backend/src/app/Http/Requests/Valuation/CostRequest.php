<?php

namespace App\Http\Requests\Valuation;

use Illuminate\Foundation\Http\FormRequest;

class CostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_proyek' => ['required', 'integer', 'exists:proyek,id_proyek'],
            'category' => ['required', 'string', 'max:100'],
            'subcategory' => ['nullable', 'string', 'max:100'],
            'activity_group' => ['nullable', 'string', 'max:100'],
            'value' => ['required', 'numeric'],
            'year_applied' => ['nullable', 'integer'],
            'description' => ['nullable', 'string'],
        ];
    }
}
