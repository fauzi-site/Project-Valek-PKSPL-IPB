<?php

namespace App\Services\Valuation;

use App\Services\Valuation\FormulaHelper;
use Illuminate\Support\Collection;

class ProvisioningCalculator
{
    public function calculate(Collection $records): array
    {
        $detail = [];
        $subtotal = '0';

        foreach ($records as $record) {
            $value = $this->calculateRecord($record);
            $subtotal = FormulaHelper::add($subtotal, $value);
            $detail[] = [
                'id' => $record->id_provisioning ?? null,
                'kategori_tev' => $record->kategori_tev ?? 'DUV',
                'nilai' => $value,
            ];
        }

        return [
            'subtotal' => $subtotal,
            'detail' => $detail,
        ];
    }

    public function calculateRecord(object $record): string
    {
        return FormulaHelper::safeMultiply(
            $record->produktivitas ?? 0,
            $record->harga_pasar ?? 0,
            $record->luas_pemanfaatan ?? 0,
        );
    }
}
