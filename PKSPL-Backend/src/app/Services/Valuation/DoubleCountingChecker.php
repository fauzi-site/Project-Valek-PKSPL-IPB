<?php

namespace App\Services\Valuation;

use App\Models\Benefit;
use App\Models\Proyek;
use Illuminate\Support\Str;

/**
 * Flags benefits that may be counting the same economic value twice.
 *
 * The case that motivates this: EOP and the Food Production ecosystem service
 * both value output from the same place. EOP prices the *change* in
 * production; Food Production prices the production itself. Recorded against
 * the same commodity and area they overlap, and a TEV that includes both is
 * inflated — quietly, because each figure is individually correct.
 *
 * Nothing here blocks a save. An analyst may have good reason to keep both
 * (different areas, different commodities, a deliberate scenario), and a tool
 * that refuses would just be worked around. The job is to make the overlap
 * impossible to miss, and to say which rows are involved so it can be judged.
 */
class DoubleCountingChecker
{
    public const SEVERITY_WARNING = 'warning';

    public const SEVERITY_DANGER = 'danger';

    /**
     * @return array<int, array{code: string, severity: string, title: string, message: string, benefit_ids: array<int, int>}>
     */
    public function check(Proyek $project): array
    {
        $benefits = $project->benefits()->get([
            'id', 'description', 'value', 'source_module', 'source_record_id',
            'subcategory', 'method_used', 'ecosystem_service_group',
        ]);

        return array_values(array_filter([
            ...$this->productionOverlaps($benefits),
            ...$this->duplicateSourceRecords($benefits),
            ...$this->repeatedDescriptions($benefits),
        ]));
    }

    /**
     * EOP against Food Production / Raw Material, matched on commodity.
     *
     * The commodity name is the strongest signal available without asking the
     * user to declare areas: "Ikan" valued through EOP and again through Food
     * Production is almost certainly the same fish. Where no commodity word is
     * shared the warning is softened rather than dropped, because the two
     * modules can still overlap on area alone.
     */
    private function productionOverlaps($benefits): array
    {
        $eop = $benefits->filter(fn ($b) => $this->isEop($b));
        $provisioning = $benefits->filter(fn ($b) => $this->isProvisioningService($b));

        if ($eop->isEmpty() || $provisioning->isEmpty()) {
            return [];
        }

        $warnings = [];

        foreach ($eop as $eopBenefit) {
            foreach ($provisioning as $serviceBenefit) {
                $shared = $this->sharedKeywords($eopBenefit->description, $serviceBenefit->description);

                $warnings[] = [
                    'code' => 'eop_vs_provisioning_service',
                    'severity' => $shared ? self::SEVERITY_DANGER : self::SEVERITY_WARNING,
                    'title' => $shared
                        ? 'Potensi double counting: komoditas sama'
                        : 'Periksa tumpang tindih EOP dan jasa penyediaan',
                    'message' => $shared
                        ? sprintf(
                            'Manfaat "%s" (EOP) dan "%s" (jasa penyediaan) sama-sama menyebut "%s". '
                            .'EOP menilai perubahan produksi, sedangkan jasa penyediaan menilai produksinya sendiri — '
                            .'jika keduanya untuk komoditas dan area yang sama, nilainya terhitung dua kali.',
                            $eopBenefit->description,
                            $serviceBenefit->description,
                            implode(', ', $shared),
                        )
                        : sprintf(
                            'Manfaat "%s" (EOP) dan "%s" (jasa penyediaan) berpotensi menilai keluaran yang sama. '
                            .'Pastikan keduanya berasal dari area atau komoditas yang berbeda.',
                            $eopBenefit->description,
                            $serviceBenefit->description,
                        ),
                    'benefit_ids' => [$eopBenefit->id, $serviceBenefit->id],
                ];
            }
        }

        return $warnings;
    }

    /**
     * The same module record referenced by more than one benefit — always a
     * mistake, since the record's value would enter TEV twice over.
     */
    private function duplicateSourceRecords($benefits): array
    {
        return $benefits
            ->filter(fn ($b) => $b->source_module && $b->source_record_id)
            ->groupBy(fn ($b) => $b->source_module.'#'.$b->source_record_id)
            ->filter(fn ($group) => $group->count() > 1)
            ->map(fn ($group, $key) => [
                'code' => 'duplicate_source_record',
                'severity' => self::SEVERITY_DANGER,
                'title' => 'Satu record modul dipakai lebih dari sekali',
                'message' => sprintf(
                    '%d manfaat menarik dari record modul yang sama (%s). Nilai record tersebut masuk ke TEV berulang kali.',
                    $group->count(),
                    $key,
                ),
                'benefit_ids' => $group->pluck('id')->all(),
            ])
            ->values()
            ->all();
    }

    /** Identical descriptions and amounts, which usually means a double entry. */
    private function repeatedDescriptions($benefits): array
    {
        return $benefits
            ->groupBy(fn ($b) => Str::lower(trim($b->description)).'|'.(float) $b->value)
            ->filter(fn ($group) => $group->count() > 1)
            ->map(fn ($group) => [
                'code' => 'identical_benefit_rows',
                'severity' => self::SEVERITY_WARNING,
                'title' => 'Manfaat identik tercatat lebih dari sekali',
                'message' => sprintf(
                    '%d baris manfaat memiliki deskripsi dan nilai yang sama ("%s"). Periksa apakah ini duplikasi.',
                    $group->count(),
                    $group->first()->description,
                ),
                'benefit_ids' => $group->pluck('id')->all(),
            ])
            ->values()
            ->all();
    }

    private function isEop($benefit): bool
    {
        return $benefit->source_module === 'eop'
            || Str::upper((string) $benefit->method_used) === 'EOP';
    }

    /**
     * A provisioning ecosystem-service benefit — the family EOP can overlap
     * with. Regulating and cultural services value different things, so they
     * are not part of this rule.
     */
    private function isProvisioningService($benefit): bool
    {
        if ($benefit->source_module !== 'ecosystem_service') {
            return false;
        }

        return $benefit->ecosystem_service_group === 'provisioning'
            || $benefit->subcategory === 'production';
    }

    /**
     * Meaningful words shared by two descriptions.
     *
     * Short tokens and the module's own vocabulary are ignored so that
     * "Produksi Ikan" and "Food Production — Ikan" match on the commodity
     * rather than on the word "produksi", which every production benefit has.
     */
    private function sharedKeywords(?string $a, ?string $b): array
    {
        $stopWords = [
            'produksi', 'production', 'food', 'raw', 'material', 'nilai',
            'manfaat', 'jasa', 'dari', 'untuk', 'pada', 'value', 'eop',
        ];

        $tokenise = function (?string $text) use ($stopWords) {
            $words = preg_split('/[^\p{L}\p{N}]+/u', Str::lower((string) $text), -1, PREG_SPLIT_NO_EMPTY) ?: [];

            return array_values(array_filter(
                $words,
                fn ($w) => mb_strlen($w) > 3 && ! in_array($w, $stopWords, true),
            ));
        };

        return array_values(array_unique(array_intersect($tokenise($a), $tokenise($b))));
    }
}
