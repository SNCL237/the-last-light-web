import { applyServerCatalog, type Component, type Launcher, type OrbitChoice, type ServerSnapshot, type SubsystemId } from '../../domain/mission';
import type { InstrumentId, ObjectiveId } from '../../domain/profile';
import { ApiError, type ApiClient } from './api';

/** Identifiants du contenu serveur (scénario « lune-polaire », catalogue 1.2.0). */
export const CATALOGUE_VERSION = '1.2.0';
export const OBJECTIVE_IDS: Record<ObjectiveId, string> = {
  ice: '0b7e0001-0000-4000-8000-000000000000', mapping: '0b7e0002-0000-4000-8000-000000000000',
  thermal: '0b7e0003-0000-4000-8000-000000000000', composition: '0b7e0004-0000-4000-8000-000000000000',
};
export const OBJECTIVE_OF = Object.fromEntries(Object.entries(OBJECTIVE_IDS).map(([k, v]) => [v, k])) as Record<string, ObjectiveId>;
const INSTRUMENT_BY_NAME: Record<string, InstrumentId> = { 'camera-nadir-haute-resolution': 'camera', 'spectrometre-neutronique': 'neutron', 'radiometre-thermique': 'thermal', 'radar-synthese-ouverture': 'radar' };
const LABELS: Record<string, string> = {
  'structure-principale': 'Structure principale', 'structure-monocoque-legere': 'Structure monocoque légère',
  'panneau-solaire-principal': 'Panneau solaire principal', 'panneau-solaire-haute-performance': 'Panneau solaire haute performance',
  'batterie-principale-lithium-ion': 'Batterie Li-ion principale', 'batterie-longue-duree': 'Batterie longue durée',
  'emetteur-bande-x': 'Émetteur bande X', 'antenne-haut-gain': 'Antenne grand gain', 'ordinateur-de-bord': 'Ordinateur de bord',
  'ordinateur-de-bord-redondant': 'Ordinateur de bord redondant', 'roues-a-reaction': 'Roues à réaction', 'propulseurs-controle-attitude': 'Propulseurs de contrôle d’attitude',
  'moteur-principal-bi-propulseur': 'Moteur principal biergol', 'moteur-haute-impulsion': 'Moteur haute impulsion',
  'camera-nadir-haute-resolution': 'Caméra haute résolution', 'spectrometre-neutronique': 'Spectromètre neutronique',
  'radiometre-thermique': 'Radiomètre thermique', 'radar-synthese-ouverture': 'Radar (instrument d’Elias)',
  'lanceur-leger': 'Lanceur léger', 'lanceur-moyen': 'Lanceur moyen', 'lanceur-lourd': 'Lanceur lourd',
};
const label = (nom: string) => LABELS[nom] ?? nom.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const CAT: Record<string, [SubsystemId, Component['slot']]> = {
  structure: ['structure', 'bus'], 'energie-panneau': ['power', 'solar'], 'energie-batterie': ['power', 'battery'], communications: ['comms', 'radio'],
  ordinateur: ['control', 'obc'], attitude: ['control', 'adcs'], propulsion: ['propulsion', 'engine'],
};
const ORBIT_KIND: Record<string, OrbitChoice['kind']> = { polaire: 'polar', circulaireBasse: 'low', elliptique: 'elliptic' };

interface CatEntry { id: string; nom: string; categorie?: string; masseKg: number; powerW: number; costMUSD: number; fiabilite: number; capaciteBatterieWh?: number; ispS?: number; dataMbps?: number; missionsReelles?: string[]; niveau?: string; source?: string }
export interface ServerCatalogue {
  composants: CatEntry[]; instruments: CatEntry[];
  orbites: { id: string; type: string; altitudeKm: number; inclinaisonDeg: number; periodeS: number; fractionOmbre: number; couverture: number }[];
  lanceurs: { id: string; nom: string; classe: string; capaciteKg: Record<string, number>; costMUSD: number; fiabilite: number }[];
  stationsSol: { id: string; nom: string; dataMbps: number }[];
}
export interface ServerOrbit { id: string; kind: OrbitChoice['kind']; label: string; choice: OrbitChoice; couverture: number; fractionOmbre: number; periodeS: number }

/** Passerelle : traduit les intentions du frontend en appels métier du backend (autorité). */
export class ServerGateway {
  catalogue?: ServerCatalogue; orbits: ServerOrbit[] = [];
  constructor(readonly api: ApiClient) {}

  async loadCatalogue(): Promise<ServerCatalogue> {
    if (this.catalogue) return this.catalogue;
    const c = await this.api.request<ServerCatalogue>('GET', `/catalogue/${CATALOGUE_VERSION}`);
    this.catalogue = c;
    const comps: Component[] = [
      ...c.composants.filter((x) => x.categorie && CAT[x.categorie]).map((x): Component => {
        const [subsystem, slot] = CAT[x.categorie as string];
        return { id: x.id, subsystem, slot, name: label(x.nom), desc: `${x.niveau ? `Niveau ${x.niveau} · ` : ''}${x.ispS ? `Isp ${x.ispS} s · ` : ''}source : ${x.source ?? 'a-calibrer'}`,
          massKg: x.masseKg, costM: x.costMUSD, powerW: slot === 'solar' ? 0 : x.powerW, solarW: slot === 'solar' ? x.powerW : undefined,
          batteryWh: x.capaciteBatterieWh, reliability: x.fiabilite };
      }),
      ...c.instruments.map((x): Component => ({ id: x.id, subsystem: 'payload', slot: 'instrument', instrument: INSTRUMENT_BY_NAME[x.nom], name: label(x.nom),
        desc: `${(x.missionsReelles ?? []).join(', ')} · ${x.source ?? ''}`, massKg: x.masseKg, costM: x.costMUSD, powerW: x.powerW, reliability: x.fiabilite,
        dataGbPerDay: x.dataMbps !== undefined ? Math.round(((x.dataMbps * 4 * 3600) / 8000) * 10) / 10 : undefined })),
    ];
    const launchers: Launcher[] = c.lanceurs.map((l) => ({ id: l.id, label: label(l.nom), cls: l.classe, capacityKg: Math.max(...Object.values(l.capaciteKg)), costM: l.costMUSD, reliability: l.fiabilite }));
    applyServerCatalog(comps, launchers);
    this.orbits = c.orbites.map((o) => ({ id: o.id, kind: ORBIT_KIND[o.type] ?? 'polar', label: { polaire: 'Polaire circulaire', circulaireBasse: 'Circulaire basse', elliptique: 'Orbite « elliptique » (circulaire 150 km au catalogue)' }[o.type] ?? o.type,
      choice: { kind: ORBIT_KIND[o.type] ?? 'polar', periKm: o.altitudeKm, apoKm: o.altitudeKm, incDeg: o.inclinaisonDeg }, couverture: o.couverture, fractionOmbre: o.fractionOmbre, periodeS: o.periodeS }));
    return c;
  }
  launcherCapacity(launcherId: string, orbitId: string): number {
    const l = this.catalogue?.lanceurs.find((x) => x.id === launcherId); const o = this.catalogue?.orbites.find((x) => x.id === orbitId);
    return (o && l?.capaciteKg[o.type]) ?? 0;
  }
  instrumentId(i: InstrumentId): string | undefined { return this.catalogue?.instruments.find((x) => INSTRUMENT_BY_NAME[x.nom] === i)?.id; }

  // ---- Campagne ----
  async listMissions(): Promise<{ id: string; acte: number; terminee: boolean }[]> {
    return (await this.api.request<{ items: { id: string; acte: number; terminee: boolean }[] }>('GET', '/campagne/missions?limite=100')).items;
  }
  /** Bilans des missions clôturées sur le serveur (page Rapports). */
  async listClosed(): Promise<{ id: string; scoreTotal: number; fin: string; scores: Record<string, number>; principal?: string }[]> {
    const items = (await this.api.request<{ items: { id: string; terminee: boolean; bilan: { scoreTotal: number; fin: string; scores: Record<string, number> } | null; configuration?: { objectifs?: { principal?: string } } | null }[] }>('GET', '/campagne/missions?limite=100')).items;
    return items.filter((m) => m.bilan).map((m) => ({ id: m.id, scoreTotal: m.bilan!.scoreTotal, fin: m.bilan!.fin, scores: m.bilan!.scores, principal: m.configuration?.objectifs?.principal }));
  }
  /** Nouvelle campagne = configuration vierge + mission (le serveur exige une configuration). */
  async createMission(): Promise<ServerSnapshot> {
    const sc = (await this.api.request<{ items: { scenarioId: string; version: string; statut: string }[] }>('GET', '/campagne/scenarios')).items.find((s) => s.statut === 'disponible');
    if (!sc) throw new Error('Aucun scénario disponible sur le serveur.');
    const configurationId = crypto.randomUUID();
    // Niveau « expert » : 0 à 2 objectifs secondaires comme le GDD ; le mode de jeu ne règle que l'aide.
    const report = await this.api.request<NonNullable<ServerSnapshot['report']> & { bilans?: Record<string, number> }>('POST', '/conception/configurations', {
      configurationId, scenarioId: sc.scenarioId, versionScenario: sc.version, versionCatalogue: CATALOGUE_VERSION,
      budgetMaxMUSD: 100, deltaVms: 900, margeDv: 0.1, dureeMissionAns: 1, coutOperationsAnnuelMUSD: 0, profondeurDecharge: 0.5, rendement: 0.9,
      tempsObservationSParJour: 4 * 3600, difficulte: 'expert' });
    const m = await this.api.request<{ id: string; acte: number; scenario: { budgetMaxMUSD: number } }>('POST', '/campagne/missions', {
      scenarioId: sc.scenarioId, versionScenario: sc.version, versionCatalogue: CATALOGUE_VERSION, configurationId, graine: Math.floor(Math.random() * 2 ** 31) });
    return { missionId: m.id, configurationId, act: m.acte, budgetM: m.scenario?.budgetMaxMUSD ?? 100, report };
  }
  async readMission(missionId: string): Promise<{ id: string; acte: number; configurationId: string; terminee: boolean; scenario: { budgetMaxMUSD: number } }> {
    return this.api.request('GET', `/campagne/missions/${missionId}`);
  }

  // ---- Conception ----
  private patch(s: ServerSnapshot, body: unknown) { return this.api.request<NonNullable<ServerSnapshot['report']>>('PATCH', `/conception/configurations/${s.configurationId}`, body); }
  async setObjectives(s: ServerSnapshot, primary: ObjectiveId, secondaries: ObjectiveId[]) {
    return this.patch(s, { type: 'objectifs', principal: OBJECTIVE_IDS[primary], secondaires: secondaries.map((o) => OBJECTIVE_IDS[o]) });
  }
  async install(s: ServerSnapshot, c: Component, objectives: ObjectiveId[]) {
    if (c.slot !== 'instrument') return this.patch(s, { type: 'ajouter-element', id: c.id });
    await this.patch(s, { type: 'ajouter-instrument', id: c.id });
    const served = objectives.filter((o) => SERVES[o]?.includes(c.instrument as InstrumentId)).map((o) => OBJECTIVE_IDS[o]);
    // Un instrument doit servir au moins un objectif (C3) ; à défaut, on l'associe à l'objectif principal.
    return this.patch(s, { type: 'associer-objectifs-instrument', id: c.id, objectifs: served.length ? served : [OBJECTIVE_IDS[objectives[0]]] });
  }
  async remove(s: ServerSnapshot, c: Component) { return this.patch(s, { type: c.slot === 'instrument' ? 'retirer-instrument' : 'retirer-element', id: c.id }); }
  async setLaunch(s: ServerSnapshot, launcherId: string, orbitId: string) { return this.patch(s, { type: 'lancement', lanceurId: launcherId, orbiteId: orbitId }); }
  async readConfiguration(s: ServerSnapshot) { return this.api.request<NonNullable<ServerSnapshot['report']>>('GET', `/conception/configurations/${s.configurationId}`); }

  // ---- Actes, simulation, crise, bilan ----
  async advanceTo(s: ServerSnapshot, act: number): Promise<{ acte: number; bilan?: unknown; etatSimulation?: string | null; configuration?: unknown }> {
    let m = await this.readMission(s.missionId) as unknown as { acte: number };
    for (let a = m.acte + 1; a <= act; a++) {
      try { m = await this.api.request('POST', `/campagne/missions/${s.missionId}/actes`, { acte: a }); }
      catch (e) { if (e instanceof ApiError && e.code === 'ACTE_INVALIDE') { m = await this.readMission(s.missionId) as unknown as { acte: number }; if (m.acte >= act) break; continue; } throw e; }
    }
    return m as { acte: number };
  }
  async simulate(s: ServerSnapshot, commandes: unknown[], jours: number) {
    return this.api.request<{ acte: number; etatSimulation: string | null }>('POST', `/campagne/missions/${s.missionId}/simulation`, { commandes, jours });
  }
  async decide(s: ServerSnapshot, choix: string, cibleId?: string) {
    return this.api.request<{ acte: number; etatSimulation: string | null }>('POST', `/campagne/missions/${s.missionId}/crise`, { choix, ...(cibleId ? { cibleId } : {}) });
  }
}
const SERVES: Record<ObjectiveId, InstrumentId[]> = { mapping: ['camera'], ice: ['neutron', 'radar'], thermal: ['thermal'], composition: ['camera', 'thermal'] };

/** Résume l'état de simulation renvoyé (JSON sérialisé dans une chaîne par le serveur). */
export function summarizeEtat(raw: string | null | undefined): ServerSnapshot['etat'] | undefined {
  if (!raw) return undefined;
  const e = JSON.parse(raw);
  const cfg = e.configuration; const ombre = cfg?.orbite?.fractionEclipse ?? 0.39;
  return { jour: e.jour, limiteJours: e.limiteJours, issue: e.issue, terminee: e.terminee, batterieWh: e.batterieWh, tamponGbit: e.tamponGbit,
    genere: e.donneesGenereesGbit, transmis: e.donneesTransmisesGbit, perdu: e.donneesPerduesGbit, science: e.scienceCumulee, scienceMax: e.scienceMax,
    parObjectif: e.scienceParObjectif ?? {}, maxParObjectif: e.scienceMaxParObjectif ?? {}, sousSystemes: e.sousSystemes ?? {}, crise: e.criseEnAttente ?? null,
    decisions: (e.decisionsCrise ?? []).map((d: { choix: string; jour: number }) => ({ choix: d.choix, jour: d.jour })),
    evenements: (e.evenements ?? []).map((x: { jour: number; type: string; indice?: string }) => ({ jour: x.jour, type: x.type, indice: x.indice })),
    serie: (e.serie ?? []).map((p: { jour: number; puissanceW: number; batterieWh: number; tamponGbit: number }) => ({ jour: p.jour, puissanceW: p.puissanceW, batterieWh: p.batterieWh, tamponGbit: p.tamponGbit })),
    consommeeW: cfg?.orbiteur?.puissanceConsommeeW ?? 0, fractionOmbre: ombre, capaciteBatterieWh: cfg?.orbiteur?.capaciteBatterieWh ?? 0, stockageGbit: cfg?.profilOperations?.capaciteStockageGbit ?? 0 };
}
