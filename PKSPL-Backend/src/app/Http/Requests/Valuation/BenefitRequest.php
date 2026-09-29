<?php

namespace App\Http\Requests\Valuation;

use Illuminate\Foundation\Http\FormRequest;

class BenefitRequest extends FormRequest
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
            'ecosystem_service_group' => ['nullable', 'string', 'max:100'],
            'value' => ['required', 'numeric'],
            'period_year' => ['nullable', 'integer'],
            'data_source' => ['nullable', 'string', 'max:200'],
            'source_module' => ['nullable', 'string', 'max:100'],
            'source_record_id' => ['nullable', 'integer'],
            'description' => ['nullable', 'string'],
        ];
    }
}
