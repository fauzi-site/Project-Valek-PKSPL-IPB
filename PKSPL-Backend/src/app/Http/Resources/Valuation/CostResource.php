<?php

namespace App\Http\Resources\Valuation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_cost' => $this->id_cost,
            'id_proyek' => $this->id_proyek,
            'category' => $this->category,
            'subcategory' => $this->subcategory,
            'activity_group' => $this->activity_group,
            'value' => (float) $this->value,
            'year_applied' => $this->year_applied,
            'pv_value' => $this->pv_value ? (float) $this->pv_value : null,
            'description' => $this->description,
        ];
    }
}
