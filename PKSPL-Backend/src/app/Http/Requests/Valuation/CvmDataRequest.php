<?php

namespace App\Http\Requests\Valuation;

use Illuminate\Foundation\Http\FormRequest;

class CvmDataRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_proyek' => ['required', 'integer', 'exists:proyek,id_proyek'],
            'id_module' => ['nullable', 'integer', 'exists:valuation_modules,id_module'],
            'respondent_id' => ['required', 'string', 'max:100'],
            'elicitation_format' => ['required', 'string', 'max:100'],
            'bid_amount' => ['nullable', 'numeric'],
            'willingness_to_pay' => ['nullable', 'boolean'],
            'wtp_amount' => ['nullable', 'numeric'],
            'socioeconomic_data' => ['nullable', 'array'],
        ];
    }
}
