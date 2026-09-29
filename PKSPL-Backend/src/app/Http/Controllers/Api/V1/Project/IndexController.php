<?php

namespace App\Http\Controllers\Api\V1\Project;

use App\Http\Controllers\Api\V1\ApiResourceController;

use App\Http\Requests\Project\IndexRequest;
use App\Http\Resources\Project\IndexResource;
use App\Models\Index;
use Illuminate\Http\Request;

class IndexController extends ApiResourceController
{
    protected string $model = Index::class;

    protected string $resource = IndexResource::class;

    public function index(Request $request)
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'id_proyek' => ['nullable', 'integer', 'exists:proyek,id_proyek'],
            'search' => ['nullable', 'string', 'max:100'],
            'q' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'max:50'],
        ]);

        $query = Index::query()->with('jenisTutupanLahan');
        if (! empty($validated['id_proyek'])) {
            $query->where('id_proyek', $validated['id_proyek']);
        }

        $search = $validated['search'] ?? $validated['q'] ?? null;
        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('kode_index', 'like', "%{$search}%")
                  ->orWhere('nama_index', 'like', "%{$search}%")
                  ->orWhere('deskripsi', 'like', "%{$search}%")
                  ->orWhereHas('jenisTutupanLahan', function ($qLandCover) use ($search) {
                      $qLandCover->where('nama_tutupan_lahan', 'like', "%{$search}%");
                  });
            });
        }

        if (! empty($validated['status']) && $validated['status'] !== 'ALL') {
            $query->where('status', $validated['status']);
        }

        return IndexResource::collection($query->paginate($validated['per_page'] ?? 10));
    }

    public function store(IndexRequest $request)
    {
        return $this->storeResource($request->validated());
    }

    public function show(Index $index)
    {
        $index->load('jenisTutupanLahan');
        return $this->showResource($index);
    }

    public function update(IndexRequest $request, Index $index)
    {
        return $this->updateResource($index, $request->validated());
    }

    public function destroy(Index $index)
    {
        return $this->destroyResource($index);
    }
}
