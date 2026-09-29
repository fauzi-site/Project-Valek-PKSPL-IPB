<?php

namespace App\Http\Requests\Geography;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi payload master kecamatan.
 */
class KecamatanRequest extends FormRequest
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
            'id_kabupaten_kota' => [$required, 'integer', 'exists:kabupaten_kota,id_kabupaten_kota'],
            'kode_kecamatan' => [$required, 'string', 'max:255'],
            'nama_kecamatan' => [$required, 'string', 'max:255'],
        ];
    }
}
