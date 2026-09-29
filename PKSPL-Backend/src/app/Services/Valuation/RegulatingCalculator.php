<?php

namespace App\Services\Valuation;

use App\Services\Valuation\FormulaHelper;
use Illuminate\Support\Collection;

class RegulatingCalculator
{
    public function calculate(Collection $records): array
    {
        $detail = [];
        $subtotal = '0';

        foreach ($records as $record) {
            $value = $this->calculateRecord($record);
            $subtotal = FormulaHelper::add($subtotal, $value);
            $detail[] = [
                'id' => $record->id_regulating ?? null,
                'kategori_tev' => $record->kategori_tev ?? 'IUV',
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
        // Struktur jasa pengaturan hanya menyimpan nilai ekonomi yang telah
        // ditetapkan dari indikator dan referensi; harga dan luas bukan bagian
        // dari skema terbaru sehingga tidak boleh dipakai sebagai parameter
        // perhitungan implisit.
        return FormulaHelper::normalizeNumber($record->nilai ?? 0);
    }
}
