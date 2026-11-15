import type { Remark } from './briefing';

export type ObjectiveId = 'mapping' | 'ice' | 'thermal' | 'composition';
export type InstrumentId = 'camera' | 'neutron' | 'thermal' | 'radar';
/** Décision sur l'instrument inspiré des travaux d'Elias (radar). */
export type EliasDecision = 'keep' | 'drop' | 'defer';

export interface Objective { id: ObjectiveId; label: string; question: string; value: string; instruments: InstrumentId[]; }
/** Valeurs de gameplay calibrées sur des références réelles (LRO) ; données et coût : illustratifs, à équilibrer. */
export interface Instrument {
  id: InstrumentId; name: string; reference: string; role: string;
  massKg: number; powerW: number; dataGbPerDay: number; costM: number;
}
export interface Tradeoff { decision: EliasDecision; label: string; gain: string; loss: string; reaction: Remark; }
export interface ProfileCatalog {
  polarBriefing: string[]; debate: Remark[]; objectives: Objective[]; instruments: Instrument[];
  eliasInstrument: InstrumentId; eliasObjective: ObjectiveId; eliasIntro: Remark[]; tradeoffs: Tradeoff[];
  /** Contrainte ajoutée par chaque objectif secondaire (affichée avant confirmation). */
  secondaryConstraint: string;
}
export interface ScientificProfile {
  primary: ObjectiveId; secondaries: ObjectiveId[]; noSecondaryByChoice: boolean;
  elias: EliasDecision; instruments: InstrumentId[]; confirmedAt: Date;
}
export interface Estimate { massKg: number; powerW: number; dataGbPerDay: number; costM: number; count: number; }

export const MAX_SECONDARIES = 2;

/** Instruments répondant aux objectifs ; le radar d'Elias n'y figure que s'il est conservé. */
export function relevantInstruments(c: ProfileCatalog, objectives: ObjectiveId[], elias: EliasDecision | null): InstrumentId[] {
  const ids = new Set<InstrumentId>();
  for (const o of objectives) c.objectives.find((x) => x.id === o)?.instruments.forEach((i) => ids.add(i));
  if (elias === 'keep') ids.add(c.eliasInstrument); else ids.delete(c.eliasInstrument);
  return [...ids];
}

/** Aperçu instantané (jamais un résultat officiel : le backend reste l'autorité). */
export function estimate(c: ProfileCatalog, ids: InstrumentId[]): Estimate {
  const e: Estimate = { massKg: 0, powerW: 0, dataGbPerDay: 0, costM: 0, count: ids.length };
  for (const id of ids) {
    const i = c.instruments.find((x) => x.id === id); if (!i) continue;
    e.massKg += i.massKg; e.powerW += i.powerW; e.dataGbPerDay += i.dataGbPerDay; e.costM += i.costM;
  }
  e.massKg = Math.round(e.massKg * 10) / 10; e.powerW = Math.round(e.powerW * 10) / 10;
  e.dataGbPerDay = Math.round(e.dataGbPerDay * 10) / 10;
  return e;
}
