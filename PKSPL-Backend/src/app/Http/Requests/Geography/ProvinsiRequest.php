<?php

namespace App\Http\Requests\Geography;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi payload master provinsi.
 */
class ProvinsiRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'kode_provinsi' => [$required, 'string', 'max:255'],
            'nama_provinsi' => [$required, 'string', 'max:255'],
        ];
    }
}
