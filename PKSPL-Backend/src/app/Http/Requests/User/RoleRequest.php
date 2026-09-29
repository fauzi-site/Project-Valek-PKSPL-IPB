<?php

namespace App\Http\Requests\User;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validasi role master bila kelak endpoint pengelolaan role dilindungi.
 */
class RoleRequest extends FormRequest
{
    /**
     * Otorisasi khusus belum diterapkan karena matriks akses belum tersedia.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Role dibatasi pada empat nilai bisnis yang telah disepakati.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'nama_role' => [
                $required,
                'string',
                Rule::in(Role::names()),
                Rule::unique('roles', 'nama_role')->ignore($this->route('role'), 'id_role'),
            ],
            'deskripsi' => ['nullable', 'string'],
        ];
    }
}
