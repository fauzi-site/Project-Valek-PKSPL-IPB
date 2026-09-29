<?php

namespace App\Http\Requests\Review;

use Illuminate\Foundation\Http\FormRequest;

class StoreAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => 'required|file|max:20480|mimes:pdf,doc,docx,xlsx,csv,png,jpg,jpeg,zip,geojson,gpkg,shp',
        ];
    }
}
