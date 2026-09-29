<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Memvalidasi data pengguna dari request API. */
class UserRequest extends FormRequest
{
    /** Hanya admin yang dapat mengelola data pengguna. */
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && $user->role()->where('nama_role', \App\Models\Role::ADMIN)->exists();
    }

    /** Menetapkan aturan validasi pengguna. */
    public function rules(): array
    {
        // Menyesuaikan kolom wajib antara pembuatan dan pembaruan data.
        $required = $this->isMethod('post') ? 'required' : 'sometimes';
        // Password hanya wajib saat pengguna baru dibuat.
        $password = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'id_role' => [$required, 'integer', 'exists:roles,id_role'],
            'nama' => [$required, 'string', 'max:100'],
            'email' => [$required, 'email', 'max:100', Rule::unique('users', 'email')->ignore($this->route('user'), 'id_user')],
            'password' => [$password, 'string', 'max:255'],
            'google_id' => ['nullable', 'string', 'max:255'],
            'foto' => ['nullable', 'string', 'max:255'],
            'status' => [$required, Rule::in(['Aktif', 'Nonaktif'])],
        ];
    }
}
