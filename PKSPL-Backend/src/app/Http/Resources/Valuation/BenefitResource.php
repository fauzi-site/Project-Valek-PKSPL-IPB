<?php

namespace App\Http\Resources\Valuation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BenefitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_benefit' => $this->id_benefit,
            'id_proyek' => $this->id_proyek,
            'category' => $this->category,
            'subcategory' => $this->subcategory,
            'ecosystem_service_group' => $this->ecosystem_service_group,
            'value' => (float) $this->value,
            'period_year' => $this->period_year,
            'pv_value' => $this->pv_value ? (float) $this->pv_value : null,
            'data_source' => $this->data_source,
            'source_module' => $this->source_module,
            'source_record_id' => $this->source_record_id,
            'description' => $this->description,
        ];
    }
}
