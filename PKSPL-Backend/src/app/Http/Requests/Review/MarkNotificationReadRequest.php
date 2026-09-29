<?php

namespace App\Http\Requests\Review;

use Illuminate\Foundation\Http\FormRequest;

class MarkNotificationReadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [];
    }
}
