import { t } from '../../i18n';
import { COMPONENTS, SINGLE_SLOTS, type Component, type MissionState, type SubsystemId } from '../../domain/mission';
import { comp, incompatibility, subsystemCompleteness, totals, validate, type Issue } from '../../domain/sim';
import { sceneStore } from '../../scene/sceneStore';
import { loadPrefs, savePrefs } from '../../domain/preferences';
import { messageFor } from '../../data/backend/api';
import type { ServerSnapshot } from '../../domain/mission';
import { ORBIT_PRESETS } from '../../domain/mission';
import { orbitMetrics } from '../../domain/orbit';
import { MissionViewModel, type MissionDeps } from '../mission/MissionViewModel';

export interface WorkshopExtra {
  step: 'design' | 'validation'; subsystem: SubsystemId; inspected: string | null; compare: string[];
  undo: string[][]; redo: string[][]; archiveOpen: boolean; intro: SubsystemId | null; introMute: boolean;
  rightTab: 'catalog' | 'inventory'; exploded: boolean; invSort: 'mass' | 'cost' | 'power'; accepted: string[]; lastChange: { label: string; before: ReturnType<typeof totals>; after: ReturnType<typeof totals> } | null;
}
/** Preset recommandé (mode Guidé) : sûr, avec marges ; les instruments suivent le profil. */
export function presetFor(m: MissionState): string[] {
  const ins = new Set<string>(); const map: Record<string, string[]> = { mapping: ['ins-camera'], ice: ['ins-neutron'], thermal: ['ins-thermal'], composition: ['ins-camera', 'ins-thermal'] };
  [m.profile.primary, ...m.profile.secondaries].forEach((o) => map[o].forEach((i) => ins.add(i)));
  if (m.profile.elias === 'keep') ins.add('ins-radar');
  return ['bus-al', 'sa-1000', 'bat-2400', 'rf-x', 'adcs-std', 'obc-400', 'eng-bi', ...ins];
}
/** Preset serveur : un élément par catégorie (le plus sûr) + les instruments de l'objectif principal (budget de 100 M$). */
export function serverPreset(m: MissionState): string[] {
  const pick = (slot: string, prefer: RegExp) => { const cs = COMPONENTS.filter((c) => c.slot === slot); return (cs.find((c) => prefer.test(c.name)) ?? cs[0])?.id; };
  const ins: Record<string, string[]> = { mapping: ['camera'], ice: ['neutron'], thermal: ['thermal'], composition: ['camera'] };
  const want = new Set(ins[m.profile.primary]); if (m.profile.elias === 'keep') want.add('radar');
  return [pick('bus', /principale/), pick('solar', /haute performance/), pick('battery', /longue/), pick('radio', /bande X/), pick('obc', /^Ordinateur de bord$/), pick('adcs', /roues/i), pick('engine', /biergol/),
    ...COMPONENTS.filter((c) => c.slot === 'instrument' && want.has(c.instrument as string)).map((c) => c.id)].filter(Boolean) as string[];
}
export const sceneAddons = (config: string[]) => {
  const t = totals(config); const cs = config.map(comp).filter(Boolean);
  const radio = cs.find((c) => c?.slot === 'radio'); const panels = cs.filter((c) => c?.slot === 'solar').length;
  return { wings: (panels >= 2 || t.solarW >= 1000 ? 2 : t.solarW > 0 ? 1 : 0) as 0 | 1 | 2, radar: t.hasRadar,
    dish: (!radio ? 'none' : /ka|grand gain/i.test(radio.name) ? 'large' : 'small') as 'none' | 'small' | 'large', tanks: cs.some((c) => c?.slot === 'engine') };
};
const SUBSYSTEM_OF_CODE: Record<string, SubsystemId> = { PUISSANCE_ALERTE: 'power', PUISSANCE_DEPASSEE: 'power', BATTERIE_INSUFFISANTE: 'power', OBJECTIF_PRINCIPAL_REQUIS: 'payload',
  OBJECTIFS_INSTRUMENT_REQUIS: 'payload', OBJECTIF_INSTRUMENT_INVALIDE: 'payload', DV_INSUFFISANT: 'propulsion', PROPULSION_CONFIGURATION_INVALIDE: 'propulsion' };
const TITLE_OF_CODE: Record<string, string> = { PUISSANCE_ALERTE: 'Marge de puissance faible', PUISSANCE_DEPASSEE: 'Énergie insuffisante sur l\u2019orbite', BATTERIE_INSUFFISANTE: 'Batterie insuffisante pour l\u2019ombre',
  BUDGET_ALERTE: 'Budget serré', BUDGET_DEPASSE: 'Budget dépassé', MASSE_DEPASSE: 'Masse supérieure à la capacité', LANCEUR_REQUIS: 'Lanceur à choisir (Acte III)', ORBITE_REQUISE: 'Orbite à choisir (Acte III)',
  OBJECTIF_PRINCIPAL_REQUIS: 'Objectif principal manquant', OBJECTIFS_INSTRUMENT_REQUIS: 'Objectif sans instrument', OBJECTIFS_SECONDAIRES_ABSENTS: 'Aucun objectif secondaire', DV_INSUFFISANT: '\u0394v insuffisant' };
/** Erreurs / alertes du serveur (C7) → modèle d'affichage. */
export function serverIssues(r: ServerSnapshot['report']): Issue[] {
  if (!r) return [];
  const map = (sev: 'error' | 'warning') => (x: { code: string; params: Record<string, unknown> }): Issue => ({ code: x.code, severity: sev, title: TITLE_OF_CODE[x.code] ?? messageFor(x.code, x.params), detail: messageFor(x.code, x.params), subsystem: SUBSYSTEM_OF_CODE[x.code],
    value: x.params.pourcentage !== undefined ? `${Math.round(Number(x.params.pourcentage))} %` : undefined });
  return [...r.erreurs.map(map('error')), ...r.alertes.map(map('warning'))];
}

export class WorkshopViewModel extends MissionViewModel<WorkshopExtra> {
  constructor(d: MissionDeps, step: 'design' | 'validation', private focus?: string) {
    super(d, { step, subsystem: 'structure', inspected: null, compare: [], undo: [], redo: [], archiveOpen: false, accepted: [], lastChange: null, intro: null, introMute: readIntro().mute, rightTab: 'catalog', exploded: false, invSort: 'mass' });
  }
  protected onReady(m: MissionState): void {
    if (m.launch?.launchedAt) { this.go('/campagne/acte-4/controle'); return; } // conception verrouillée
    if (!m.checkpoints.some((c) => c.id === 'act2')) {
      const { checkpoints: _c, ...snapshot } = m; void _c;
      void this.commit({ ...m, checkpoints: [...m.checkpoints, { id: 'act2', label: t('Début de l’Acte II'), at: new Date().toISOString(), snapshot }] });
    }
    const f = this.focus ? comp(this.focus) : undefined;
    if (f) this.setState({ subsystem: f.subsystem, inspected: f.id });
    else if (this.focus && ['structure', 'power', 'comms', 'control', 'payload', 'propulsion'].includes(this.focus)) this.setState({ subsystem: this.focus as SubsystemId });
    this.syncScene();
    if (this.getState().step === 'design') this.maybeIntro(this.getState().subsystem);
    if (this.srv && m.server && !m.server.report) void this.srv.readConfiguration(m.server).then((report) => this.commit({ ...this.m, server: { ...this.m.server!, report } })).catch((e) => this.fail(e));
    if (this.getState().step === 'validation') this.record({ code: 'EVT-A2-002', trace: 'prevalidation', data: { errors: this.issues.filter((i) => i.severity === 'error').map((i) => i.code), warnings: this.issues.filter((i) => i.severity === 'warning').map((i) => i.code), config_version: m.configVersion } });
  }
  /** Lancement et orbite sont choisis à l'Acte III : leurs erreurs ne bloquent pas la prévalidation. */
  get issues(): Issue[] { return this.srv ? serverIssues(this.m.server?.report).filter((i) => !['LANCEUR_REQUIS', 'ORBITE_REQUISE', 'MASSE_DEPASSE', 'ORBITE_INACCESSIBLE'].includes(i.code)) : validate(this.m); }
  /** Chiffres des jauges : serveur (autorité) en mode connecté, sinon aperçu local. */
  figures() {
    const t = totals(this.m.config); const b = this.m.server?.report?.bilans;
    if (!this.srv || !b) return { local: true, massKg: t.massKg, costM: t.costM, budgetM: 0, powerRatio: t.powerRatio, producedW: t.avgProdW, consumedW: t.nominalW, batteryWh: t.batteryWh, batteryNeedWh: t.batteryNeedWh, batteryPeakNeedWh: t.batteryPeakNeedWh, storageGb: t.storageGb, dataGbPerDay: t.dataGbPerDay };
    const ombre = orbitMetrics(ORBIT_PRESETS.polar).eclipseFrac; const moy = (b.puissanceProduiteW ?? 0) * (1 - ombre);
    return { local: false, massKg: b.masseTotaleKg ?? 0, costM: b.coutMUSD ?? 0, budgetM: this.m.server?.budgetM ?? 100, powerRatio: moy ? (b.puissanceConsommeeW ?? 0) / moy : Infinity,
      producedW: moy, consumedW: b.puissanceConsommeeW ?? 0, batteryWh: b.capaciteBatterieWh ?? 0, batteryNeedWh: Math.round(b.capaciteBatterieMinWh ?? 0), batteryPeakNeedWh: Math.round(b.capaciteBatterieMinWh ?? 0), storageGb: 50, dataGbPerDay: Math.round(((b.debitGenereGbitJour ?? 0) / 8) * 10) / 10 };
  }
  private syncScene() {
    const parts = this.m.config.map(comp).filter(Boolean).map((c) => ({ id: c!.id, slot: c!.slot, subsystem: c!.subsystem, label: c!.name }));
    sceneStore.set({ view: 'orbiter', mood: 'normal', addons: sceneAddons(this.m.config), highlight: this.getState().subsystem, exploded: this.getState().exploded, parts });
  }
  setTab = (rightTab: 'catalog' | 'inventory') => this.setState({ rightTab });
  setInvSort = (invSort: 'mass' | 'cost' | 'power') => this.setState({ invSort });
  /** Vue éclatée (scène 2.2) : les composants s'écartent du corps de l'orbiteur. */
  toggleExplode = () => { this.setState({ exploded: !this.getState().exploded, rightTab: !this.getState().exploded ? 'inventory' : this.getState().rightTab }); this.syncScene(); };
  /** Survol d'une ligne de l'inventaire : la pièce correspondante brille dans la 3D. */
  focusPart = (id: string | null) => sceneStore.set({ partFocus: id });
  openFromInventory = (id: string) => { const c = comp(id); if (!c) return; this.setState({ subsystem: c.subsystem, inspected: id, rightTab: 'catalog' }); this.syncScene(); };
  /** Inventaire : composants installés regroupés par sous-système, triés. */
  inventory() {
    const key = this.getState().invSort; const val = (c: Component) => (key === 'mass' ? c.massKg : key === 'cost' ? c.costM : c.powerW || -(c.solarW ?? 0));
    const installed = this.m.config.map(comp).filter(Boolean) as Component[];
    return SUBSYSTEMS_ORDER.map((sub) => { const items = installed.filter((c) => c.subsystem === sub).sort((a, b) => val(b) - val(a));
      return { sub, items, massKg: items.reduce((a, c) => a + c.massKg, 0), costM: items.reduce((a, c) => a + c.costM, 0), powerW: items.reduce((a, c) => a + c.powerW, 0), solarW: items.reduce((a, c) => a + (c.solarW ?? 0), 0), reliability: items.reduce((a, c) => a * c.reliability, 1) }; });
  }

  selectSubsystem = (s: SubsystemId) => { this.setState({ subsystem: s, inspected: null }); this.syncScene(); this.maybeIntro(s); };
  /** Fenêtre d'aide à la première visite de chaque sous-système (sauf si le joueur l'a désactivée). */
  private maybeIntro(s: SubsystemId) { const r = readIntro(); if (!r.mute && !r.seen.includes(s)) this.setState({ intro: s }); }
  openIntro = () => this.setState({ intro: this.getState().subsystem });
  closeIntro = () => { const s = this.getState().intro; const r = readIntro(); if (s) writeIntro({ ...r, seen: [...new Set([...r.seen, s])] }); this.setState({ intro: null }); };
  toggleIntroMute = () => { const mute = !this.getState().introMute; savePrefs({ ...loadPrefs(), help: !mute }); this.setState({ introMute: mute }); };
  inspect = (id: string | null) => this.setState({ inspected: id });
  toggleCompare = (id: string) => { const c = this.getState().compare; this.setState({ compare: c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-3) }); };
  installed = (id: string) => this.m.config.includes(id);
  reason = (c: Component): string | null => {
    if (this.installed(c.id)) return null;
    if (this.srv) { const d = this.m.server?.report?.disponible.find((x) => x.id === c.id); return d && !d.disponible ? (d.raison ? messageFor(d.raison.code, d.raison.params) : t('Indisponible pour cette configuration.')) : null; }
    return incompatibility(this.m.config, c);
  };
  /** Mode connecté : rejoue la différence de configuration sur le serveur (retraits puis ajouts). */
  private async pushServer(next: string[]): Promise<ServerSnapshot['report']> {
    const gw = this.srv!; const s = this.m.server!; const prev = this.m.config; let report = s.report;
    const objectives = [this.m.profile.primary, ...this.m.profile.secondaries];
    for (const id of prev.filter((x) => !next.includes(x))) report = await gw.remove(s, comp(id)!);
    for (const id of next.filter((x) => !prev.includes(x))) report = await gw.install(s, comp(id)!, objectives);
    return report;
  }

  private async change(next: string[], label: string, eventData: Record<string, unknown>) {
    const s = this.getState(); const before = totals(this.m.config); const prev = this.m.config;
    const powerWasDone = subsystemCompleteness(prev).power;
    let server = this.m.server;
    if (this.srv) {
      this.setState({ busy: true } as never);
      try { server = { ...server!, report: await this.pushServer(next) }; } catch (e) { this.fail(e); return; }
      this.setState({ busy: false } as never);
    }
    const ok = await this.commit({ ...this.m, config: next, configVersion: this.m.configVersion + 1, validated: false, server });
    if (!ok) return;
    this.setState({ undo: [...s.undo, prev].slice(-30), redo: [], lastChange: { label, before, after: totals(next) } });
    this.record({ code: 'EVT-A2-001', trace: 'component_change', data: { ...eventData, config_version: this.m.configVersion } });
    if (!powerWasDone && subsystemCompleteness(next).power && !this.m.archiveRead) {
      this.record({ code: 'EVT-A2-004', trace: 'elias_note_unlocked' }); this.setState({ archiveOpen: true });
    }
    this.syncScene();
  }
  install = (id: string) => {
    const c = comp(id); if (!c || this.installed(id) || this.reason(c)) return;
    const next = SINGLE_SLOTS.includes(c.slot) ? [...this.m.config.filter((x) => comp(x)?.slot !== c.slot), id] : [...this.m.config, id];
    void this.change(next, `Installation : ${c.name}`, { action: 'add', component: id });
  };
  remove = (id: string) => { if (!this.installed(id)) return; const c = comp(id)!;
    const dependants = this.m.config.filter((x) => comp(x)?.requires === id);
    void this.change(this.m.config.filter((x) => x !== id && !dependants.includes(x)), `Retrait : ${c.name}${dependants.length ? t(' (et ce qui en dépend)') : ''}`, { action: 'remove', component: id }); };
  undoLast = () => { const s = this.getState(); const prev = s.undo.at(-1); if (!prev) return; const cur = this.m.config;
    void this.change(prev, 'Annulation', { action: 'undo' }).then(() => this.setState({ undo: s.undo.slice(0, -1), redo: [...s.redo, cur], lastChange: null })); };
  redoLast = () => { const s = this.getState(); const nxt = s.redo.at(-1); if (!nxt) return; const cur = this.m.config;
    void this.change(nxt, t('Rétablissement'), { action: 'redo' }).then(() => this.setState({ redo: s.redo.slice(0, -1), undo: [...s.undo, cur], lastChange: null })); };
  reset = () => void this.change([], t('Réinitialisation'), { action: 'reset' });
  applyPreset = () => void this.change(this.srv ? serverPreset(this.m) : presetFor(this.m), t('Preset recommandé'), { action: 'preset' });
  readArchive = () => { this.setState({ archiveOpen: false }); void this.commit({ ...this.m, archiveRead: true }); };
  openArchive = () => this.setState({ archiveOpen: true });

  openValidation = () => void this.goTo('/campagne/acte-2/prevalidation');
  backToDesign = (focus?: string) => this.go(`/campagne/acte-2/atelier${focus ? `?focus=${focus}` : ''}`);
  toggleAccept = (code: string) => { const a = this.getState().accepted; this.setState({ accepted: a.includes(code) ? a.filter((x) => x !== code) : [...a, code] }); };
  validationAvailability(): { ok: boolean; reason?: string } {
    const is = this.issues; const errs = is.filter((i) => i.severity === 'error');
    if (errs.length) return { ok: false, reason: `${errs.length} erreur(s) bloquante(s) à corriger.` };
    const pending = is.filter((i) => i.severity === 'warning' && !this.getState().accepted.includes(i.code));
    if (pending.length) return { ok: false, reason: `${pending.length} avertissement(s) à accepter explicitement ou corriger.` };
    return { ok: true };
  }
  validateConfig = async () => {
    if (!this.validationAvailability().ok || this.getState().busy) return; this.setState({ busy: true });
    const at = new Date().toISOString(); const ws = this.issues.filter((i) => i.severity === 'warning');
    const acceptances = ws.map((w) => ({ code: w.code, severity: 'warning' as const, value: w.value ?? '', configVersion: this.m.configVersion, at }));
    acceptances.forEach((a) => this.record({ code: 'EVT-A2-003', trace: 'warning_accepted', data: { type: a.code, severity: a.severity, value: a.value, config_version: a.configVersion } }));
    await this.goTo('/campagne/acte-3/revue', { acceptances, validated: true, peakHandled: !ws.some((w) => w.code === 'PIRE_CAS_ENERGIE' || w.code === 'PUISSANCE_ALERTE') });
    this.setState({ busy: false });
  };
  catalog = () => COMPONENTS.filter((c) => c.subsystem === this.getState().subsystem);
}

const INTRO_KEY = 'tll.intro.atelier';
/** Une seule source de vérité pour l'affichage des aides : la préférence `help` (page Options). */
function readIntro(): { seen: string[]; mute: boolean } { let seen: string[] = []; try { seen = JSON.parse(localStorage.getItem(INTRO_KEY) ?? '{}').seen ?? []; } catch { /* */ } return { seen, mute: !loadPrefs().help }; }
function writeIntro(v: { seen: string[]; mute: boolean }) { try { localStorage.setItem(INTRO_KEY, JSON.stringify(v)); } catch { /* préférence facultative */ } }

const SUBSYSTEMS_ORDER: SubsystemId[] = ['structure', 'power', 'comms', 'control', 'payload', 'propulsion'];
