<?php

namespace App\Http\Requests\Valuation;

use Illuminate\Foundation\Http\FormRequest;

class ProjectValuationSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_proyek' => ['required', 'integer', 'exists:proyek,id_proyek'],
            'base_year' => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'discount_rate' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'currency' => ['nullable', 'string', 'max:10'],
            'analysis_period' => ['nullable', 'integer', 'min:1'],
            'eop_value_basis' => ['nullable', 'string', 'in:net,gross'],
        ];
    }
}
