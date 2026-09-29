<?php

namespace App\Http\Resources\Valuation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ValuationModuleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_module' => $this->id_module,
            'id_proyek' => $this->id_proyek,
            'module_type' => $this->module_type,
            'name' => $this->name,
            'description' => $this->description,
            'configuration' => $this->configuration,
            'calculation_result' => $this->calculation_result,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
