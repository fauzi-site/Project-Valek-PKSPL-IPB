export type EcosystemServiceId = 'provisioning' | 'regulating' | 'supporting' | 'cultural';

export type BiotaCategory = 'flora' | 'fauna';

export interface ValuationMethod {
  id: string;
  name: string;
  subtitle: string;
  category: EcosystemServiceId;
  description: string;
  allowedBiota?: BiotaCategory[];
  formulaDescription: string;
}

export interface EcosystemServiceConfig {
  id: EcosystemServiceId;
  name: string;
  nameId: string;
  description: string;
  badgeColor: string;
  badgeBg: string;
  methods: ValuationMethod[];
}

export interface AreaServiceConfig {
  activeServices: Record<EcosystemServiceId, boolean>;
  selectedMethods: Record<EcosystemServiceId, string | string[]>;
  biota?: BiotaCategory;
}

/**
 * Normalizes selected methods for a service to always return an array of method IDs.
 */
export const normalizeMethods = (methods: any, defaultMethod: string): string[] => {
  const toStr = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'object') return String(val.id || val.methodId || val.code || val.value || '').trim();
    return String(val).trim();
  };

  if (Array.isArray(methods)) {
    const list = methods.map(toStr).filter(m => m.length > 0);
    return list.length > 0 ? list : [defaultMethod];
  }
  const single = toStr(methods);
  if (single.length > 0) {
    return [single];
  }
  return [defaultMethod];
};
