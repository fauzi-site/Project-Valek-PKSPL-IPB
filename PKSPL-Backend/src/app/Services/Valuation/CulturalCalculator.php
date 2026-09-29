<?php

namespace App\Services\Valuation;

use App\Services\Valuation\FormulaHelper;
use Illuminate\Support\Collection;

class CulturalCalculator
{
    public function calculate(Collection $records): array
    {
        $detail = [];
        $subtotal = '0';

        foreach ($records as $record) {
            $value = $this->calculateRecord($record);
            $subtotal = FormulaHelper::add($subtotal, $value);
            $detail[] = [
                'id' => $record->id_cultural ?? null,
                'kategori_tev' => $record->kategori_tev ?? 'EV',
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
        if ($record->jumlah_pengunjung !== null && $record->biaya_perjalanan !== null && $record->frekuensi !== null) {
            return FormulaHelper::safeMultiply(
                $record->jumlah_pengunjung ?? 0,
                $record->biaya_perjalanan ?? 0,
                $record->frekuensi ?? 0,
            );
        }

        return FormulaHelper::normalizeNumber($record->nilai ?? 0);
    }
}
