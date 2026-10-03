import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';

interface LocationSelectorProps {
  value: string;
  onChange: (location: string) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({ value, onChange }) => {
  const [provinces, setProvinces] = useState<any[]>([]);
  const [regencies, setRegencies] = useState<any[]>([]);
  
  const [selectedProvId, setSelectedProvId] = useState<string>('');
  const [selectedRegId, setSelectedRegId] = useState<string>('');
  
  const [loadingProv, setLoadingProv] = useState(false);
  const [loadingReg, setLoadingReg] = useState(false);

  // Parse existing value (e.g. "Kota Denpasar, BALI")
  useEffect(() => {
    // We try to match but since this is a one-way binding usually, 
    // we'll just handle it simply.
  }, []);

  useEffect(() => {
    setLoadingProv(true);
    fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(err => console.error(err))
      .finally(() => setLoadingProv(false));
  }, []);

  useEffect(() => {
    if (!selectedProvId) {
      setRegencies([]);
      return;
    }
    setLoadingReg(true);
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${selectedProvId}.json`)
      .then(res => res.json())
      .then(data => setRegencies(data))
      .catch(err => console.error(err))
      .finally(() => setLoadingReg(false));
  }, [selectedProvId]);

  const handleProvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provId = e.target.value;
    setSelectedProvId(provId);
    setSelectedRegId('');
    
    if (!provId) {
      onChange('');
      return;
    }
    const provName = provinces.find(p => p.id === provId)?.name || '';
    onChange(provName);
  };

  const handleRegChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const regId = e.target.value;
    setSelectedRegId(regId);
    
    if (!regId) {
      const provName = provinces.find(p => p.id === selectedProvId)?.name || '';
      onChange(provName);
      return;
    }
    
    const provName = provinces.find(p => p.id === selectedProvId)?.name || '';
    const regName = regencies.find(r => r.id === regId)?.name || '';
    onChange(`${regName}, ${provName}`);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <select
          value={selectedProvId}
          onChange={handleProvChange}
          disabled={loadingProv}
          className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none bg-white text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">-- Pilih Provinsi --</option>
          {provinces.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>

      <div className="relative flex-1">
        <select
          value={selectedRegId}
          onChange={handleRegChange}
          disabled={!selectedProvId || loadingReg}
          className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none bg-white text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">-- Pilih Kota/Kabupaten --</option>
          {regencies.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
};
