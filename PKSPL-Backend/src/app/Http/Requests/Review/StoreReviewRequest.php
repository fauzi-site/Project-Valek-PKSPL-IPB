<?php

namespace App\Http\Requests\Review;

use Illuminate\Foundation\Http\FormRequest;

class StoreReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'decision' => 'required|string|in:Approved,Rejected,Need Revision',
            'notes' => 'nullable|string|max:5000',
        ];
    }
}
