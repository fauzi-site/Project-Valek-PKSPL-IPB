import { LandCoverPolygon, IndexItem } from '../types/spatial';
import { EcosystemServiceId, AreaServiceConfig, normalizeMethods } from '../types/valuation';
import { isMockProject } from '../context/SpreadsheetContext';
import { getMethodSchema } from '../types/methodSchemas';

export interface ActiveMethodItem {
  methodId: string;
  methodName: string;
  nominal: number;
}

export interface ServiceContributionItem {
  id: EcosystemServiceId;
  code: string;
  name: string;
  shortName: string;
  nominal: number;
  percentage: number;
  color: string;
  methods: ActiveMethodItem[];
  methodNamesLabel: string;
  methodNamesBullet: string;
}

export interface ComponentCompositionItem {
  name: string;
  shortName: string;
  value: number;
  percentage: number;
  color: string;
  description: string;
}

export interface AreaValuationBreakdown {
  id: string;
  name: string;
  indexCode: string;
  indexName?: string;
  areaHa: number;
  provTotal: number;
  regTotal: number;
  suppTotal: number;
  cultTotal: number;
  totalValue: number;
  percentageOfTev: number;
  valuePerHa: number;
}

export interface ProjectValuationResult {
  projectId: string;
  provTotal: number;
  regTotal: number;
  suppTotal: number;
  cultTotal: number;
  grandTEV: number;
  directValue: number;    // DUV = Provisioning + Cultural
  indirectValue: number;  // IUV = Regulating
  supportingValue: number;// SUV = Supporting
  totalAreaHa: number;
  tevPerHa: number;
  dominantService: {
    id: string;
    name: string;
    nominal: number;
    percentage: number;
  };
  serviceContributions: ServiceContributionItem[];
  componentCompositions: ComponentCompositionItem[];
  areaBreakdowns: AreaValuationBreakdown[];
  hasData: boolean;
}

/**
 * Standard project-wide valuation aggregator.
 * Computes TEV across ALL Land Covers and Indices of a project without relying on single-area filters.
 */
export function aggregateProjectValuation(
  projectId: string,
  landCovers: LandCoverPolygon[],
  indices: IndexItem[],
  getAreaConfig: (areaId: string) => AreaServiceConfig,
  getServiceSubtotal: (
    projectId: string,
    areaId: string,
    serviceId: string,
    methodId: string,
    biota?: string
  ) => number,
  getGrandTotalForArea?: (
    projectId: string,
    areaId: string,
    activeServices?: Record<EcosystemServiceId, boolean>,
    selectedMethods?: Record<EcosystemServiceId, string | string[]>,
    biota?: string
  ) => number
): ProjectValuationResult {
  const isMock = isMockProject(projectId);
  const safeLandCovers = Array.isArray(landCovers) && landCovers.length > 0 ? landCovers : [];

  let sumRawProv = 0;
  let sumRawReg = 0;
  let sumRawSupp = 0;
  let sumRawCult = 0;

  // Track active methods and subtotals across project
  const serviceMethodsMap: Record<EcosystemServiceId, Map<string, { methodName: string; nominal: number }>> = {
    provisioning: new Map(),
    regulating: new Map(),
    supporting: new Map(),
    cultural: new Map(),
  };

  const areaBreakdowns: AreaValuationBreakdown[] = safeLandCovers.map((lc) => {
    const cfg = getAreaConfig ? getAreaConfig(lc.id) : null;
    const act = cfg?.activeServices || { provisioning: true, regulating: true, supporting: true, cultural: true };
    const meth = cfg?.selectedMethods || {
      provisioning: 'market-price',
      regulating: 'replacement-cost',
      supporting: 'nursery-ground',
      cultural: 'tcm',
    };
    const biota = cfg?.biota || 'flora';

    let prov = 0;
    let reg = 0;
    let supp = 0;
    let cult = 0;

    if (act.provisioning) {
      const pMethods = normalizeMethods(meth.provisioning, 'market-price');
      pMethods.forEach(m => {
        const mSub = getServiceSubtotal(projectId, lc.id, 'provisioning', m, 'flora') +
                     getServiceSubtotal(projectId, lc.id, 'provisioning', m, 'fauna');
        prov += mSub;

        const schema = getMethodSchema('provisioning', m, 'flora');
        const mName = schema.methodName || m;
        const map = serviceMethodsMap.provisioning;
        const prev = map.get(m)?.nominal || 0;
        map.set(m, { methodName: mName, nominal: prev + mSub });
      });

      if (prov === 0 && isMock && Array.isArray(lc.serviceDetails)) {
        prov = lc.serviceDetails.find((d) => d.serviceId === 'provisioning')?.value || 0;
      }
    }

    if (act.regulating) {
      const rMethods = normalizeMethods(meth.regulating, 'replacement-cost');
      rMethods.forEach(m => {
        const mSub = getServiceSubtotal(projectId, lc.id, 'regulating', m, 'none');
        reg += mSub;

        const schema = getMethodSchema('regulating', m, 'none');
        const mName = schema.methodName || m;
        const map = serviceMethodsMap.regulating;
        const prev = map.get(m)?.nominal || 0;
        map.set(m, { methodName: mName, nominal: prev + mSub });
      });

      if (reg === 0 && isMock && Array.isArray(lc.serviceDetails)) {
        reg = lc.serviceDetails.find((d) => d.serviceId === 'regulating')?.value || 0;
      }
    }

    if (act.supporting) {
      const sMethods = normalizeMethods(meth.supporting, 'nursery-ground');
      sMethods.forEach(m => {
        const mSub = getServiceSubtotal(projectId, lc.id, 'supporting', m, 'none');
        supp += mSub;

        const schema = getMethodSchema('supporting', m, 'none');
        const mName = schema.methodName || m;
        const map = serviceMethodsMap.supporting;
        const prev = map.get(m)?.nominal || 0;
        map.set(m, { methodName: mName, nominal: prev + mSub });
      });

      if (supp === 0 && isMock && Array.isArray(lc.serviceDetails)) {
        supp = lc.serviceDetails.find((d) => d.serviceId === 'supporting')?.value || 0;
      }
    }

    if (act.cultural) {
      const cMethods = normalizeMethods(meth.cultural, 'tcm');
      cMethods.forEach(m => {
        const mSub = getServiceSubtotal(projectId, lc.id, 'cultural', m, 'none');
        cult += mSub;

        const schema = getMethodSchema('cultural', m, 'none');
        const mName = schema.methodName || m;
        const map = serviceMethodsMap.cultural;
        const prev = map.get(m)?.nominal || 0;
        map.set(m, { methodName: mName, nominal: prev + mSub });
      });

      if (cult === 0 && isMock && Array.isArray(lc.serviceDetails)) {
        cult = lc.serviceDetails.find((d) => d.serviceId === 'cultural')?.value || 0;
      }
    }

    let areaTotal = prov + reg + supp + cult;
    if (areaTotal === 0 && getGrandTotalForArea) {
      const g = getGrandTotalForArea(projectId, lc.id, act, meth, biota);
      if (g > 0) areaTotal = g;
    }
    if (areaTotal === 0 && isMock && lc.totalValue) {
      areaTotal = lc.totalValue;
    }

    sumRawProv += prov;
    sumRawReg += reg;
    sumRawSupp += supp;
    sumRawCult += cult;

    const areaHa = Number(lc.areaHa) || 0;
    const valuePerHa = areaHa > 0 ? Math.round(areaTotal / areaHa) : 0;

    const linkedIndex = indices.find(
      (idx) => idx.id === lc.indexId || idx.code === lc.indexCode || idx.code === lc.id
    );

    return {
      id: lc.id,
      name: lc.name || 'Area Tutupan',
      indexCode: lc.indexCode || linkedIndex?.code || `IDX-${lc.id}`,
      indexName: linkedIndex?.name || lc.name,
      areaHa,
      provTotal: prov,
      regTotal: reg,
      suppTotal: supp,
      cultTotal: cult,
      totalValue: areaTotal,
      percentageOfTev: 0,
      valuePerHa,
    };
  });

  const rawGrand = sumRawProv + sumRawReg + sumRawSupp + sumRawCult;

  const isProvActive = safeLandCovers.length === 0 || safeLandCovers.some(lc => {
    const cfg = getAreaConfig ? getAreaConfig(lc.id) : null;
    return cfg?.activeServices ? (cfg.activeServices.provisioning ?? true) : true;
  });
  const isRegActive = safeLandCovers.length === 0 || safeLandCovers.some(lc => {
    const cfg = getAreaConfig ? getAreaConfig(lc.id) : null;
    return cfg?.activeServices ? (cfg.activeServices.regulating ?? true) : true;
  });
  const isSuppActive = safeLandCovers.length === 0 || safeLandCovers.some(lc => {
    const cfg = getAreaConfig ? getAreaConfig(lc.id) : null;
    return cfg?.activeServices ? (cfg.activeServices.supporting ?? true) : true;
  });
  const isCultActive = safeLandCovers.length === 0 || safeLandCovers.some(lc => {
    const cfg = getAreaConfig ? getAreaConfig(lc.id) : null;
    return cfg?.activeServices ? (cfg.activeServices.cultural ?? true) : true;
  });

  const provTotal = isProvActive ? ((rawGrand > 0 || !isMock) ? sumRawProv : (isMock ? 19920297915 : 0)) : 0;
  const regTotal = isRegActive ? ((rawGrand > 0 || !isMock) ? sumRawReg : (isMock ? 2357865750 : 0)) : 0;
  const suppTotal = isSuppActive ? ((rawGrand > 0 || !isMock) ? sumRawSupp : (isMock ? 1521514120 : 0)) : 0;
  const cultTotal = isCultActive ? ((rawGrand > 0 || !isMock) ? sumRawCult : (isMock ? 1072000000 : 0)) : 0;
  const grandTEV = provTotal + regTotal + suppTotal + cultTotal;

  areaBreakdowns.forEach((item) => {
    item.percentageOfTev = grandTEV > 0 ? (item.totalValue / grandTEV) * 100 : 0;
  });

  const directValue = provTotal + cultTotal;
  const indirectValue = regTotal;
  const supportingValue = suppTotal;

  const totalAreaHa = safeLandCovers.reduce((s, lc) => s + (Number(lc.areaHa) || 0), 0);
  const tevPerHa = totalAreaHa > 0 ? Math.round(grandTEV / totalAreaHa) : 0;

  // Format method items & labels per service
  const buildMethodMeta = (sId: EcosystemServiceId, defaultM: string) => {
    const map = serviceMethodsMap[sId];
    if (map.size === 0) {
      const defaultSchema = getMethodSchema(sId, defaultM, sId === 'provisioning' ? 'flora' : 'none');
      const defaultName = defaultSchema.methodName || defaultM;
      const defaultNominal = sId === 'provisioning' ? provTotal : sId === 'regulating' ? regTotal : sId === 'supporting' ? suppTotal : cultTotal;
      return {
        methods: [{ methodId: defaultM, methodName: defaultName, nominal: defaultNominal }],
        methodNamesLabel: defaultName,
        methodNamesBullet: `• ${defaultName}`
      };
    }
    const methods: ActiveMethodItem[] = Array.from(map.entries()).map(([mId, meta]) => ({
      methodId: mId,
      methodName: meta.methodName,
      nominal: meta.nominal
    }));
    const methodNamesLabel = methods.map(m => m.methodName).join(', ');
    const methodNamesBullet = methods.map(m => `• ${m.methodName}`).join('\n');
    return { methods, methodNamesLabel, methodNamesBullet };
  };

  const provMeta = buildMethodMeta('provisioning', 'market-price');
  const regMeta  = buildMethodMeta('regulating', 'replacement-cost');
  const suppMeta = buildMethodMeta('supporting', 'nursery-ground');
  const cultMeta = buildMethodMeta('cultural', 'tcm');

  const allContributions: ServiceContributionItem[] = [
    {
      id: 'provisioning',
      code: 'A',
      name: 'Provisioning Services (Penyediaan)',
      shortName: 'Provisioning',
      nominal: provTotal,
      percentage: grandTEV > 0 ? (provTotal / grandTEV) * 100 : 0,
      color: '#0e7490',
      ...provMeta
    },
    {
      id: 'regulating',
      code: 'B',
      name: 'Regulating Services (Pengaturan)',
      shortName: 'Regulating',
      nominal: regTotal,
      percentage: grandTEV > 0 ? (regTotal / grandTEV) * 100 : 0,
      color: '#2563eb',
      ...regMeta
    },
    {
      id: 'supporting',
      code: 'C',
      name: 'Supporting Services (Pendukung)',
      shortName: 'Supporting',
      nominal: suppTotal,
      percentage: grandTEV > 0 ? (suppTotal / grandTEV) * 100 : 0,
      color: '#7c3aed',
      ...suppMeta
    },
    {
      id: 'cultural',
      code: 'D',
      name: 'Cultural Services (Budaya & Rekreasi)',
      shortName: 'Cultural',
      nominal: cultTotal,
      percentage: grandTEV > 0 ? (cultTotal / grandTEV) * 100 : 0,
      color: '#d97706',
      ...cultMeta
    },
  ];

  const serviceContributions = allContributions.filter(s => {
    if (s.id === 'provisioning') return isProvActive;
    if (s.id === 'regulating') return isRegActive;
    if (s.id === 'supporting') return isSuppActive;
    if (s.id === 'cultural') return isCultActive;
    return true;
  });

  const sortedContributions = [...serviceContributions].sort((a, b) => b.nominal - a.nominal);
  const dominant = sortedContributions[0] || {
    id: '',
    name: 'Tidak ada jasa aktif',
    nominal: 0,
    percentage: 0,
  };

  const componentCompositions: ComponentCompositionItem[] = [
    ...((isProvActive || isCultActive) ? [{
      name: 'Direct Use Value (DUV)',
      shortName: 'DUV',
      value: directValue,
      percentage: grandTEV > 0 ? (directValue / grandTEV) * 100 : 0,
      color: '#2563eb',
      description: 'Manfaat langsung: komoditas panen & wisata rekreasi',
    }] : []),
    ...(isRegActive ? [{
      name: 'Indirect Use Value (IUV)',
      shortName: 'IUV',
      value: indirectValue,
      percentage: grandTEV > 0 ? (indirectValue / grandTEV) * 100 : 0,
      color: '#0ea5e9',
      description: 'Manfaat tidak langsung: perlindungan fisik & stabilitas pesisir',
    }] : []),
    ...(isSuppActive ? [{
      name: 'Supporting Use Value (SUV)',
      shortName: 'SUV',
      value: supportingValue,
      percentage: grandTEV > 0 ? (supportingValue / grandTEV) * 100 : 0,
      color: '#8b5cf6',
      description: 'Fungsi penopang ekologis: asuhan benih & keanekaragaman hayati',
    }] : []),
  ];

  return {
    projectId,
    provTotal,
    regTotal,
    suppTotal,
    cultTotal,
    grandTEV,
    directValue,
    indirectValue,
    supportingValue,
    totalAreaHa,
    tevPerHa,
    dominantService: {
      id: dominant.id,
      name: dominant.name,
      nominal: dominant.nominal,
      percentage: dominant.percentage,
    },
    serviceContributions,
    componentCompositions,
    areaBreakdowns,
    hasData: grandTEV > 0,
  };
}
