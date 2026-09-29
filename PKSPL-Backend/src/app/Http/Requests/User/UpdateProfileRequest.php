<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Auth middleware handles this
    }

    public function rules(): array
    {
        return [
            'nama' => ['sometimes', 'required', 'string', 'max:100'],
            'foto' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
        ];
    }

    public function messages(): array
    {
        return [
            'nama.required' => 'Nama wajib diisi.',
            'nama.max' => 'Nama maksimal 100 karakter.',
            'foto.image' => 'File harus berupa gambar.',
            'foto.mimes' => 'Format foto harus JPEG, JPG, PNG, atau WebP.',
            'foto.max' => 'Ukuran foto maksimal 2MB.',
        ];
    }
}
