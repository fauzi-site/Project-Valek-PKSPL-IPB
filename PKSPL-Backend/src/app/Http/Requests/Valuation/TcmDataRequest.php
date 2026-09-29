<?php

namespace App\Http\Requests\Valuation;

use Illuminate\Foundation\Http\FormRequest;

class TcmDataRequest extends FormRequest
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
            'distance' => ['nullable', 'numeric'],
            'total_travel_cost' => ['nullable', 'numeric'],
            'annual_visits' => ['nullable', 'integer'],
            'time_cost' => ['nullable', 'numeric'],
            'socioeconomic_data' => ['nullable', 'array'],
        ];
    }
}
