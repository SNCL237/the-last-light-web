import type { EliasDecision, InstrumentId, ObjectiveId } from './profile';

/**
 * Catalogue de l'orbiteur (Actes II–V). Valeurs de GAMEPLAY ILLUSTRATIVES, cohérentes entre elles,
 * à remplacer par le catalogue versionné du backend (GET /catalog/components). Les instruments
 * reprennent masse et puissance LRO (voir StaticProfileCatalogRepository).
 */
export type SubsystemId = 'structure' | 'power' | 'comms' | 'control' | 'payload' | 'propulsion';
export const SUBSYSTEMS: { id: SubsystemId; label: string; why: string }[] = [
  { id: 'structure', label: 'Structure', why: 'Porte tout le reste et assure le contrôle thermique de base.' },
  { id: 'power', label: 'Énergie', why: 'Panneaux pour produire, batterie pour traverser l’ombre lunaire.' },
  { id: 'comms', label: 'Communications', why: 'Une donnée non transmise n’est pas une donnée sauvée.' },
  { id: 'control', label: 'Contrôle', why: 'Pointage (roues, viseurs) et ordinateur de bord avec sa mémoire.' },
  { id: 'payload', label: 'Charge utile', why: 'Les instruments qui répondent aux objectifs scientifiques.' },
  { id: 'propulsion', label: 'Propulsion', why: 'Insertion en orbite lunaire puis maintien d’orbite.' },
];

export type Slot = 'bus' | 'solar' | 'battery' | 'radio' | 'adcs' | 'obc' | 'instrument' | 'engine';
export interface Component {
  id: string; subsystem: SubsystemId; slot: Slot; name: string; desc: string;
  massKg: number; costM: number; powerW: number; reliability: number;
  solarW?: number; batteryWh?: number; storageGb?: number; downlinkMbps?: number; dvMs?: number;
  dataGbPerDay?: number; instrument?: InstrumentId;
  /** Composant requis pour pouvoir installer celui-ci. */
  requires?: string; requiresReason?: string;
}
/** Emplacements à occupation unique (un seul composant à la fois). */
export const SINGLE_SLOTS: Slot[] = ['bus', 'solar', 'battery', 'radio', 'adcs', 'obc', 'engine'];
export const BUS_HOUSEKEEPING_W = 160; // chauffage de survie polaire, avionique de base

export const COMPONENTS: Component[] = [
  { id: 'bus-al', subsystem: 'structure', slot: 'bus', name: 'Bus aluminium nid d’abeille', desc: 'Robuste et économique, plus lourd.', massKg: 210, costM: 22, powerW: 0, reliability: 0.97 },
  { id: 'bus-cf', subsystem: 'structure', slot: 'bus', name: 'Bus composite carbone', desc: 'Plus léger, plus cher.', massKg: 160, costM: 36, powerW: 0, reliability: 0.98 },
  { id: 'sa-450', subsystem: 'power', slot: 'solar', name: 'Panneaux GaAs 450 W', desc: 'Une aile fixe, légère.', massKg: 24, costM: 12, powerW: 0, solarW: 450, reliability: 0.97 },
  { id: 'sa-700', subsystem: 'power', slot: 'solar', name: 'Panneaux GaAs 700 W', desc: 'Une aile orientable.', massKg: 36, costM: 20, powerW: 0, solarW: 700, reliability: 0.97 },
  { id: 'sa-1000', subsystem: 'power', slot: 'solar', name: 'Panneaux triple jonction 1 000 W', desc: 'Deux ailes orientables : marge confortable.', massKg: 50, costM: 31, powerW: 0, solarW: 1000, reliability: 0.96 },
  { id: 'bat-1200', subsystem: 'power', slot: 'battery', name: 'Batterie Li-ion 1 200 Wh', desc: 'Légère, juste pour l’ombre nominale.', massKg: 12, costM: 5, powerW: 0, batteryWh: 1200, reliability: 0.96 },
  { id: 'bat-2400', subsystem: 'power', slot: 'battery', name: 'Batterie Li-ion 2 400 Wh', desc: 'Encaisse les pics et les ombres longues.', massKg: 23, costM: 9, powerW: 0, batteryWh: 2400, reliability: 0.97 },
  { id: 'bat-3600', subsystem: 'power', slot: 'battery', name: 'Batterie Li-ion 3 600 Wh', desc: 'Très grande réserve.', massKg: 34, costM: 14, powerW: 0, batteryWh: 3600, reliability: 0.97 },
  { id: 'rf-s', subsystem: 'comms', slot: 'radio', name: 'Bande S omnidirectionnelle', desc: 'Simple, débit faible.', massKg: 6, costM: 6, powerW: 35, downlinkMbps: 2, reliability: 0.99 },
  { id: 'rf-x', subsystem: 'comms', slot: 'radio', name: 'Bande X, antenne grand gain', desc: 'Bon compromis débit / puissance.', massKg: 16, costM: 15, powerW: 60, downlinkMbps: 40, reliability: 0.97 },
  { id: 'rf-ka', subsystem: 'comms', slot: 'radio', name: 'Bande Ka 100 Mbit/s', desc: 'Débit type LRO, exige un pointage fin.', massKg: 24, costM: 27, powerW: 95, downlinkMbps: 100, reliability: 0.95, requires: 'adcs-hp', requiresReason: 'La bande Ka exige le contrôle d’attitude de précision.' },
  { id: 'adcs-std', subsystem: 'control', slot: 'adcs', name: 'Roues de réaction + viseur stellaire', desc: 'Pointage standard.', massKg: 22, costM: 12, powerW: 40, reliability: 0.97 },
  { id: 'adcs-hp', subsystem: 'control', slot: 'adcs', name: 'Contrôle d’attitude de précision', desc: 'Deux viseurs, quatre roues : pointage fin.', massKg: 31, costM: 21, powerW: 55, reliability: 0.98 },
  { id: 'obc-100', subsystem: 'control', slot: 'obc', name: 'Ordinateur + mémoire 100 Go', desc: 'Stockage minimal.', massKg: 8, costM: 6, powerW: 18, storageGb: 100, reliability: 0.98 },
  { id: 'obc-400', subsystem: 'control', slot: 'obc', name: 'Ordinateur + mémoire 400 Go', desc: 'Grande mémoire de masse.', massKg: 11, costM: 11, powerW: 24, storageGb: 400, reliability: 0.98 },
  { id: 'eng-mono', subsystem: 'propulsion', slot: 'engine', name: 'Monoergol hydrazine', desc: 'Simple et fiable ; Δv 850 m/s.', massKg: 230, costM: 14, powerW: 0, dvMs: 850, reliability: 0.99 },
  { id: 'eng-bi', subsystem: 'propulsion', slot: 'engine', name: 'Biergol MMH / NTO', desc: 'Plus performant ; Δv 1 350 m/s.', massKg: 290, costM: 24, powerW: 0, dvMs: 1350, reliability: 0.98 },
  { id: 'ins-camera', subsystem: 'payload', slot: 'instrument', instrument: 'camera', name: 'Caméra haute résolution', desc: 'réf. LROC', massKg: 19.2, costM: 18, powerW: 24, dataGbPerDay: 40, reliability: 0.97 },
  { id: 'ins-neutron', subsystem: 'payload', slot: 'instrument', instrument: 'neutron', name: 'Spectromètre neutronique', desc: 'réf. LEND', massKg: 25.8, costM: 14, powerW: 11.6, dataGbPerDay: 2, reliability: 0.98 },
  { id: 'ins-thermal', subsystem: 'payload', slot: 'instrument', instrument: 'thermal', name: 'Imageur thermique', desc: 'réf. Diviner', massKg: 11, costM: 12, powerW: 24.7, dataGbPerDay: 6, reliability: 0.97 },
  { id: 'ins-radar', subsystem: 'payload', slot: 'instrument', instrument: 'radar', name: 'Radar (instrument d’Elias)', desc: 'réf. Mini-RF ; forte demande en émission', massKg: 13.8, costM: 16, powerW: 7, dataGbPerDay: 25, reliability: 0.94 },
];
/** Demande de crête du radar en émission (au-delà de sa moyenne) : source du « pire cas » d'Elias. */
export const RADAR_PEAK_W = 110;
export const BUDGET_M = 340;

export interface Launcher { id: string; label: string; cls: string; capacityKg: number; costM: number; reliability: number; }
export const LAUNCHERS: Launcher[] = [
  { id: 'lv-light', label: 'Lanceur léger', cls: 'léger', capacityKg: 620, costM: 50, reliability: 0.95 },
  { id: 'lv-medium', label: 'Lanceur moyen', cls: 'moyen', capacityKg: 1100, costM: 85, reliability: 0.97 },
  { id: 'lv-heavy', label: 'Lanceur lourd', cls: 'lourd', capacityKg: 2600, costM: 150, reliability: 0.98 },
];

export type OrbitKind = 'polar' | 'low' | 'elliptic';
export interface OrbitChoice { kind: OrbitKind; periKm: number; apoKm: number; incDeg: number; }
export const ORBIT_PRESETS: Record<OrbitKind, OrbitChoice & { label: string; desc: string }> = {
  polar: { kind: 'polar', label: 'Polaire circulaire', desc: 'Survole les pôles à chaque révolution.', periKm: 100, apoKm: 100, incDeg: 90 },
  low: { kind: 'low', label: 'Circulaire basse inclinée', desc: 'Économique, mais ne voit pas les pôles.', periKm: 60, apoKm: 60, incDeg: 30 },
  elliptic: { kind: 'elliptic', label: 'Elliptique polaire figée', desc: 'Type mise en service LRO (30 × 216 km) : périlune sur le pôle Sud.', periKm: 30, apoKm: 216, incDeg: 90 },
};

export interface Acceptance { code: string; severity: 'warning'; value: string; configVersion: number; at: string; }
export interface CycleRecord {
  n: number; obsHours: number; txWindows: number; instruments: InstrumentId[];
  energyIn: number; energyOut: number; batteryBefore: number; batteryAfter: number;
  produced: number; transmitted: number; lost: number; storageAfter: number;
  solarFactor: number; missedWindow: boolean; clue?: string;
  byInstrument: Partial<Record<InstrumentId, number>>;
}
export type CrisisOption = 'radar_off' | 'suspend_obs' | 'reduce_tx' | 'low_power' | 'continue';
export type FinalState = 'stable' | 'degraded' | 'loss';
export type EndingId = 'legacy' | 'fragment' | 'last_signal' | 'silence';

/** Progression : index de la dernière page atteinte (garde de route). */
export const ROUTES = [
  '/campagne/acte-2/atelier', '/campagne/acte-2/prevalidation', '/campagne/acte-3/revue', '/campagne/acte-3/lancement',
  '/campagne/acte-4/controle', '/campagne/acte-4/planificateur', '/campagne/acte-4/bilan',
  '/campagne/acte-5/alerte', '/campagne/acte-5/diagnostic', '/campagne/acte-5/arbitrage', '/campagne/acte-5/resolution',
  '/campagne/acte-6/rapport', '/campagne/acte-6/fin', '/campagne/acte-6/final',
] as const;
export type MissionRoute = typeof ROUTES[number];

/** Mode connecté : le catalogue du serveur remplace le catalogue local (mêmes tableaux, contenu substitué). */
export function applyServerCatalog(components: Component[], launchers: Launcher[]): void {
  COMPONENTS.splice(0, COMPONENTS.length, ...components); LAUNCHERS.splice(0, LAUNCHERS.length, ...launchers);
}
export interface ServerIssue { code: string; params: Record<string, unknown>; }
/** Instantané des réponses du serveur (autorité en mode connecté). */
export interface ServerSnapshot {
  missionId: string; configurationId: string; act: number; budgetM: number;
  report?: { bilans?: Record<string, number>; erreurs: ServerIssue[]; alertes: ServerIssue[]; valide: boolean; disponible: { id: string; disponible: boolean; raison?: ServerIssue }[] };
  orbitId?: string; launcherId?: string;
  etat?: { jour: number; limiteJours: number; issue: 'nominale' | 'ecourtee' | 'perdue'; terminee: boolean; batterieWh: number; tamponGbit: number;
    genere: number; transmis: number; perdu: number; science: number; scienceMax: number; parObjectif: Record<string, number>; maxParObjectif: Record<string, number>;
    sousSystemes: Record<string, string>; crise: { jour: number; echeance: number } | null; decisions: { choix: string; jour: number }[];
    evenements: { jour: number; type: string; indice?: string }[]; serie: { jour: number; puissanceW: number; batterieWh: number; tamponGbit: number }[]; consommeeW: number; fractionOmbre: number; capaciteBatterieWh: number; stockageGbit: number };
  bilan?: { scoreTotal: number; fin: 'A' | 'B' | 'C' | 'D'; scores: Record<string, number>; causes: ServerIssue[]; recommandations: { pourquoi: ServerIssue; piste: ServerIssue }[]; missionsReelles?: string[] };
}

export interface MissionState {
  version: 1; reached: number;
  profile: { primary: ObjectiveId; secondaries: ObjectiveId[]; elias: EliasDecision };
  config: string[]; configVersion: number; acceptances: Acceptance[]; validated: boolean;
  archiveRead: boolean; peakHandled: boolean;
  launch?: { launcherId: string; orbit: OrbitChoice; launchedAt?: string };
  ops: { cycle: number; batteryWh: number; storageGb: number; produced: number; transmitted: number; lost: number;
    byInstrument: Partial<Record<InstrumentId, number>>; history: CycleRecord[]; mode: 'manual' | 'semi' | 'auto' };
  crisis?: { serverOnly?: boolean; options: CrisisOption[]; predicted: { finalState: FinalState; transmitted: number }; finalState?: FinalState;
    computed?: { transmitted: number; lost: number; batteryMin: number; daysSurvived: number } };
  ending?: EndingId; score?: number;
  server?: ServerSnapshot;
  checkpoints: { id: string; label: string; at: string; snapshot: Omit<MissionState, 'checkpoints'> }[];
}
