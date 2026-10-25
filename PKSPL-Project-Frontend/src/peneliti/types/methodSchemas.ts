import { EcosystemServiceId } from './valuation';

export interface ColumnDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'readonly_calculated';
  unit?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  placeholder?: string;
  isTotal?: boolean;
}

export type CustomColumnType = 'text' | 'integer' | 'decimal' | 'date' | 'boolean';

export interface CustomColumnDefinition {
  id: string;
  key: string;
  label: string;
  type: CustomColumnType;
  required?: boolean;
  isCustom: true;
}

export interface MethodSchema {
  serviceId: EcosystemServiceId;
  methodId: string;
  methodName: string;
  subtitle: string;
  formulaDescription: string;
  templateFileName: string;
  columns: ColumnDefinition[];
  calculateRow: (row: Record<string, any>) => {
    quantity?: number;
    total: number;
    isCalculable?: boolean;
    isPendingQuantity?: boolean;
    pendingReason?: string;
  };
  defaultNewRow: (nextNo: number, areaHa: number) => Record<string, any>;
  initialRows: Record<string, any>[];
  serviceTitle?: string;
}

export interface FaunaUnits {
  qtyUnit: string;
  prodUnit: string;
  priceUnit: string;
  qtyPlaceholder: string;
  prodPlaceholder: string;
  pricePlaceholder: string;
}

/**
 * Helper resolusi satuan adaptif untuk baris Fauna (Market Price)
 * Mendukung ikan/berat (kg, Rp/kg), individu (ekor, Rp/ekor), atau custom satuan
 */
export function getFaunaRowUnits(row?: Record<string, any>): FaunaUnits {
  const customUnit = (row?.satuan || row?.unit || '').toString().toLowerCase().trim();
  const itemName = (row?.item || '').toString().toLowerCase().trim();

  // 1. Satwa individu / ekor (kepiting, bibit, burung, dsb.)
  if (
    customUnit === 'ekor' ||
    customUnit === 'ind' ||
    customUnit === 'individu' ||
    (!customUnit && (
      itemName.includes('ekor') ||
      itemName.includes('kepiting') ||
      itemName.includes('bibit') ||
      itemName.includes('burung') ||
      itemName.includes('penyu')
    ))
  ) {
    return {
      qtyUnit: 'ekor',
      prodUnit: 'ekor/ha/th',
      priceUnit: 'Rp/ekor',
      qtyPlaceholder: '0 (ekor)',
      prodPlaceholder: '0 (ekor/ha/th)',
      pricePlaceholder: 'Rp/ekor',
    };
  }

  // 2. Komoditas cair (misal madu mangrove)
  if (customUnit === 'liter' || customUnit === 'l' || (!customUnit && itemName.includes('madu'))) {
    return {
      qtyUnit: 'liter',
      prodUnit: 'liter/ha/th',
      priceUnit: 'Rp/liter',
      qtyPlaceholder: '0 (liter)',
      prodPlaceholder: '0 (liter/ha/th)',
      pricePlaceholder: 'Rp/liter',
    };
  }

  // 3. Default komoditas berbasis berat (ikan hasil tangkapan, udang, dsb.)
  return {
    qtyUnit: 'kg',
    prodUnit: 'kg/ha/th',
    priceUnit: 'Rp/kg',
    qtyPlaceholder: '0 (kg tangkapan)',
    prodPlaceholder: '0 (kg/ha/th)',
    pricePlaceholder: 'Rp/kg',
  };
}

export const METHOD_SCHEMAS: Record<string, MethodSchema> = {
  // -------------------------------------------------------------
  // PROVISIONING - MARKET PRICE (FLORA)
  // -------------------------------------------------------------
  'provisioning_market-price_flora': {
    serviceId: 'provisioning',
    methodId: 'market-price',
    methodName: 'Market Price (Flora)',
    subtitle: 'Nilai Pasar Aktual - Vegetasi Mangrove',
    formulaDescription: 'Total = Produktivitas (m³/ha) × Luas (Ha) × Harga/Unit (Rp)',
    templateFileName: 'Provisioning_MarketPrice_Flora.xlsx',
    columns: [
      { key: 'no', label: 'No', type: 'number', width: 'w-12', align: 'center' },
      { key: 'item', label: 'Jenis Flora', type: 'text', width: 'min-w-[240px]', align: 'left', placeholder: 'Contoh: Rhizophora apiculata' },
      { key: 'produktivitas', label: 'Produktivitas', type: 'number', unit: 'm³/ha', width: 'w-32', align: 'right', placeholder: '0.00' },
      { key: 'hargaUnit', label: 'Harga / Unit (Rp)', type: 'number', width: 'w-40', align: 'right', placeholder: '0' },
      { key: 'jumlah', label: 'Volume (m³)', type: 'number', width: 'w-32', align: 'right', placeholder: '0.00' },
      { key: 'luasHa', label: 'Luas (Ha)', type: 'number', width: 'w-28', align: 'right' },
      { key: 'totalNilai', label: 'Total Nilai (Rp)', type: 'readonly_calculated', width: 'min-w-[200px]', align: 'right', isTotal: true },
      { key: 'source', label: 'Sumber Data', type: 'text', width: 'min-w-[200px]', align: 'left', placeholder: 'Survei Pasar 2024' },
    ],
    calculateRow: (r) => {
      const hasProd = r.produktivitas !== null && r.produktivitas !== undefined && r.produktivitas !== '';
      const hasLuas = r.luasHa !== null && r.luasHa !== undefined && r.luasHa !== '';
      const hasHarga = r.hargaUnit !== null && r.hargaUnit !== undefined && r.hargaUnit !== '';
      const hasJml = r.jumlah !== null && r.jumlah !== undefined && r.jumlah !== '';

      const prod = Number(r.produktivitas) || 0;
      const luas = Number(r.luasHa) || 0;
      const harga = Number(r.hargaUnit) || 0;
      const jml = Number(r.jumlah) || 0;

      // Kuantitas 0 aktual (terukur memang 0) HANYA jika ada penanda eksplisit bahwa 0 adalah hasil pengukuran valid
      if (r.isMeasuredZero === true && hasHarga && harga > 0) {
        return {
          quantity: 0,
          total: 0,
          isCalculable: true,
          isPendingQuantity: false
        };
      }

      // Harga terisi namun kuantitas (volume kayu & produktivitas) belum tersedia / belum diukur (> 0)
      if (hasHarga && harga > 0 && prod <= 0 && jml <= 0) {
        return {
          quantity: undefined,
          total: 0,
          isCalculable: false,
          isPendingQuantity: true,
          pendingReason: 'Volume kayu belum tersedia'
        };
      }

      if (hasProd && prod > 0 && hasLuas && luas > 0 && hasHarga && harga > 0) {
        const vol = Number((prod * luas).toFixed(2));
        return {
          quantity: vol,
          total: Math.round(vol * harga),
          isCalculable: true,
          isPendingQuantity: false
        };
      }

      if (hasJml && jml > 0 && hasHarga && harga > 0) {
        return {
          quantity: jml,
          total: Math.round(jml * harga),
          isCalculable: true,
          isPendingQuantity: false
        };
      }

      return { quantity: undefined, total: 0, isCalculable: false, isPendingQuantity: false };
    },
    defaultNewRow: (no, luasHa) => ({
      id: `ROW-PRV-FLR-${Date.now()}-${no}-${Math.random().toString(36).substring(2, 7)}`,
      no,
      item: '',
      produktivitas: null,
      hargaUnit: null,
      jumlah: null,
      luasHa: Number(luasHa) || 0,
      totalNilai: 0,
      source: ''
    }),
    initialRows: [
      {
        id: 'ROW-FLR-001',
        no: 1,
        item: 'Cemara Laut (Casuarina equisetifolia)',
        produktivitas: 33.18,
        hargaUnit: 3231311,
        jumlah: 2649.75,
        luasHa: 79.86,
        totalNilai: 8562456960,
        source: 'Dinas Kehutanan Provinsi Bali'
      },
      {
        id: 'ROW-FLR-002',
        no: 2,
        item: 'Sengon Laut (Falcataria moluccana)',
        produktivitas: 23.93,
        hargaUnit: 1090107,
        jumlah: 1911.05,
        luasHa: 79.86,
        totalNilai: 2083272580,
        source: 'Survei Lapangan Peneliti PKSPL'
      },
      {
        id: 'ROW-FLR-003',
        no: 3,
        item: 'Jabon Merah (Neolamarckia macrophylla)',
        produktivitas: 18.50,
        hargaUnit: 2098361,
        jumlah: 1477.41,
        luasHa: 79.86,
        totalNilai: 3099980000,
        source: 'Rencana Kelola Ekosistem 2024'
      },
      {
        id: 'ROW-FLR-004',
        no: 4,
        item: 'Rhizophora apiculata (Bakau Minyak)',
        produktivitas: 45.20,
        hargaUnit: 1710000,
        jumlah: 3609.67,
        luasHa: 79.86,
        totalNilai: 6174588375,
        source: 'Data Inventarisasi Tegakan 2024'
      }
    ]
  },

  // -------------------------------------------------------------
  // PROVISIONING - MARKET PRICE (FAUNA)
  // -------------------------------------------------------------
  'provisioning_market-price_fauna': {
    serviceId: 'provisioning',
    methodId: 'market-price',
    methodName: 'Market Price (Fauna)',
    subtitle: 'Nilai Pasar Aktual - Komoditas Perikanan & Satwa Pesisir/Mangrove',
    formulaDescription: 'Total = Kuantitas (Volume / Produktivitas × Luas) × Harga Satuan (Rp)',
    templateFileName: 'Provisioning_MarketPrice_Fauna.xlsx',
    columns: [
      { key: 'no', label: 'No', type: 'number', width: 'w-12', align: 'center' },
      { key: 'item', label: 'Jenis Fauna / Komoditas', type: 'text', width: 'min-w-[240px]', align: 'left', placeholder: 'Contoh: Ikan Tongkol, Kepiting Bakau, Bibit/Individu' },
      { key: 'produktivitas', label: 'Produktivitas', type: 'number', unit: 'satuan/ha/th', width: 'w-32', align: 'right', placeholder: '0.00' },
      { key: 'hargaUnit', label: 'Harga / Satuan (Rp)', type: 'number', width: 'w-40', align: 'right', placeholder: '0' },
      { key: 'jumlah', label: 'Kuantitas / Volume', type: 'number', width: 'w-32', align: 'right', placeholder: '0.00' },
      { key: 'luasHa', label: 'Luas (Ha)', type: 'number', width: 'w-28', align: 'right' },
      { key: 'totalNilai', label: 'Total Nilai (Rp)', type: 'readonly_calculated', width: 'min-w-[200px]', align: 'right', isTotal: true },
      { key: 'source', label: 'Sumber Data', type: 'text', width: 'min-w-[200px]', align: 'left', placeholder: 'TPI / Survei Nelayan 2024' },
    ],
    calculateRow: (r) => {
      const hasProd = r.produktivitas !== null && r.produktivitas !== undefined && r.produktivitas !== '';
      const hasLuas = r.luasHa !== null && r.luasHa !== undefined && r.luasHa !== '';
      const hasHarga = r.hargaUnit !== null && r.hargaUnit !== undefined && r.hargaUnit !== '';
      const hasJml = r.jumlah !== null && r.jumlah !== undefined && r.jumlah !== '';

      const prod = Number(r.produktivitas) || 0;
      const luas = Number(r.luasHa) || 0;
      const harga = Number(r.hargaUnit) || 0;
      const jml = Number(r.jumlah) || 0;

      // Kuantitas 0 aktual (terukur memang 0) HANYA jika ada penanda eksplisit bahwa 0 adalah hasil pengukuran valid
      if (r.isMeasuredZero === true && hasHarga && harga > 0) {
        return {
          quantity: 0,
          total: 0,
          isCalculable: true,
          isPendingQuantity: false
        };
      }

      // Harga terisi namun kuantitas (volume tangkapan & produktivitas) belum tersedia / belum diukur (> 0)
      if (hasHarga && harga > 0 && prod <= 0 && jml <= 0) {
        return {
          quantity: undefined,
          total: 0,
          isCalculable: false,
          isPendingQuantity: true,
          pendingReason: 'Volume tangkapan / kuantitas belum tersedia'
        };
      }

      // Opsi 1: Kuantitas dihitung dari Produktivitas x Luas (jika keduanya tersedia dan > 0)
      if (hasProd && prod > 0 && hasLuas && luas > 0 && hasHarga && harga > 0) {
        const qty = Number((prod * luas).toFixed(2));
        return {
          quantity: qty,
          total: Math.round(qty * harga),
          isCalculable: true,
          isPendingQuantity: false
        };
      }

      // Opsi 2: Kuantitas langsung dari Volume / Tangkapan / Jumlah Terukur (> 0)
      if (hasJml && jml > 0 && hasHarga && harga > 0) {
        return {
          quantity: jml,
          total: Math.round(jml * harga),
          isCalculable: true,
          isPendingQuantity: false
        };
      }

      return {
        quantity: undefined,
        total: 0,
        isCalculable: false,
        isPendingQuantity: false
      };
    },
    defaultNewRow: (no, luasHa) => ({
      id: `ROW-PRV-FAU-${Date.now()}-${no}-${Math.random().toString(36).substring(2, 7)}`,
      no,
      item: '',
      produktivitas: null,
      hargaUnit: null,
      jumlah: null,
      luasHa: Number(luasHa) || 0,
      totalNilai: 0,
      source: ''
    }),
    initialRows: [
      {
        id: 'ROW-FAU-001',
        no: 1,
        item: 'Kepiting Bakau (Scylla serrata)',
        produktivitas: 450,
        hargaUnit: 125000,
        jumlah: 35937,
        luasHa: 79.86,
        totalNilai: 4492125000,
        source: 'TPI & Kelompok Nelayan Lokal'
      },
      {
        id: 'ROW-FAU-002',
        no: 2,
        item: 'Ikan Bandeng Tambak (Chanos chanos)',
        produktivitas: 520,
        hargaUnit: 48000,
        jumlah: 41527.2,
        luasHa: 79.86,
        totalNilai: 1993305600,
        source: 'Dinas Kelautan dan Perikanan'
      }
    ]
  },

  // -------------------------------------------------------------
  // PROVISIONING - EFFECT ON PRODUCTION
  // -------------------------------------------------------------
  'provisioning_effect-production_flora': {
    serviceId: 'provisioning',
    methodId: 'effect-production',
    methodName: 'Effect on Production',
    subtitle: 'Efek terhadap Produksi Perikanan/Tambak',
    formulaDescription: 'Total = Output Terpengaruh (kg) × (Harga Pasar Output - Biaya Input Tambahan)',
    templateFileName: 'Provisioning_EffectOnProduction.xlsx',
    columns: [
      { key: 'no', label: 'No', type: 'number', width: 'w-12', align: 'center' },
      { key: 'item', label: 'Komoditas Terpengaruh', type: 'text', width: 'min-w-[220px]', align: 'left', placeholder: 'Contoh: Ikan Bandeng Tambak' },
      { key: 'outputQty', label: 'Output Terpengaruh (Q)', type: 'number', unit: 'kg/th', width: 'w-36', align: 'right', placeholder: '0' },
      { key: 'hargaOutput', label: 'Harga Output (Rp/kg)', type: 'number', width: 'w-36', align: 'right', placeholder: '0' },
      { key: 'biayaTambahan', label: 'Biaya Input Tambahan (Rp)', type: 'number', width: 'w-36', align: 'right', placeholder: '0' },
      { key: 'totalNilai', label: 'Total Nilai (Rp)', type: 'readonly_calculated', width: 'min-w-[180px]', align: 'right', isTotal: true },
      { key: 'source', label: 'Sumber Data', type: 'text', width: 'min-w-[180px]', align: 'left', placeholder: 'Survei Tambak 2024' },
    ],
    calculateRow: (r) => {
      const q = Number(r.outputQty) || 0;
      const p = Number(r.hargaOutput) || 0;
      const c = Number(r.biayaTambahan) || 0;
      const margin = Math.max(0, p - c);
      return { quantity: q, total: Math.round(q * margin) };
    },
    defaultNewRow: (no) => ({
      id: `ROW-EOP-${Date.now()}-${no}-${Math.random().toString(36).substring(2, 7)}`,
      no,
      item: '',
      outputQty: null,
      hargaOutput: null,
      biayaTambahan: null,
      totalNilai: 0,
      source: ''
    }),
    initialRows: [
      {
        id: 'ROW-EOP-001',
        no: 1,
        item: 'Ikan Bandeng Tambak (Chanos chanos)',
        outputQty: 8500,
        hargaOutput: 38000,
        biayaTambahan: 12000,
        totalNilai: 221000000,
        source: 'Dinas Kelautan dan Perikanan'
      },
      {
        id: 'ROW-EOP-002',
        no: 2,
        item: 'Udang Windu Tradisional (Penaeus monodon)',
        outputQty: 4200,
        hargaOutput: 95000,
        biayaTambahan: 25000,
        totalNilai: 294000000,
        source: 'Survei Tambak Pesisir 2024'
      }
    ]
  },

  // -------------------------------------------------------------
  // REGULATING - REPLACEMENT COST
  // -------------------------------------------------------------
  'regulating_replacement-cost': {
    serviceId: 'regulating',
    methodId: 'replacement-cost',
    methodName: 'Replacement Cost',
    subtitle: 'Biaya Penggantian Bangunan Fisik Penahan Gelombang',
    formulaDescription: 'Total = (Panjang Garis Pantai × Biaya Konstruksi Seawall) + Biaya Pemeliharaan',
    templateFileName: 'Regulating_ReplacementCost.xlsx',
    columns: [
      { key: 'no', label: 'No', type: 'number', width: 'w-12', align: 'center' },
      { key: 'item', label: 'Area / Aset Perlindungan', type: 'text', width: 'min-w-[240px]', align: 'left', placeholder: 'Contoh: Sabuk Hijau Pesisir Barat' },
      { key: 'panjangUnit', label: 'Panjang Garis Pantai', type: 'number', unit: 'meter', width: 'w-32', align: 'right', placeholder: '0' },
      { key: 'biayaPengganti', label: 'Biaya Seawall (Rp/m)', type: 'number', width: 'w-36', align: 'right', placeholder: '0' },
      { key: 'biayaPemeliharaan', label: 'Biaya Pemeliharaan (Rp)', type: 'number', width: 'w-36', align: 'right', placeholder: '0' },
      { key: 'totalNilai', label: 'Total Nilai (Rp)', type: 'readonly_calculated', width: 'min-w-[180px]', align: 'right', isTotal: true },
      { key: 'source', label: 'Sumber Data', type: 'text', width: 'min-w-[180px]', align: 'left', placeholder: 'Standar Biaya Dinas PUPR' },
    ],
    calculateRow: (r) => {
      const pjg = Number(r.panjangUnit) || 0;
      const bPengganti = Number(r.biayaPengganti) || 0;
      const bMaint = Number(r.biayaPemeliharaan) || 0;
      const total = Math.round(pjg * bPengganti + bMaint);
      return { quantity: pjg, total };
    },
    defaultNewRow: (no) => ({
      id: `ROW-REG-RC-${Date.now()}-${no}-${Math.random().toString(36).substring(2, 7)}`,
      no,
      item: '',
      panjangUnit: null,
      biayaPengganti: null,
      biayaPemeliharaan: null,
      totalNilai: 0,
      source: ''
    }),
    initialRows: [
      {
        id: 'ROW-RC-001',
        no: 1,
        item: 'Sabuk Hijau Pesisir Barat (Pelindung Tambak)',
        panjangUnit: 2500,
        biayaPengganti: 4500000,
        biayaPemeliharaan: 150000000,
        totalNilai: 11400000000,
        source: 'Standar Biaya Dinas PUPR'
      },
      {
        id: 'ROW-RC-002',
        no: 2,
        item: 'Mangrove Muara Estuari (Penahan Gelombang Pelabuhan)',
        panjangUnit: 1200,
        biayaPengganti: 5200000,
        biayaPemeliharaan: 80000000,
        totalNilai: 6320000000,
        source: 'Studi Kelayakan Breakwater 2024'
      }
    ]
  },

  // -------------------------------------------------------------
  // REGULATING - CARBON STORAGE
  // -------------------------------------------------------------
  'regulating_carbon-storage': {
    serviceId: 'regulating',
    methodId: 'carbon-storage',
    methodName: 'Climate / Carbon Storage',
    subtitle: 'Cadangan & Penyerapan Karbon Biru (Blue Carbon)',
    formulaDescription: 'Total = Stok Karbon (ton C/ha) × Luas (Ha) × 3.67 × Harga Karbon (Rp/ton CO2e)',
    templateFileName: 'Regulating_CarbonStorage.xlsx',
    columns: [
      { key: 'no', label: 'No', type: 'number', width: 'w-12', align: 'center' },
      { key: 'item', label: 'Komponen Karbon Biru', type: 'text', width: 'min-w-[240px]', align: 'left', placeholder: 'Contoh: Karbon Biomassa Atas Permukaan' },
      { key: 'stokKarbon', label: 'Stok Karbon', type: 'number', unit: 'ton C/ha', width: 'w-32', align: 'right', placeholder: '0.00' },
      { key: 'luasHa', label: 'Luas (Ha)', type: 'number', width: 'w-24', align: 'right' },
      { key: 'hargaKarbon', label: 'Harga Karbon (Rp/ton)', type: 'number', width: 'w-36', align: 'right', placeholder: '210000' },
      { key: 'totalNilai', label: 'Total Nilai (Rp)', type: 'readonly_calculated', width: 'min-w-[180px]', align: 'right', isTotal: true },
      { key: 'source', label: 'Sumber Data', type: 'text', width: 'min-w-[180px]', align: 'left', placeholder: 'Bursa Karbon IDX' },
    ],
    calculateRow: (r) => {
      const c = Number(r.stokKarbon) || 0;
      const l = Number(r.luasHa) || 0;
      const p = Number(r.hargaKarbon) || 0;
      // Konversi ton C ke ton CO2e = x 3.67
      const total = Math.round(c * l * 3.67 * p);
      return { quantity: Number((c * l).toFixed(2)), total };
    },
    defaultNewRow: (no, luasHa) => ({
      id: `ROW-REG-CS-${Date.now()}-${no}-${Math.random().toString(36).substring(2, 7)}`,
      no,
      item: '',
      stokKarbon: null,
      luasHa: Number(luasHa) || 0,
      hargaKarbon: null,
      totalNilai: 0,
      source: ''
    }),
    initialRows: [
      {
        id: 'ROW-CS-001',
        no: 1,
        item: 'Biomassa Karbon Atas Permukaan (Above-ground Biomass)',
        stokKarbon: 142.5,
        luasHa: 79.86,
        hargaKarbon: 210000,
        totalNilai: 8769399890,
        source: 'Hasil Analisis Laboratorium & Allometrik'
      },
      {
        id: 'ROW-CS-002',
        no: 2,
        item: 'Karbon Organik Sedimen Tanah (Soil Organic Carbon)',
        stokKarbon: 320.0,
        luasHa: 79.86,
        hargaKarbon: 210000,
        totalNilai: 19692997507,
        source: 'Faktor Emisi Karbon Mangrove KLHK'
      }
    ]
  },

  // -------------------------------------------------------------
  // SUPPORTING - HABITAT & NURSERY GROUND
  // -------------------------------------------------------------
  'supporting_nursery-ground': {
    serviceId: 'supporting',
    methodId: 'nursery-ground',
    methodName: 'Habitat & Nursery Ground',
    subtitle: 'Fungsi Asuhan & Pemijahan Benih Biota Laut',
    formulaDescription: 'Total = Luas Habitat (Ha) × Nilai Rekrutmen per Ha × (Tingkat Kerapatan % / 100)',
    templateFileName: 'Supporting_HabitatNursery.xlsx',
    columns: [
      { key: 'no', label: 'No', type: 'number', width: 'w-12', align: 'center' },
      { key: 'item', label: 'Zona Fungsi Habitat Biota', type: 'text', width: 'min-w-[240px]', align: 'left', placeholder: 'Contoh: Tempat Asuhan Larva Udang & Kepiting' },
      { key: 'luasHa', label: 'Luas Habitat (Ha)', type: 'number', width: 'w-28', align: 'right' },
      { key: 'kontribusiPerHa', label: 'Nilai Rekrutmen (Rp/ha/th)', type: 'number', width: 'w-36', align: 'right', placeholder: '0' },
      { key: 'efektivitas', label: 'Kerapatan (%)', type: 'number', width: 'w-24', align: 'right', placeholder: '100' },
      { key: 'totalNilai', label: 'Total Nilai (Rp)', type: 'readonly_calculated', width: 'min-w-[180px]', align: 'right', isTotal: true },
      { key: 'source', label: 'Sumber Data', type: 'text', width: 'min-w-[180px]', align: 'left', placeholder: 'Balai Riset Perikanan' },
    ],
    calculateRow: (r) => {
      const l = Number(r.luasHa) || 0;
      const n = Number(r.kontribusiPerHa) || 0;
      const efRaw = r.efektivitas;
      const efVal = efRaw !== null && efRaw !== undefined && efRaw !== '' ? Number(efRaw) : 100;
      const ef = (isNaN(efVal) ? 100 : efVal) / 100;
      const total = Math.round(l * n * ef);
      return { quantity: l, total };
    },
    defaultNewRow: (no, luasHa) => ({
      id: `ROW-SUP-NG-${Date.now()}-${no}-${Math.random().toString(36).substring(2, 7)}`,
      no,
      item: '',
      luasHa: Number(luasHa) || 0,
      kontribusiPerHa: null,
      efektivitas: null,
      totalNilai: 0,
      source: ''
    }),
    initialRows: [
      {
        id: 'ROW-SUP-001',
        no: 1,
        item: 'Zona Asuhan Larva Udang & Kepiting Bakau (Nursery Habitat)',
        luasHa: 79.86,
        kontribusiPerHa: 19052268,
        efektivitas: 95,
        totalNilai: 1445404473,
        source: 'Balai Riset Perikanan Budidaya'
      },
      {
        id: 'ROW-SUP-002',
        no: 2,
        item: 'Tempat Pemijahan Ikan Karang & Demersal (Spawning Ground)',
        luasHa: 79.86,
        kontribusiPerHa: 12500000,
        efektivitas: 85,
        totalNilai: 848512500,
        source: 'Kajian Biologi Perikanan PKSPL'
      }
    ]
  },

  // -------------------------------------------------------------
  // CULTURAL - TRAVEL COST METHOD (TCM)
  // -------------------------------------------------------------
  'cultural_tcm': {
    serviceId: 'cultural',
    methodId: 'tcm',
    methodName: 'Travel Cost Method (TCM)',
    subtitle: 'Metode Biaya Perjalanan Wisatawan Ekowisata',
    formulaDescription: 'Total = Jumlah Kunjungan (orang/th) × (Rata-rata Biaya Perjalanan + Tiket Masuk)',
    templateFileName: 'Cultural_TCM.xlsx',
    columns: [
      { key: 'no', label: 'No', type: 'number', width: 'w-12', align: 'center' },
      { key: 'item', label: 'Lokasi / Klaster Pengunjung', type: 'text', width: 'min-w-[240px]', align: 'left', placeholder: 'Contoh: Wisatawan Mancanegara Ekowisata Benoa' },
      { key: 'kunjungan', label: 'Jumlah Kunjungan (org/th)', type: 'number', width: 'w-36', align: 'right', placeholder: '0' },
      { key: 'biayaPerjalanan', label: 'Biaya Travel (Rp/org)', type: 'number', width: 'w-36', align: 'right', placeholder: '0' },
      { key: 'biayaTiket', label: 'Tiket Masuk (Rp/org)', type: 'number', width: 'w-32', align: 'right', placeholder: '0' },
      { key: 'totalNilai', label: 'Total Nilai (Rp)', type: 'readonly_calculated', width: 'min-w-[180px]', align: 'right', isTotal: true },
      { key: 'source', label: 'Sumber Data', type: 'text', width: 'min-w-[180px]', align: 'left', placeholder: 'Survei Pengunjung 2024' },
    ],
    calculateRow: (r) => {
      const q = Number(r.kunjungan) || 0;
      const bp = Number(r.biayaPerjalanan) || 0;
      const bt = Number(r.biayaTiket) || 0;
      const total = Math.round(q * (bp + bt));
      return { quantity: q, total };
    },
    defaultNewRow: (no) => ({
      id: `ROW-CUL-TCM-${Date.now()}-${no}-${Math.random().toString(36).substring(2, 7)}`,
      no,
      item: '',
      kunjungan: null,
      biayaPerjalanan: null,
      biayaTiket: null,
      totalNilai: 0,
      source: ''
    }),
    initialRows: [
      {
        id: 'ROW-TCM-001',
        no: 1,
        item: 'Wisatawan Nusantara (Domestik)',
        kunjungan: 18500,
        biayaPerjalanan: 350000,
        biayaTiket: 25000,
        totalNilai: 6937500000,
        source: 'Survei Pengunjung Pengelola Ekowisata'
      },
      {
        id: 'ROW-TCM-002',
        no: 2,
        item: 'Wisatawan Mancanegara (Internasional)',
        kunjungan: 6200,
        biayaPerjalanan: 1850000,
        biayaTiket: 100000,
        totalNilai: 12090000000,
        source: 'Survei Kunjungan Turis Mancanegara'
      }
    ]
  },

  // -------------------------------------------------------------
  // CULTURAL - CONTINGENT VALUATION METHOD (CVM)
  // -------------------------------------------------------------
  'cultural_cvm': {
    serviceId: 'cultural',
    methodId: 'cvm',
    methodName: 'Contingent Valuation Method (CVM)',
    subtitle: 'Kesediaan Membayar (WTP) Konservasi Hipotetis',
    formulaDescription: 'Total = (Jumlah Populasi / Responden × Rata-rata WTP per Tahun) - Biaya Program',
    templateFileName: 'Cultural_CVM.xlsx',
    columns: [
      { key: 'no', label: 'No', type: 'number', width: 'w-12', align: 'center' },
      { key: 'item', label: 'Kelompok Responden / Masyarakat', type: 'text', width: 'min-w-[240px]', align: 'left', placeholder: 'Contoh: Rumah Tangga Pesisir Barat' },
      { key: 'populasi', label: 'Jumlah Populasi / KK', type: 'number', width: 'w-32', align: 'right', placeholder: '0' },
      { key: 'wtp', label: 'Rata-rata WTP (Rp/KK/th)', type: 'number', width: 'w-36', align: 'right', placeholder: '0' },
      { key: 'biayaProgram', label: 'Biaya Program (Rp)', type: 'number', width: 'w-32', align: 'right', placeholder: '0' },
      { key: 'totalNilai', label: 'Total Nilai (Rp)', type: 'readonly_calculated', width: 'min-w-[180px]', align: 'right', isTotal: true },
      { key: 'source', label: 'Sumber Data', type: 'text', width: 'min-w-[180px]', align: 'left', placeholder: 'Kuesioner WTP 2024' },
    ],
    calculateRow: (r) => {
      const pop = Number(r.populasi) || 0;
      const w = Number(r.wtp) || 0;
      const c = Number(r.biayaProgram) || 0;
      const total = Math.max(0, Math.round(pop * w - c));
      return { quantity: pop, total };
    },
    defaultNewRow: (no) => ({
      id: `ROW-CUL-CVM-${Date.now()}-${no}-${Math.random().toString(36).substring(2, 7)}`,
      no,
      item: '',
      populasi: null,
      wtp: null,
      biayaProgram: null,
      totalNilai: 0,
      source: ''
    }),
    initialRows: [
      {
        id: 'ROW-CVM-001',
        no: 1,
        item: 'Masyarakat Rumah Tangga Sekitar Pesisir',
        populasi: 4500,
        wtp: 120000,
        biayaProgram: 45000000,
        totalNilai: 495000000,
        source: 'Kuesioner WTP Masyarakat Lokal 2024'
      },
      {
        id: 'ROW-CVM-002',
        no: 2,
        item: 'Pelaku Usaha Wisata & UMKM Pesisir',
        populasi: 280,
        wtp: 750000,
        biayaProgram: 20000000,
        totalNilai: 190000000,
        source: 'Kuesioner WTP Pelaku Usaha'
      }
    ]
  },

  // -------------------------------------------------------------
  // CULTURAL - CHOICE EXPERIMENT
  // -------------------------------------------------------------
  'cultural_choice-experiment': {
    serviceId: 'cultural',
    methodId: 'choice-experiment',
    methodName: 'Choice Experiment',
    subtitle: 'Preferensi Masyarakat atas Atribut Jasa Lingkungan',
    formulaDescription: 'Total = (Jumlah Responden × Nilai Marginal Atribut) - Biaya Skema Pengelolaan',
    templateFileName: 'Cultural_ChoiceExperiment.xlsx',
    columns: [
      { key: 'no', label: 'No', type: 'number', width: 'w-12', align: 'center' },
      { key: 'item', label: 'Skenario Atribut Kebijakan', type: 'text', width: 'min-w-[240px]', align: 'left', placeholder: 'Contoh: Skenario Perlindungan Kualitas Air & Satwa' },
      { key: 'responden', label: 'Jumlah Responden (N)', type: 'number', width: 'w-32', align: 'right', placeholder: '0' },
      { key: 'nilaiMarginal', label: 'Nilai Marginal (Rp/N)', type: 'number', width: 'w-36', align: 'right', placeholder: '0' },
      { key: 'biayaSkema', label: 'Biaya Skema (Rp)', type: 'number', width: 'w-32', align: 'right', placeholder: '0' },
      { key: 'totalNilai', label: 'Total Nilai (Rp)', type: 'readonly_calculated', width: 'min-w-[180px]', align: 'right', isTotal: true },
      { key: 'source', label: 'Sumber Data', type: 'text', width: 'min-w-[180px]', align: 'left', placeholder: 'Model Logit Eksperimen' },
    ],
    calculateRow: (r) => {
      const n = Number(r.responden) || 0;
      const m = Number(r.nilaiMarginal) || 0;
      const c = Number(r.biayaSkema) || 0;
      const total = Math.max(0, Math.round(n * m - c));
      return { quantity: n, total };
    },
    defaultNewRow: (no) => ({
      id: `ROW-CUL-CE-${Date.now()}-${no}-${Math.random().toString(36).substring(2, 7)}`,
      no,
      item: '',
      responden: null,
      nilaiMarginal: null,
      biayaSkema: null,
      totalNilai: 0,
      source: ''
    }),
    initialRows: [
      {
        id: 'ROW-CE-001',
        no: 1,
        item: 'Skenario Peningkatan Kejernihan Air & Keanekaragaman Burung Air',
        responden: 1200,
        nilaiMarginal: 185000,
        biayaSkema: 35000000,
        totalNilai: 187000000,
        source: 'Model Estimasi Multinomial Logit'
      },
      {
        id: 'ROW-CE-002',
        no: 2,
        item: 'Skenario Restorasi Kanopi Mangrove & Fasilitas Interpretasi Edukasi',
        responden: 1200,
        nilaiMarginal: 240000,
        biayaSkema: 50000000,
        totalNilai: 238000000,
        source: 'Hasil Analisis Choice Experiment'
      }
    ]
  },

  // -------------------------------------------------------------
  // REGULATING - AVOIDED COST (Biaya Kerusakan yang Dihindari)
  // -------------------------------------------------------------
  'regulating_avoided-cost': {
    serviceId: 'regulating',
    methodId: 'avoided-cost',
    methodName: 'Avoided Cost',
    subtitle: 'Biaya Kerusakan Ekonomi yang Dihindari',
    formulaDescription: 'Total = Nilai Aset Berisiko (Rp) × Probabilitas Bencana per Tahun',
    templateFileName: 'Regulating_AvoidedCost.xlsx',
    columns: [
      { key: 'no', label: 'No', type: 'number', width: 'w-12', align: 'center' },
      { key: 'item', label: 'Aset / Zona yang Terlindungi', type: 'text', width: 'min-w-[240px]', align: 'left', placeholder: 'Contoh: Permukiman Pesisir Zona Barat' },
      { key: 'nilaiAset', label: 'Nilai Aset Berisiko (Rp)', type: 'number', width: 'w-40', align: 'right', placeholder: '0' },
      { key: 'probabilitasBencana', label: 'Probabilitas Bencana (/th)', type: 'number', width: 'w-36', align: 'right', placeholder: '0.00' },
      { key: 'totalNilai', label: 'Total Nilai (Rp)', type: 'readonly_calculated', width: 'min-w-[180px]', align: 'right', isTotal: true },
      { key: 'source', label: 'Sumber Data', type: 'text', width: 'min-w-[180px]', align: 'left', placeholder: 'BPBD / Kajian Risiko Bencana' },
    ],
    calculateRow: (r) => {
      const aset = Number(r.nilaiAset) || 0;
      const prob = Math.min(1, Math.max(0, Number(r.probabilitasBencana) || 0));
      const total = Math.round(aset * prob);
      return { quantity: prob, total };
    },
    defaultNewRow: (no) => ({
      id: `ROW-REG-AC-${Date.now()}-${no}-${Math.random().toString(36).substring(2, 7)}`,
      no,
      item: '',
      nilaiAset: null,
      probabilitasBencana: null,
      totalNilai: 0,
      source: ''
    }),
    initialRows: [
      {
        id: 'ROW-AC-001',
        no: 1,
        item: 'Permukiman Warga Pesisir Teluk Benoa (Risiko Gelombang Pasang)',
        nilaiAset: 35000000000,
        probabilitasBencana: 0.15,
        totalNilai: 5250000000,
        source: 'Kajian Risiko Bencana BPBD'
      },
      {
        id: 'ROW-AC-002',
        no: 2,
        item: 'Tambak Budidaya & Fasilitas Usaha Nelayan (Risiko Abrasi)',
        nilaiAset: 18000000000,
        probabilitasBencana: 0.20,
        totalNilai: 3600000000,
        source: 'Laporan Kerentanan Pesisir DKP'
      }
    ]
  },

  // -------------------------------------------------------------
  // REGULATING - HPM (Hedonic Pricing Method)
  // -------------------------------------------------------------
  'regulating_hpm': {
    serviceId: 'regulating',
    methodId: 'hpm',
    methodName: 'HPM (Hedonic Pricing)',
    subtitle: 'Premi Kualitas Lingkungan pada Nilai Properti',
    formulaDescription: 'Total = Jumlah Unit Properti × Premi Kualitas Lingkungan per Unit (Rp)',
    templateFileName: 'Regulating_HPM.xlsx',
    columns: [
      { key: 'no', label: 'No', type: 'number', width: 'w-12', align: 'center' },
      { key: 'item', label: 'Kawasan / Segmen Properti', type: 'text', width: 'min-w-[240px]', align: 'left', placeholder: 'Contoh: Perumahan Pesisir Timur Mangrove' },
      { key: 'jumlahUnit', label: 'Jumlah Unit Properti', type: 'number', width: 'w-32', align: 'right', placeholder: '0' },
      { key: 'hargaLingkungan', label: 'Premi Kualitas Lingkungan (Rp/unit)', type: 'number', width: 'w-44', align: 'right', placeholder: '0' },
      { key: 'totalNilai', label: 'Total Nilai (Rp)', type: 'readonly_calculated', width: 'min-w-[180px]', align: 'right', isTotal: true },
      { key: 'source', label: 'Sumber Data', type: 'text', width: 'min-w-[180px]', align: 'left', placeholder: 'BPN / NJOP / Survei Harga Properti' },
    ],
    calculateRow: (r) => {
      const unit = Number(r.jumlahUnit) || 0;
      const premi = Number(r.hargaLingkungan) || 0;
      const total = Math.round(unit * premi);
      return { quantity: unit, total };
    },
    defaultNewRow: (no) => ({
      id: `ROW-REG-HPM-${Date.now()}-${no}-${Math.random().toString(36).substring(2, 7)}`,
      no,
      item: '',
      jumlahUnit: null,
      hargaLingkungan: null,
      totalNilai: 0,
      source: ''
    }),
    initialRows: [
      {
        id: 'ROW-HPM-001',
        no: 1,
        item: 'Kompleks Villa & Residensial Bersebelahan Sabuk Hijau',
        jumlahUnit: 85,
        hargaLingkungan: 45000000,
        totalNilai: 3825000000,
        source: 'Survei NJOP & Pasar Properti Agen Real Estate'
      },
      {
        id: 'ROW-HPM-002',
        no: 2,
        item: 'Rumah Tinggal Dekat Kawasan Estuari Terlindung',
        jumlahUnit: 210,
        hargaLingkungan: 18000000,
        totalNilai: 3780000000,
        source: 'Analisis Regresi Hedonik PKSPL'
      }
    ]
  },

  // -------------------------------------------------------------
  // SUPPORTING - NUTRIENT CYCLING (Siklus Nutrisi & Perangkap Sedimen)
  // -------------------------------------------------------------
  'supporting_nutrient-cycling': {
    serviceId: 'supporting',
    methodId: 'nutrient-cycling',
    methodName: 'Nutrient Cycling',
    subtitle: 'Siklus Nutrisi & Pengendapan Sedimen Estuari',
    formulaDescription: 'Total = Laju Sedimentasi (ton/ha/th) × Luas (ha) × Nilai Konservasi Nutrisi (Rp/ton)',
    templateFileName: 'Supporting_NutrientCycling.xlsx',
    columns: [
      { key: 'no', label: 'No', type: 'number', width: 'w-12', align: 'center' },
      { key: 'item', label: 'Komponen Nutrisi / Sedimen', type: 'text', width: 'min-w-[240px]', align: 'left', placeholder: 'Contoh: Perangkap Sedimen Kaya N & P' },
      { key: 'lajuSedimentasi', label: 'Laju Sedimentasi (ton/ha/th)', type: 'number', width: 'w-40', align: 'right', placeholder: '0.00' },
      { key: 'luasHa', label: 'Luas (Ha)', type: 'number', width: 'w-24', align: 'right' },
      { key: 'nilaiKonservasi', label: 'Nilai Konservasi Nutrisi (Rp/ton)', type: 'number', width: 'w-44', align: 'right', placeholder: '0' },
      { key: 'totalNilai', label: 'Total Nilai (Rp)', type: 'readonly_calculated', width: 'min-w-[180px]', align: 'right', isTotal: true },
      { key: 'source', label: 'Sumber Data', type: 'text', width: 'min-w-[180px]', align: 'left', placeholder: 'Analisis Sedimen Lapangan' },
    ],
    calculateRow: (r) => {
      const laju = Number(r.lajuSedimentasi) || 0;
      const luas = Number(r.luasHa) || 0;
      const nilai = Number(r.nilaiKonservasi) || 0;
      const total = Math.round(laju * luas * nilai);
      return { quantity: Number((laju * luas).toFixed(2)), total };
    },
    defaultNewRow: (no, luasHa) => ({
      id: `ROW-SUP-NC-${Date.now()}-${no}-${Math.random().toString(36).substring(2, 7)}`,
      no,
      item: '',
      lajuSedimentasi: null,
      luasHa: Number(luasHa) || 0,
      nilaiKonservasi: null,
      totalNilai: 0,
      source: ''
    }),
    initialRows: [
      {
        id: 'ROW-NC-001',
        no: 1,
        item: 'Retensi Sedimen Organik & Nitrogen (N)',
        lajuSedimentasi: 12.8,
        luasHa: 79.86,
        nilaiKonservasi: 650000,
        totalNilai: 664434240,
        source: 'Hasil Uji Sampel Sedimen Laboratorium'
      },
      {
        id: 'ROW-NC-002',
        no: 2,
        item: 'Perangkap Fosfor (P) & Pengendap Partikel Logam',
        lajuSedimentasi: 8.4,
        luasHa: 79.86,
        nilaiKonservasi: 820000,
        totalNilai: 550079040,
        source: 'Kajian Kapasitas Asimilasi Estuari'
      }
    ]
  }
};

/**
 * Helper untuk mengambil schema yang tepat berdasarkan serviceId, methodId, dan biota
 */
export const getMethodSchema = (serviceId?: any, methodId?: any, biota?: any): MethodSchema => {
  const safeString = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) {
      return safeString(val[0]);
    }
    if (typeof val === 'object') {
      return String(val.id || val.methodId || val.serviceId || val.code || val.value || val.name || val.key || '').trim();
    }
    return String(val).trim();
  };

  const strService = safeString(serviceId) || 'provisioning';
  const strMethod = safeString(methodId);
  const strBiota = safeString(biota);

  const normServiceRaw = strService.toLowerCase();
  const normService = normServiceRaw.includes('provisioning') ? 'provisioning' :
                      normServiceRaw.includes('regulating') ? 'regulating' :
                      normServiceRaw.includes('supporting') ? 'supporting' :
                      normServiceRaw.includes('cultural') ? 'cultural' : 'provisioning';

  const normMethodRaw = strMethod.toLowerCase();
  const cleanMeth = normMethodRaw.replace(/[^a-z0-9]/g, '');

  // 1. Try direct keys in METHOD_SCHEMAS
  if (normMethodRaw) {
    const key1 = `${normService}_${normMethodRaw}_${strBiota || 'flora'}`;
    if (METHOD_SCHEMAS[key1]) return METHOD_SCHEMAS[key1];

    const key2 = `${normService}_${normMethodRaw}`;
    if (METHOD_SCHEMAS[key2]) return METHOD_SCHEMAS[key2];

    // 2. Search METHOD_SCHEMAS by comparing methodId or methodName
    const found = Object.values(METHOD_SCHEMAS).find(s => {
      if (s.serviceId !== normService) return false;
      const sMethId = (s.methodId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const sMethName = (s.methodName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchMeth = cleanMeth === sMethId || cleanMeth === sMethName ||
                        (cleanMeth && sMethId.includes(cleanMeth)) || (sMethId && cleanMeth.includes(sMethId)) ||
                        (cleanMeth && sMethName.includes(cleanMeth)) || (sMethName && cleanMeth.includes(sMethName));
      if (!matchMeth) return false;

      if (normService === 'provisioning') {
        const targetBiota = (strBiota || 'flora').toLowerCase();
        return s.methodName.toLowerCase().includes(targetBiota);
      }
      return true;
    });

    if (found) return found;
  }

  // Default fallbacks per service
  if (normService === 'provisioning') {
    return (strBiota === 'fauna' && METHOD_SCHEMAS['provisioning_market-price_fauna'])
      ? METHOD_SCHEMAS['provisioning_market-price_fauna']
      : METHOD_SCHEMAS['provisioning_market-price_flora'];
  }
  if (normService === 'regulating') return METHOD_SCHEMAS['regulating_replacement-cost'];
  if (normService === 'supporting') return METHOD_SCHEMAS['supporting_nursery-ground'];
  if (normService === 'cultural') return METHOD_SCHEMAS['cultural_tcm'];

  return METHOD_SCHEMAS['provisioning_market-price_flora'];
};
