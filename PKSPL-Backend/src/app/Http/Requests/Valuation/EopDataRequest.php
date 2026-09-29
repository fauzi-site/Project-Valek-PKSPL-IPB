<?php

namespace App\Http\Requests\Valuation;

use Illuminate\Foundation\Http\FormRequest;

class EopDataRequest extends FormRequest
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
            'commodity' => ['required', 'string', 'max:150'],
            'quantity_before' => ['nullable', 'numeric'],
            'quantity_after' => ['nullable', 'numeric'],
            'output_price' => ['nullable', 'numeric'],
            'production_cost' => ['nullable', 'numeric'],
            'estimation_method' => ['nullable', 'string', 'max:100'],
        ];
    }
}
