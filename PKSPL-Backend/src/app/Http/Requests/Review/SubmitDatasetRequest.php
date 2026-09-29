<?php

namespace App\Http\Requests\Review;

use Illuminate\Foundation\Http\FormRequest;

class SubmitDatasetRequest extends FormRequest
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
