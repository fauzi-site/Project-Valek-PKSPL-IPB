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
export const normalizeMethods = (methods: string | string[] | undefined, defaultMethod: string): string[] => {
  if (Array.isArray(methods)) {
    return methods.filter(m => typeof m === 'string' && m.trim().length > 0);
  }
  if (typeof methods === 'string' && methods.trim().length > 0) {
    return [methods];
  }
  return [defaultMethod];
};
