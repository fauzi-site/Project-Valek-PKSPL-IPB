<?php

namespace App\Http\Requests\Geography;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validasi payload master kabupaten atau kota.
 */
class KabupatenKotaRequest extends FormRequest
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
            'id_provinsi' => [$required, 'integer', 'exists:provinsi,id_provinsi'],
            'kode_kabupaten_kota' => [$required, 'string', 'max:255'],
            'nama_kabupaten_kota' => [$required, 'string', 'max:255'],
            'tipe' => [$required, Rule::in(['Kabupaten', 'Kota'])],
        ];
    }
}
