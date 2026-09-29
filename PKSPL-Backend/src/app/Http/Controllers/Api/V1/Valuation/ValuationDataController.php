<?php

namespace App\Http\Controllers\Api\V1\Valuation;

use App\Http\Controllers\Controller;
use App\Models\AreaServiceConfig;
use App\Models\JenisTutupanLahan;
use App\Models\ValuationCustomColumn;
use App\Models\ValuationRow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Menangani endpoint Data Valuasi (workflow peneliti).
 *
 * Hirarki data:
 *   JenisTutupanLahan → AreaServiceConfig → ValuationRow → ValuationCustomColumn
 */
class ValuationDataController extends Controller
{
    // =========================================================================
    // HELPER PRIVATE
    // =========================================================================

    /** Mengambil land cover atau menghentikan request dengan 404. */
    private function findLandCover(int $landCoverId): JenisTutupanLahan
    {
        return JenisTutupanLahan::query()
            ->where('id_jenis_tutupan_lahan', $landCoverId)
            ->firstOrFail();
    }

    // =========================================================================
    // AREA SERVICE CONFIGS
    // =========================================================================

    /**
     * GET /v1/jenis-tutupan-lahan/{landCoverId}/valuation/configs
     *
     * Menampilkan seluruh konfigurasi service untuk area tutupan lahan tertentu.
     */
    public function getConfigs(int $landCoverId): JsonResponse
    {
        $this->findLandCover($landCoverId);

        $configs = AreaServiceConfig::query()
            ->where('id_jenis_tutupan_lahan', $landCoverId)
            ->get();

        return response()->json([
            'data'    => $configs,
            'message' => 'Konfigurasi service berhasil diambil.',
        ]);
    }

    /**
     * PUT /v1/jenis-tutupan-lahan/{landCoverId}/valuation/configs
     *
     * Bulk upsert semua konfigurasi service sekaligus.
     * Body: { configs: [ {service_id, is_active, method_id, biota?}, ... ] }
     */
    public function upsertConfigs(Request $request, int $landCoverId): JsonResponse
    {
        $this->findLandCover($landCoverId);

        $validated = $request->validate([
            'configs'                => ['required', 'array'],
            'configs.*.service_id'   => ['required', 'string', 'max:50'],
            'configs.*.is_active'    => ['required', 'boolean'],
            'configs.*.method_id'    => ['required', 'string', 'max:100'],
            'configs.*.biota'        => ['nullable', 'string', 'in:flora,fauna', 'max:20'],
        ]);

        $upserted = [];
        foreach ($validated['configs'] as $cfg) {
            $upserted[] = AreaServiceConfig::query()->updateOrCreate(
                [
                    'id_jenis_tutupan_lahan' => $landCoverId,
                    'service_id'             => $cfg['service_id'],
                ],
                [
                    'is_active' => $cfg['is_active'],
                    'method_id' => $cfg['method_id'],
                    'biota'     => $cfg['biota'] ?? null,
                ]
            );
        }

        return response()->json([
            'data'    => $upserted,
            'message' => 'Konfigurasi service berhasil diperbarui.',
        ]);
    }

    // =========================================================================
    // VALUATION ROWS
    // =========================================================================

    /**
     * GET /v1/jenis-tutupan-lahan/{landCoverId}/valuation/rows
     *
     * Menampilkan baris data valuasi beserta kolom custom yang terkait.
     * Query params: service_id, method_id, biota (opsional sebagai filter).
     */
    public function getRows(Request $request, int $landCoverId): JsonResponse
    {
        $this->findLandCover($landCoverId);

        $filter = $request->validate([
            'service_id' => ['nullable', 'string', 'max:50'],
            'method_id'  => ['nullable', 'string', 'max:100'],
            'biota'      => ['nullable', 'string', 'in:flora,fauna', 'max:20'],
        ]);

        $rowsQuery = ValuationRow::query()
            ->where('id_jenis_tutupan_lahan', $landCoverId)
            ->orderBy('row_order');

        $colsQuery = ValuationCustomColumn::query()
            ->where('id_jenis_tutupan_lahan', $landCoverId)
            ->orderBy('col_order');

        foreach (['service_id', 'method_id', 'biota'] as $field) {
            if (!empty($filter[$field])) {
                $rowsQuery->where($field, $filter[$field]);
                $colsQuery->where($field, $filter[$field]);
            }
        }

        return response()->json([
            'data' => [
                'rows'           => $rowsQuery->get(),
                'custom_columns' => $colsQuery->get(),
            ],
            'message' => 'Data baris valuasi berhasil diambil.',
        ]);
    }

    /**
     * POST /v1/jenis-tutupan-lahan/{landCoverId}/valuation/rows
     *
     * Menambahkan satu baris data valuasi baru.
     * Body: { service_id, method_id, biota?, row_order?, row_data, total_nilai? }
     */
    public function addRow(Request $request, int $landCoverId): JsonResponse
    {
        $this->findLandCover($landCoverId);

        $validated = $request->validate([
            'service_id'  => ['required', 'string', 'max:50'],
            'method_id'   => ['required', 'string', 'max:100'],
            'biota'       => ['nullable', 'string', 'in:flora,fauna', 'max:20'],
            'row_order'   => ['nullable', 'integer', 'min:0'],
            'row_data'    => ['required', 'array'],
            'total_nilai' => ['nullable', 'numeric'],
        ]);

        $row = ValuationRow::query()->create(array_merge(
            $validated,
            ['id_jenis_tutupan_lahan' => $landCoverId]
        ));

        return response()->json([
            'data'    => $row,
            'message' => 'Baris data valuasi berhasil ditambahkan.',
        ], Response::HTTP_CREATED);
    }

    /**
     * PUT /v1/jenis-tutupan-lahan/{landCoverId}/valuation/rows/{rowId}
     *
     * Memperbarui row_data dan total_nilai pada baris valuasi.
     */
    public function updateRow(Request $request, int $landCoverId, int $rowId): JsonResponse
    {
        $this->findLandCover($landCoverId);

        /** @var ValuationRow $row */
        $row = ValuationRow::query()
            ->where('id_jenis_tutupan_lahan', $landCoverId)
            ->where('id', $rowId)
            ->firstOrFail();

        $validated = $request->validate([
            'row_order'   => ['nullable', 'integer', 'min:0'],
            'row_data'    => ['nullable', 'array'],
            'total_nilai' => ['nullable', 'numeric'],
        ]);

        $row->update($validated);

        return response()->json([
            'data'    => $row->refresh(),
            'message' => 'Baris data valuasi berhasil diperbarui.',
        ]);
    }

    /**
     * DELETE /v1/jenis-tutupan-lahan/{landCoverId}/valuation/rows/{rowId}
     *
     * Menghapus satu baris data valuasi.
     */
    public function deleteRow(int $landCoverId, int $rowId): Response
    {
        $this->findLandCover($landCoverId);

        ValuationRow::query()
            ->where('id_jenis_tutupan_lahan', $landCoverId)
            ->where('id', $rowId)
            ->firstOrFail()
            ->delete();

        return response()->noContent();
    }

    /**
     * POST /v1/jenis-tutupan-lahan/{landCoverId}/valuation/rows/reorder
     *
     * Memperbarui urutan baris sesuai array id yang dikirim.
     * Body: { service_id, method_id, biota?, ordered_ids: [id1, id2, ...] }
     */
    public function reorderRows(Request $request, int $landCoverId): JsonResponse
    {
        $this->findLandCover($landCoverId);

        $validated = $request->validate([
            'service_id'    => ['required', 'string', 'max:50'],
            'method_id'     => ['required', 'string', 'max:100'],
            'biota'         => ['nullable', 'string', 'in:flora,fauna', 'max:20'],
            'ordered_ids'   => ['required', 'array'],
            'ordered_ids.*' => ['required', 'integer'],
        ]);

        foreach ($validated['ordered_ids'] as $order => $id) {
            ValuationRow::query()
                ->where('id_jenis_tutupan_lahan', $landCoverId)
                ->where('id', $id)
                ->update(['row_order' => $order]);
        }

        // Kembalikan baris yang telah diurutkan ulang
        $rows = ValuationRow::query()
            ->where('id_jenis_tutupan_lahan', $landCoverId)
            ->where('service_id', $validated['service_id'])
            ->where('method_id', $validated['method_id'])
            ->when(!empty($validated['biota']), fn ($q) => $q->where('biota', $validated['biota']))
            ->orderBy('row_order')
            ->get();

        return response()->json([
            'data'    => $rows,
            'message' => 'Urutan baris berhasil diperbarui.',
        ]);
    }

    // =========================================================================
    // VALUATION CUSTOM COLUMNS
    // =========================================================================

    /**
     * GET /v1/jenis-tutupan-lahan/{landCoverId}/valuation/custom-columns
     *
     * Menampilkan kolom custom untuk kombinasi service + method + biota tertentu.
     * Query params: service_id, method_id, biota (opsional sebagai filter).
     */
    public function getCustomColumns(Request $request, int $landCoverId): JsonResponse
    {
        $this->findLandCover($landCoverId);

        $filter = $request->validate([
            'service_id' => ['nullable', 'string', 'max:50'],
            'method_id'  => ['nullable', 'string', 'max:100'],
            'biota'      => ['nullable', 'string', 'in:flora,fauna', 'max:20'],
        ]);

        $query = ValuationCustomColumn::query()
            ->where('id_jenis_tutupan_lahan', $landCoverId)
            ->orderBy('col_order');

        foreach (['service_id', 'method_id', 'biota'] as $field) {
            if (!empty($filter[$field])) {
                $query->where($field, $filter[$field]);
            }
        }

        return response()->json([
            'data'    => $query->get(),
            'message' => 'Kolom custom berhasil diambil.',
        ]);
    }

    /**
     * POST /v1/jenis-tutupan-lahan/{landCoverId}/valuation/custom-columns
     *
     * Menambahkan definisi kolom custom baru untuk metode tertentu.
     * Body: { service_id, method_id, biota?, column_key, label, type?, is_required?, col_order? }
     */
    public function addCustomColumn(Request $request, int $landCoverId): JsonResponse
    {
        $this->findLandCover($landCoverId);

        $validated = $request->validate([
            'service_id'  => ['required', 'string', 'max:50'],
            'method_id'   => ['required', 'string', 'max:100'],
            'biota'       => ['nullable', 'string', 'in:flora,fauna', 'max:20'],
            'column_key'  => ['required', 'string', 'max:150'],
            'label'       => ['required', 'string', 'max:200'],
            'type'        => ['nullable', 'string', 'in:text,integer,decimal,date,boolean'],
            'is_required' => ['nullable', 'boolean'],
            'col_order'   => ['nullable', 'integer', 'min:0'],
        ]);

        $column = ValuationCustomColumn::query()->create(array_merge(
            $validated,
            ['id_jenis_tutupan_lahan' => $landCoverId]
        ));

        return response()->json([
            'data'    => $column,
            'message' => 'Kolom custom berhasil ditambahkan.',
        ], Response::HTTP_CREATED);
    }

    /**
     * PUT /v1/jenis-tutupan-lahan/{landCoverId}/valuation/custom-columns/{colId}
     *
     * Memperbarui definisi kolom custom.
     */
    public function updateCustomColumn(Request $request, int $landCoverId, int $colId): JsonResponse
    {
        $this->findLandCover($landCoverId);

        /** @var ValuationCustomColumn $column */
        $column = ValuationCustomColumn::query()
            ->where('id_jenis_tutupan_lahan', $landCoverId)
            ->where('id', $colId)
            ->firstOrFail();

        $validated = $request->validate([
            'label'       => ['nullable', 'string', 'max:200'],
            'type'        => ['nullable', 'string', 'in:text,integer,decimal,date,boolean'],
            'is_required' => ['nullable', 'boolean'],
            'col_order'   => ['nullable', 'integer', 'min:0'],
        ]);

        $column->update($validated);

        return response()->json([
            'data'    => $column->refresh(),
            'message' => 'Kolom custom berhasil diperbarui.',
        ]);
    }

    /**
     * DELETE /v1/jenis-tutupan-lahan/{landCoverId}/valuation/custom-columns/{colId}
     *
     * Menghapus definisi kolom custom.
     */
    public function deleteCustomColumn(int $landCoverId, int $colId): Response
    {
        $this->findLandCover($landCoverId);

        ValuationCustomColumn::query()
            ->where('id_jenis_tutupan_lahan', $landCoverId)
            ->where('id', $colId)
            ->firstOrFail()
            ->delete();

        return response()->noContent();
    }
}
