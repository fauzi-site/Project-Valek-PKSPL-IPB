import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  Shield,
  TrendingUp,
  Activity,
  FileText,
  Map as MapIcon,
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle,
  Calendar,
  Layers,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { getCategoryInfo } from './mapData';
import { getPublicProjectDetail } from '../../services/projectService';
import { MAP_CONFIG } from '../../peneliti/config/mapConfig';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function ProjectDetailPage({ projectId, onBack }) {
  const [activeTab, setActiveTab] = useState('deskripsi');
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getPublicProjectDetail(projectId)
      .then((data) => {
        if (!isMounted) return;
        if (!data || data.status === 'error') {
          setError(data?.message || 'Program penelitian tidak ditemukan di database.');
          setProject(null);
        } else {
          setProject(data);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[ProjectDetailPage] Gagal memuat data program:', err);
        setError('Program penelitian tidak ditemukan di database.');
        setProject(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-6">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <h2 className="text-lg font-bold text-slate-800 mb-1">Memuat Data Program Penelitian...</h2>
        <p className="text-xs text-slate-500">Mengambil data resmi dari database PKSPL IPB</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-6">
        <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-lg text-center max-w-md w-full">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Program Tidak Ditemukan</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
            {error || `Data program dengan ID atau Kode "${projectId}" tidak tersedia di database.`}
          </p>
          <button
            onClick={onBack}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0f284e] hover:bg-[#153a70] text-white font-semibold text-sm rounded-xl transition shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Peta Lokasi</span>
          </button>
        </div>
      </div>
    );
  }

  const loc = project;
  const category = getCategoryInfo(loc.category) || {
    id: loc.category || 'pesisir',
    label: 'Pesisir & Laut',
    color: '#06b6d4',
    emoji: '🏖️',
  };

  const tabs = [
    { id: 'deskripsi', label: 'Deskripsi & Potensi', icon: FileText },
    { id: 'peta', label: 'Peta Lokasi', icon: MapIcon },
    { id: 'riwayat', label: 'Riwayat Aktivitas', icon: Clock },
  ];

  const hasCoords = Array.isArray(loc.coords) && !isNaN(loc.coords[0]) && !isNaN(loc.coords[1]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 h-16 px-4 md:px-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline font-medium text-sm">Kembali ke Peta</span>
        </button>
        <div className="flex items-center gap-2 max-w-xl truncate px-4">
          {loc.kode_proyek && (
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
              {loc.kode_proyek}
            </span>
          )}
          <h1 className="text-base md:text-lg font-bold text-slate-800 truncate">{loc.name || loc.nama_proyek}</h1>
        </div>
        {category && (
          <div className="px-3 py-1 rounded-full text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shadow-2xs" style={{ backgroundColor: category.color }}>
            <span>{category.emoji}</span>
            <span className="hidden sm:inline">{category.label}</span>
          </div>
        )}
      </header>

      {/* Hero Banner */}
      <div 
        className="h-48 relative flex items-center px-6"
        style={{ 
          background: category ? `linear-gradient(135deg, ${category.color} 0%, ${category.color}dd 100%)` : 'linear-gradient(135deg, #0f284e 0%, #1e3a8a 100%)' 
        }}
      >
        <div className="max-w-6xl mx-auto w-full text-white z-10 pt-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase tracking-wider font-bold bg-black/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
              Tahun {loc.tahun || '2026'}
            </span>
            {loc.peneliti && loc.peneliti !== 'Belum tersedia' && (
              <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                Peneliti: {loc.peneliti}
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2 tracking-tight line-clamp-2">{loc.name || loc.nama_proyek}</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium opacity-90">
            <span className="bg-white/20 px-2.5 py-1 rounded-md">{loc.provinsi}</span>
            <span>•</span>
            <span>{loc.kabupaten}</span>
            {hasCoords && (
              <>
                <span>•</span>
                <span className="font-mono text-xs bg-white/20 px-2 py-1 rounded-md">{loc.coords[0].toFixed(5)}, {loc.coords[1].toFixed(5)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-8 relative z-20 px-4 md:px-6 max-w-6xl mx-auto w-full">
        {/* Card 1: Luas Area */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center gap-3.5 hover:shadow-lg transition border border-slate-100">
          <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: category ? `${category.color}1a` : '#eff6ff' }}>
            <Layers className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: category ? category.color : '#3b82f6' }} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Luas Area</div>
            <div className="font-extrabold text-base sm:text-lg text-slate-900 truncate">{loc.luas || 'Belum tersedia'}</div>
          </div>
        </div>

        {/* Card 2: Status Program */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center gap-3.5 hover:shadow-lg transition border border-slate-100">
          <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: category ? `${category.color}1a` : '#eff6ff' }}>
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: category ? category.color : '#3b82f6' }} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Status Program</div>
            <div className="font-extrabold text-base sm:text-lg text-slate-900 truncate">{loc.status || 'Terdaftar & Aktif'}</div>
          </div>
        </div>

        {/* Card 3: Estimasi TEV */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center gap-3.5 hover:shadow-lg transition border border-slate-100">
          <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: category ? `${category.color}1a` : '#eff6ff' }}>
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: category ? category.color : '#3b82f6' }} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Estimasi TEV</div>
            <div className="font-extrabold text-base sm:text-lg text-slate-900 truncate">{loc.tev || 'Belum tersedia'}</div>
          </div>
        </div>

        {/* Card 4: Titik / Zona Pantau */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center gap-3.5 hover:shadow-lg transition border border-slate-100">
          <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: category ? `${category.color}1a` : '#eff6ff' }}>
            <Activity className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: category ? category.color : '#3b82f6' }} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Titik / Zona Pantau</div>
            <div className="font-extrabold text-base sm:text-lg text-slate-900 truncate">{loc.jumlahTitikPantau || 'Belum tersedia'}</div>
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <div className="max-w-6xl mx-auto w-full px-4 md:px-6 mt-8 flex-1 pb-16">
        {/* Tab Bar */}
        <div className="flex space-x-1 border-b border-slate-200 mb-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#0f284e] text-[#0f284e]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        <div className="bg-white rounded-2xl shadow-xs p-5 sm:p-7 border border-slate-200/90">
          {/* Deskripsi Tab */}
          {activeTab === 'deskripsi' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {loc.ringkasan && (
                <div className="bg-blue-50/70 border-l-4 border-blue-600 p-4 rounded-r-xl text-blue-950">
                  <span className="text-[10px] font-bold tracking-wider text-blue-700 uppercase block mb-1">
                    Tujuan & Ruang Lingkup Valuasi
                  </span>
                  <p className="font-medium text-xs sm:text-sm leading-relaxed">{loc.ringkasan}</p>
                </div>
              )}
              
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Deskripsi Lengkap Program</h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                  {loc.deskripsi || 'Belum ada deskripsi untuk lokasi ini.'}
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2.5">Spesies Utama & Komoditas</h3>
                {loc.spesies && loc.spesies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {loc.spesies.map((sp, idx) => (
                      <span key={idx} className="bg-emerald-50 text-emerald-800 border border-emerald-200/90 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{sp}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 text-xs">
                    Belum ada catatan data spesies flora atau fauna yang terhubung dengan program ini.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Peta Tab */}
          {activeTab === 'peta' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {hasCoords ? (
                <>
                  <div className="h-[420px] rounded-xl overflow-hidden shadow-inner border border-slate-200">
                    <MapContainer center={loc.coords} zoom={loc.geometry ? 12 : 10} scrollWheelZoom={false} className="h-full w-full">
                      <TileLayer
                        attribution={MAP_CONFIG.primaryTileProvider.attribution}
                        url={MAP_CONFIG.primaryTileProvider.url}
                        maxZoom={MAP_CONFIG.primaryTileProvider.maxZoom}
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                      {loc.geometry && (
                        <GeoJSON
                          data={loc.geometry}
                          style={{
                            color: category.color || '#2563eb',
                            fillColor: category.color || '#3b82f6',
                            weight: 2.5,
                            fillOpacity: 0.25,
                          }}
                        />
                      )}
                      <Marker position={loc.coords}>
                        <Popup>
                          <div className="p-1">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {loc.kode_proyek}
                            </span>
                            <strong className="block text-sm text-slate-900 mt-1">{loc.name || loc.nama_proyek}</strong>
                            <p className="text-xs text-slate-600 mt-0.5">{loc.provinsi} • {loc.kabupaten}</p>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600">
                    <div className="space-y-0.5">
                      <div>
                        <span className="font-semibold text-slate-700">Koordinat Titik Acuan:</span>{' '}
                        <span className="font-mono">{loc.coords[0].toFixed(6)}, {loc.coords[1].toFixed(6)}</span>
                      </div>
                      {loc.alamat_lengkap && loc.alamat_lengkap !== 'Belum tersedia' && (
                        <div className="text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">Alamat:</span> {loc.alamat_lengkap}
                        </div>
                      )}
                    </div>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${loc.coords[0]},${loc.coords[1]}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold transition self-start sm:self-center"
                    >
                      <span>Buka di Google Maps</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                  <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Koordinat Lokasi Belum Tersedia</p>
                  <p className="text-xs text-slate-500 mt-1">Data spasial untuk program penelitian ini belum dipetakan di database.</p>
                </div>
              )}
            </div>
          )}

          {/* Riwayat Tab */}
          {activeTab === 'riwayat' && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-base font-bold text-slate-900 mb-4">Riwayat Pemantauan & Aktivitas</h3>
              
              {(!loc.riwayat || loc.riwayat.length === 0) ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Belum Ada Catatan Riwayat</p>
                  <p className="text-xs text-slate-500 mt-1">Aktivitas pemantauan lapangan untuk program ini belum dicatat di database.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-3 md:ml-4 space-y-6 pb-2">
                  {loc.riwayat.map((item, idx) => (
                    <div key={idx} className="relative pl-6 md:pl-8">
                      {/* Timeline dot */}
                      <div className="absolute w-3.5 h-3.5 bg-blue-600 rounded-full -left-[8px] top-1.5 border-3 border-white shadow-xs"></div>
                      
                      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-xl p-4 hover:shadow-md transition">
                        <div className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            }) : 'Waktu tidak tercatat'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mb-1">{item.aktivitas}</h4>
                        <p className="text-slate-600 text-xs leading-relaxed">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
