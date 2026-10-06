import React, { useState, useEffect } from 'react';
import { ChevronDown, MapPin, Edit3, ListFilter } from 'lucide-react';

export const INDONESIA_PROVINCES: { id: string; name: string; lat: number; lng: number }[] = [
  { id: '11', name: 'Aceh', lat: 4.6951, lng: 96.7494 },
  { id: '12', name: 'Sumatera Utara', lat: 2.1154, lng: 99.5451 },
  { id: '13', name: 'Sumatera Barat', lat: -0.7399, lng: 100.8000 },
  { id: '14', name: 'Riau', lat: 0.2933, lng: 101.7068 },
  { id: '15', name: 'Jambi', lat: -1.6101, lng: 103.6131 },
  { id: '16', name: 'Sumatera Selatan', lat: -3.3194, lng: 104.9144 },
  { id: '17', name: 'Bengkulu', lat: -3.5778, lng: 102.3464 },
  { id: '18', name: 'Lampung', lat: -4.5586, lng: 105.4068 },
  { id: '19', name: 'Kepulauan Bangka Belitung', lat: -2.7411, lng: 106.4406 },
  { id: '21', name: 'Kepulauan Riau', lat: 3.9457, lng: 108.1429 },
  { id: '31', name: 'DKI Jakarta', lat: -6.2088, lng: 106.8456 },
  { id: '32', name: 'Jawa Barat', lat: -6.9175, lng: 107.6191 },
  { id: '33', name: 'Jawa Tengah', lat: -7.1509, lng: 110.1402 },
  { id: '34', name: 'DI Yogyakarta', lat: -7.7956, lng: 110.3695 },
  { id: '35', name: 'Jawa Timur', lat: -7.5360, lng: 112.2384 },
  { id: '36', name: 'Banten', lat: -6.4058, lng: 106.0640 },
  { id: '51', name: 'Bali', lat: -8.4095, lng: 115.1889 },
  { id: '52', name: 'Nusa Tenggara Barat', lat: -8.6529, lng: 117.3616 },
  { id: '53', name: 'Nusa Tenggara Timur', lat: -8.6574, lng: 121.0794 },
  { id: '61', name: 'Kalimantan Barat', lat: -0.2787, lng: 111.4753 },
  { id: '62', name: 'Kalimantan Tengah', lat: -1.6815, lng: 113.3824 },
  { id: '63', name: 'Kalimantan Selatan', lat: -3.0926, lng: 115.2838 },
  { id: '64', name: 'Kalimantan Timur', lat: 0.5387, lng: 116.4194 },
  { id: '65', name: 'Kalimantan Utara', lat: 3.0731, lng: 116.0414 },
  { id: '71', name: 'Sulawesi Utara', lat: 0.6247, lng: 123.9750 },
  { id: '72', name: 'Sulawesi Tengah', lat: -1.4300, lng: 121.4456 },
  { id: '73', name: 'Sulawesi Selatan', lat: -3.6687, lng: 119.9741 },
  { id: '74', name: 'Sulawesi Tenggara', lat: -4.1449, lng: 122.1746 },
  { id: '75', name: 'Gorontalo', lat: 0.6999, lng: 122.4467 },
  { id: '76', name: 'Sulawesi Barat', lat: -2.8441, lng: 119.2321 },
  { id: '81', name: 'Maluku', lat: -3.2385, lng: 130.1453 },
  { id: '82', name: 'Maluku Utara', lat: 1.5709, lng: 127.8088 },
  { id: '91', name: 'Papua', lat: -4.2699, lng: 138.0804 },
  { id: '92', name: 'Papua Barat', lat: -1.3361, lng: 133.1747 },
  { id: '93', name: 'Papua Selatan', lat: -7.0, lng: 139.5 },
  { id: '94', name: 'Papua Tengah', lat: -3.5, lng: 136.5 },
  { id: '95', name: 'Papua Pegunungan', lat: -4.0, lng: 139.0 },
  { id: '96', name: 'Papua Barat Daya', lat: -1.0, lng: 131.5 },
];

export const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (['dki', 'di'].includes(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

interface LocationSelectorProps {
  value: string;
  onChange: (location: string, details?: { lat?: number; lng?: number; province?: string; regency?: string }) => void;
  className?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({ value, onChange, className = '' }) => {
  const [provinces, setProvinces] = useState<any[]>(INDONESIA_PROVINCES);
  const [regencies, setRegencies] = useState<any[]>([]);
  
  const [selectedProvId, setSelectedProvId] = useState<string>('');
  const [selectedRegId, setSelectedRegId] = useState<string>('');
  
  const [loadingProv, setLoadingProv] = useState(false);
  const [loadingReg, setLoadingReg] = useState(false);
  const [isManual, setIsManual] = useState(false);

  // Fetch online provinces from emsifa, fallback to INDONESIA_PROVINCES on error
  useEffect(() => {
    let isMounted = true;
    setLoadingProv(true);
    fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
      .then(res => res.json())
      .then(data => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setProvinces(data.map(p => ({
            id: p.id,
            name: toTitleCase(p.name),
            lat: INDONESIA_PROVINCES.find(ip => ip.id === p.id)?.lat ?? -2.5,
            lng: INDONESIA_PROVINCES.find(ip => ip.id === p.id)?.lng ?? 118.0,
          })));
        }
      })
      .catch(() => {
        // Fallback already pre-set to INDONESIA_PROVINCES
      })
      .finally(() => {
        if (isMounted) setLoadingProv(false);
      });

    return () => { isMounted = false; };
  }, []);

  // Fetch regencies when a province is chosen
  useEffect(() => {
    if (!selectedProvId) {
      setRegencies([]);
      return;
    }
    let isMounted = true;
    setLoadingReg(true);
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${selectedProvId}.json`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && Array.isArray(data)) {
          setRegencies(data.map(r => ({
            id: r.id,
            name: toTitleCase(r.name),
          })));
        }
      })
      .catch(() => {
        if (isMounted) setRegencies([]);
      })
      .finally(() => {
        if (isMounted) setLoadingReg(false);
      });

    return () => { isMounted = false; };
  }, [selectedProvId]);

  // Synchronize state if external value matches existing pattern
  useEffect(() => {
    if (!value) return;
    if (provinces.length > 0 && !selectedProvId) {
      const valLower = value.toLowerCase();
      const matchedProv = provinces.find(p => valLower.includes(p.name.toLowerCase()));
      if (matchedProv) {
        setSelectedProvId(matchedProv.id);
      }
    }
  }, [value, provinces]);

  const handleProvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provId = e.target.value;
    setSelectedProvId(provId);
    setSelectedRegId('');
    
    if (!provId) {
      onChange('');
      return;
    }
    const provObj = provinces.find(p => p.id === provId);
    const provName = provObj ? provObj.name : '';
    const details = provObj ? { lat: provObj.lat, lng: provObj.lng, province: provName } : undefined;
    onChange(provName, details);
  };

  const handleRegChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const regId = e.target.value;
    setSelectedRegId(regId);
    
    const provObj = provinces.find(p => p.id === selectedProvId);
    const provName = provObj ? provObj.name : '';
    const detailsBase = provObj ? { lat: provObj.lat, lng: provObj.lng, province: provName } : {};

    if (!regId) {
      onChange(provName, detailsBase);
      return;
    }
    
    const regName = regencies.find(r => r.id === regId)?.name || '';
    const formatted = `${regName}, ${provName}`;
    onChange(formatted, { ...detailsBase, regency: regName });
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const manualVal = e.target.value;
    const valLower = manualVal.toLowerCase();
    const matchedProv = provinces.find(p => valLower.includes(p.name.toLowerCase()));
    const details = matchedProv ? { lat: matchedProv.lat, lng: matchedProv.lng, province: matchedProv.name } : undefined;
    onChange(manualVal, details);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {isManual ? (
        <div className="relative">
          <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={value}
            onChange={handleManualChange}
            placeholder="Contoh: Kawasan Teluk Benoa, Badung, Bali"
            className="w-full pl-8 pr-20 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-slate-700"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setIsManual(false)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
          >
            Pilih Daftar
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {/* Provinsi Select */}
          <div className="relative flex-1">
            <select
              value={selectedProvId}
              onChange={handleProvChange}
              disabled={loadingProv}
              className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none bg-white text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
            >
              <option value="">-- Pilih Provinsi --</option>
              {provinces.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Kota/Kabupaten Select */}
          <div className="relative flex-1">
            <select
              value={selectedRegId}
              onChange={handleRegChange}
              disabled={!selectedProvId || loadingReg}
              className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none bg-white text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
            >
              <option value="">{selectedProvId ? '-- Pilih Kota/Kabupaten --' : '-- Pilih Provinsi Dahulu --'}</option>
              {regencies.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Manual Input Toggle Button */}
          <button
            type="button"
            onClick={() => setIsManual(true)}
            title="Ketik nama lokasi secara manual"
            className="p-2 border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Selected location feedback preview */}
      {value && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
          <span className="font-medium text-slate-700">Terpilih:</span>
          <span className="text-blue-700 font-semibold">{value}</span>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
