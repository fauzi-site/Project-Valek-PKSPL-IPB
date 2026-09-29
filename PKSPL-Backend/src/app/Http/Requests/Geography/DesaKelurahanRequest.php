<?php

namespace App\Http\Requests\Geography;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validasi payload master desa atau kelurahan.
 */
class DesaKelurahanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'id_kecamatan' => [$required, 'integer', 'exists:kecamatan,id_kecamatan'],
            'kode_desa_kelurahan' => [$required, 'string', 'max:255'],
            'nama_desa_kelurahan' => [$required, 'string', 'max:255'],
            'tipe' => [$required, Rule::in(['Desa', 'Kelurahan'])],
        ];
    }
}
