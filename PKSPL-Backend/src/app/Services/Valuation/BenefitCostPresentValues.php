<?php

namespace App\Services\Valuation;

use App\Models\ProjectValuationSetting;
use Illuminate\Database\Eloquent\Model;

/**
 * Attaches a present value to benefit and cost rows on their way to a screen,
 * a PDF or a public page.
 *
 * The stored `pv_value` column is written when a row is saved and when the
 * project is recalculated, but it is not guaranteed to be there: rows that
 * predate the column, rows loaded from a seeder, or rows whose project has not
 * been recalculated since the discount rate moved all carry a stale or empty
 * figure. A reporting surface cannot tell the difference, and printing a
 * nominal amount under a column headed "PV" is the failure this exists to
 * prevent — it is invisible in the number itself.
 *
 * So every displayed present value is recomputed here from the project's own
 * assumptions, through EconomicValuationCalculator, the same path the stored
 * totals take. Nothing is persisted: the value is set on the in-memory model
 * only, which keeps this safe to call on paginated read paths.
 */
class BenefitCostPresentValues
{
    public function __construct(private readonly EconomicValuationCalculator $calculator) {}

    /** Benefits carry their year in `period_year`. */
    public function benefit(Model $benefit, ProjectValuationSetting $settings): Model
    {
        return $this->apply($benefit, $settings, 'period_year');
    }

    /** Costs carry theirs in `year_applied`. */
    public function cost(Model $cost, ProjectValuationSetting $settings): Model
    {
        return $this->apply($cost, $settings, 'year_applied');
    }

    /**
     * Every row in a collection, in place.
     *
     * @template T of \Illuminate\Support\Collection
     *
     * @param  T  $rows
     * @return T
     */
    public function benefits($rows, ProjectValuationSetting $settings)
    {
        return $rows->each(fn (Model $row) => $this->benefit($row, $settings));
    }

    /**
     * @template T of \Illuminate\Support\Collection
     *
     * @param  T  $rows
     * @return T
     */
    public function costs($rows, ProjectValuationSetting $settings)
    {
        return $rows->each(fn (Model $row) => $this->cost($row, $settings));
    }

    private function apply(Model $row, ProjectValuationSetting $settings, string $yearAttribute): Model
    {
        $row->pv_value = $this->calculator->calculatePV(
            (float) $row->value,
            (int) ($row->{$yearAttribute} ?? $settings->base_year),
            (int) $settings->base_year,
            (float) $settings->discount_rate,
        );

        return $row;
    }
}
