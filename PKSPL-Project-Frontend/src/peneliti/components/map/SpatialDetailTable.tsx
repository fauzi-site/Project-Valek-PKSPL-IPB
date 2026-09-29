import React, { useState, useMemo } from 'react';
import { LandCoverPolygon, IndexItem } from '../../types/spatial';
import { formatNumber } from '../../utils/formatter';
import { getPolygonColor } from '../../utils/spatialColors';
import { 
  Layers, 
  Maximize2, 
  PieChart, 
  Globe, 
  Tag, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  Filter, 
  Download,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface SpatialDetailTableProps {
  landCovers: LandCoverPolygon[];
  indices?: IndexItem[];
  selectedPolygonId?: string | null;
  onSelectPolygon?: (poly: LandCoverPolygon | null) => void;
  onFilterClass?: (className: string | null) => void;
}

interface ClassSummary {
  name: string;
  color: string;
  stroke: string;
  polygonCount: number;
  totalAreaHa: number;
  percentage: number;
}

export const SpatialDetailTable: React.FC<SpatialDetailTableProps> = ({
  landCovers,
  indices = [],
  selectedPolygonId,
  onSelectPolygon,
  onFilterClass,
}) => {
  const [activeTab, setActiveTab] = useState<'classes' | 'features'>('classes');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // 1. Overall Spatial Statistics
  const stats = useMemo(() => {
    const totalCount = landCovers.length;
    const totalArea = landCovers.reduce((sum, p) => sum + (Number(p.areaHa) || 0), 0);
    const linkedCount = landCovers.filter(p => Boolean(p.indexId || p.indexCode)).length;
    const unlinkedCount = totalCount - linkedCount;

    return {
      totalCount,
      totalArea,
      linkedCount,
      unlinkedCount,
    };
  }, [landCovers]);

  // 2. Class Distribution Aggregation
  const classSummaries = useMemo<ClassSummary[]>(() => {
    if (!landCovers.length) return [];

    const map = new Map<string, { count: number; area: number; color: string; stroke: string }>();

    landCovers.forEach((poly) => {
      const name = poly.name || 'Lainnya';
      const existing = map.get(name);
      const polyCol = getPolygonColor(poly);
      const area = Number(poly.areaHa) || 0;

      if (existing) {
        existing.count += 1;
        existing.area += area;
      } else {
        map.set(name, {
          count: 1,
          area: area,
          color: poly.fillColor || polyCol.fill,
          stroke: poly.strokeColor || polyCol.stroke,
        });
      }
    });

    const totalArea = stats.totalArea || 1;

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        color: data.color,
        stroke: data.stroke,
        polygonCount: data.count,
        totalAreaHa: Number(data.area.toFixed(2)),
        percentage: Number(((data.area / totalArea) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.totalAreaHa - a.totalAreaHa);
  }, [landCovers, stats.totalArea]);

  // 3. Filtered Polygons List for Feature Table
  const filteredPolygons = useMemo(() => {
    if (!searchQuery.trim()) return landCovers;
    const q = searchQuery.toLowerCase().trim();

    return landCovers.filter((poly) => {
      const matchName = poly.name?.toLowerCase().includes(q);
      const matchCode = poly.code?.toLowerCase().includes(q);
      const matchIndex = poly.indexCode?.toLowerCase().includes(q) || poly.indexName?.toLowerCase().includes(q);
      const matchProps = poly.properties
        ? Object.values(poly.properties).some(v => String(v).toLowerCase().includes(q))
        : false;

      return matchName || matchCode || matchIndex || matchProps;
    });
  }, [landCovers, searchQuery]);

  // Pagination for Feature Table
  const totalPages = Math.ceil(filteredPolygons.length / pageSize) || 1;
  const paginatedPolygons = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPolygons.slice(start, start + pageSize);
  }, [filteredPolygons, currentPage, pageSize]);

  // Selected polygon object
  const selectedPoly = useMemo(() => {
    if (!selectedPolygonId) return null;
    return landCovers.find(p => p.id === selectedPolygonId) || null;
  }, [selectedPolygonId, landCovers]);

  // Export summary to CSV
  const handleExportCSV = () => {
    if (!classSummaries.length) return;
    const headers = ['No', 'Kelas Tutupan Lahan', 'Jumlah Poligon', 'Luas (Ha)', 'Persentase (%)'];
    const rows = classSummaries.map((item, idx) => [
      idx + 1,
      `"${item.name.replace(/"/g, '""')}"`,
      item.polygonCount,
      item.totalAreaHa,
      `${item.percentage}%`,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rekap_tutupan_lahan_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!landCovers || landCovers.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-0 text-slate-800 animate-in fade-in duration-150">
      {/* 1. Header Section */}
      <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-blue-100 text-blue-700">
              <Layers className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Detail Data Spasial & Analisis Tutupan Lahan
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Informasi metrik luasan, distribusi kelas polygon, dan peninjauan atribut file Shapefile
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Download ringkasan tutupan lahan ke berkas CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Cards (Summary KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-b border-slate-200 bg-white">
        {/* Card 1: Total Fitur */}
        <div className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Total Poligon</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900 font-mono">
            {stats.totalCount.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500">
            Fitur area terdaftar di peta
          </div>
        </div>

        {/* Card 2: Total Luas */}
        <div className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Total Luas Terpetakan</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900 font-mono">
            {formatNumber(stats.totalArea)} <span className="text-xs font-sans font-medium text-slate-500">ha</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Kumulatif seluruh polygon
          </div>
        </div>

        {/* Card 3: Jumlah Kelas */}
        <div className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <PieChart className="w-3.5 h-3.5 text-purple-600" />
            <span>Kelas Tutupan Lahan</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900 font-mono">
            {classSummaries.length} <span className="text-xs font-sans font-medium text-slate-500">kategori</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Berdasarkan simbologi SHP
          </div>
        </div>

        {/* Card 4: Status Index */}
        <div className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <Tag className="w-3.5 h-3.5 text-amber-600" />
            <span>Keterkaitan Index</span>
          </div>
          <div className="text-sm font-bold text-slate-900 flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold">
              {stats.linkedCount} Terhubung
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-xs font-semibold">
              {stats.unlinkedCount} Belum
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Sistem: <strong className="text-slate-700">WGS 84 (EPSG:4326)</strong>
          </div>
        </div>
      </div>

      {/* 3. Selected Feature Alert Banner (if user clicked a polygon on the map) */}
      {selectedPoly && (
        <div className="p-3.5 bg-blue-50/80 border-b border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-xs shrink-0 border border-black/25 shadow-2xs"
              style={{ backgroundColor: selectedPoly.fillColor || getPolygonColor(selectedPoly).fill }}
            />
            <div>
              <span className="font-bold text-blue-900">{selectedPoly.name}</span>
              <span className="text-blue-700 ml-2 font-mono">({selectedPoly.code})</span>
              <span className="text-blue-600 ml-2 font-medium">
                • {formatNumber(selectedPoly.areaHa)} ha
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectPolygon?.(selectedPoly)}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-xs transition-colors cursor-pointer"
            >
              Lihat di Panel Samping
            </button>
            <button
              onClick={() => onSelectPolygon?.(null)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded font-medium text-xs transition-colors cursor-pointer"
            >
              Batal Pilih
            </button>
          </div>
        </div>
      )}

      {/* 4. Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 px-4">
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'classes'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Distribusi & Legenda Kelas Tutupan ({classSummaries.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('features')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'features'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Daftar Seluruh Poligon & Atribut DBF ({landCovers.length})</span>
        </button>
      </div>

      {/* 5. TAB 1: KETERANGAN & DISTRIBUSI KELAS */}
      {activeTab === 'classes' && (
        <div className="p-4 md:p-5 space-y-4">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">Warna</th>
                  <th className="py-2.5 px-3">Kelas Tutupan Lahan</th>
                  <th className="py-2.5 px-3 text-right">Jumlah Poligon</th>
                  <th className="py-2.5 px-3 text-right">Total Luas (Ha)</th>
                  <th className="py-2.5 px-3 w-48">Proporsi Luasan</th>
                  <th className="py-2.5 px-3 text-right w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {classSummaries.map((item, idx) => (
                  <tr key={item.name} className="hover:bg-slate-50/80 transition-colors">
                    {/* Swatch */}
                    <td className="py-2.5 px-3 text-center align-middle">
                      <span
                        className="inline-block w-4 h-4 rounded-xs border border-black/25 shadow-2xs"
                        style={{ backgroundColor: item.color }}
                        title={`Kode Warna: ${item.color}`}
                      />
                    </td>

                    {/* Nama Kelas */}
                    <td className="py-2.5 px-3 font-semibold text-slate-800 align-middle">
                      <span>{item.name}</span>
                    </td>

                    {/* Jumlah Poligon */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700 align-middle">
                      {item.polygonCount.toLocaleString('id-ID')}
                    </td>

                    {/* Total Luas */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 align-middle">
                      {formatNumber(item.totalAreaHa)} ha
                    </td>

                    {/* Proporsi */}
                    <td className="py-2.5 px-3 align-middle">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>{item.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(2, item.percentage))}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="py-2.5 px-3 text-right align-middle">
                      <button
                        onClick={() => {
                          const firstPoly = landCovers.find(p => p.name === item.name);
                          if (firstPoly && onSelectPolygon) {
                            onSelectPolygon(firstPoly);
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium hover:underline text-[11px] cursor-pointer inline-flex items-center gap-1"
                        title="Tampilkan poligon contoh kelas ini di panel"
                      >
                        <span>Pilih</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50/90 font-bold border-t border-slate-200 text-slate-800 text-[11px]">
                <tr>
                  <td className="py-2.5 px-3 text-center">-</td>
                  <td className="py-2.5 px-3">Total Seluruh Wilayah</td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {stats.totalCount.toLocaleString('id-ID')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-blue-700">
                    {formatNumber(stats.totalArea)} ha
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600">
                    100.0%
                  </td>
                  <td className="py-2.5 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB 2: DAFTAR FITUR & ATRIBUT DBF */}
      {activeTab === 'features' && (
        <div className="p-4 md:p-5 space-y-4">
          {/* Search bar & filter toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kode, nama kelas, atau atribut DBF..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="text-[11px] text-slate-500">
              Menampilkan {paginatedPolygons.length} dari {filteredPolygons.length} poligon
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-[10.5px] uppercase font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">Warna</th>
                  <th className="py-2.5 px-3">Kode Fitur</th>
                  <th className="py-2.5 px-3">Nama / Kelas Tutupan</th>
                  <th className="py-2.5 px-3 text-right">Luas (Ha)</th>
                  <th className="py-2.5 px-3">Titik Pusat (Centroid)</th>
                  <th className="py-2.5 px-3">Status Index</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {paginatedPolygons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ditemukan poligon yang sesuai dengan pencarian "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  paginatedPolygons.map((poly) => {
                    const isSelected = selectedPolygonId === poly.id;
                    const col = getPolygonColor(poly);
                    const hasIdx = Boolean(poly.indexId || poly.indexCode);

                    return (
                      <tr
                        key={poly.id}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50/80'
                        }`}
                        onClick={() => onSelectPolygon?.(poly)}
                      >
                        {/* Swatch */}
                        <td className="py-2 px-3 text-center align-middle">
                          <span
                            className="inline-block w-3.5 h-3.5 rounded-xs border border-black/25 shadow-2xs"
                            style={{ backgroundColor: poly.fillColor || col.fill }}
                          />
                        </td>

                        {/* Kode Fitur */}
                        <td className="py-2 px-3 font-mono font-bold text-blue-700 align-middle">
                          {poly.code}
                        </td>

                        {/* Nama / Kelas */}
                        <td className="py-2 px-3 text-slate-800 align-middle">
                          <div className="font-semibold">{poly.name}</div>
                          {poly.properties && Object.keys(poly.properties).length > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                              {Object.entries(poly.properties)
                                .slice(0, 3)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' • ')}
                            </div>
                          )}
                        </td>

                        {/* Luas */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 align-middle">
                          {formatNumber(poly.areaHa)} ha
                        </td>

                        {/* Centroid */}
                        <td className="py-2 px-3 font-mono text-[10.5px] text-slate-500 align-middle">
                          {poly.center ? `${poly.center[0]}, ${poly.center[1]}` : '-'}
                        </td>

                        {/* Status Index */}
                        <td className="py-2 px-3 align-middle">
                          {hasIdx ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono font-semibold">
                              <Tag className="w-2.5 h-2.5" />
                              {poly.indexCode}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                              Belum Terhubung
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-2 px-3 text-right align-middle">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPolygon?.(poly);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded text-[10.5px] font-semibold text-slate-700 transition-colors cursor-pointer"
                          >
                            Pilih
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 text-[11px]">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
