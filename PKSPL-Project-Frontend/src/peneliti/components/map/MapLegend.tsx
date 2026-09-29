import React, { useState, useMemo } from 'react';
import { LandCoverPolygon } from '../../types/spatial';
import { getPolygonColor } from '../../utils/spatialColors';
import { ChevronDown, ChevronUp, Layers, Info } from 'lucide-react';

interface MapLegendProps {
  landCovers?: LandCoverPolygon[];
}

export const MapLegend: React.FC<MapLegendProps> = ({ landCovers }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { legendItems, totalPolygons } = useMemo(() => {
    if (!landCovers || landCovers.length === 0) {
      return {
        legendItems: [
          { label: 'Mangrove', color: '#10b981', count: 0, percentage: 0 },
          { label: 'Lamun', color: '#14b8a6', count: 0, percentage: 0 },
          { label: 'Terumbu Karang', color: '#f97316', count: 0, percentage: 0 },
          { label: 'Perairan Teluk', color: '#38bdf8', count: 0, percentage: 0 },
          { label: 'Lainnya', color: '#64748b', count: 0, percentage: 0 },
        ],
        totalPolygons: 0,
      };
    }

    const classMap = new Map<string, { label: string; color: string; count: number }>();
    let total = 0;

    landCovers.forEach((poly) => {
      const name = poly.name || 'Lainnya';
      total += 1;
      const existing = classMap.get(name);
      if (existing) {
        existing.count += 1;
      } else {
        const polyCol = getPolygonColor(poly);
        classMap.set(name, {
          label: name,
          color: poly.fillColor || polyCol.fill,
          count: 1,
        });
      }
    });

    const items = Array.from(classMap.values())
      .map((item) => ({
        ...item,
        percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      legendItems: items,
      totalPolygons: total,
    };
  }, [landCovers]);

  return (
    <div className="w-full select-none text-xs">
      {/* Top Legend Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-blue-50 text-blue-600">
            <Layers className="w-3.5 h-3.5" />
          </span>
          <span className="font-bold text-slate-800 text-xs tracking-tight">
            Keterangan Simbologi SHP
          </span>
          <span className="text-[11px] text-slate-400 font-mono font-medium">
            ({legendItems.length} kelas · {totalPolygons.toLocaleString('id-ID')} poligon)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400">
            <Info className="w-3 h-3 text-slate-400" />
            <span>Klik poligon pada peta untuk melihat seluruh atributnya di panel samping</span>
          </span>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 py-0.5 px-2 rounded hover:bg-slate-100 transition-colors cursor-pointer ml-auto sm:ml-0"
            title={isCollapsed ? 'Perluas daftar legenda' : 'Ciutkan daftar legenda'}
          >
            <span>{isCollapsed ? 'Perluas' : 'Ciutkan'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Grid of Legend Items */}
      {!isCollapsed && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-2 max-h-48 overflow-y-auto pr-1">
          {legendItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 min-w-0 py-0.5"
              title={`${item.label} — ${item.count.toLocaleString('id-ID')} poligon (${item.percentage}%)`}
            >
              {/* Color Swatch */}
              <span
                className="w-3.5 h-3.5 rounded-xs shrink-0 border border-black/25 shadow-2xs"
                style={{ backgroundColor: item.color }}
              />
              {/* Class Label */}
              <span className="text-slate-700 font-medium truncate text-[11px] flex-1">
                {item.label}
              </span>
              {/* Count & Percentage */}
              {item.count > 0 && (
                <span className="text-[10px] text-slate-400 font-mono shrink-0 whitespace-nowrap">
                  {item.count} <span className="text-slate-300">({item.percentage}%)</span>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
