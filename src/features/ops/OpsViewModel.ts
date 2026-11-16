import { t } from '../../i18n';
import { COMPONENTS, type CycleRecord, type MissionState, type ServerSnapshot } from '../../domain/mission';
import { OBJECTIVE_IDS, summarizeEtat } from '../../data/backend/ServerGateway';
import type { ObjectiveId } from '../../domain/profile';
import { objectiveAchievement } from '../../domain/sim';
import type { InstrumentId } from '../../domain/profile';
import { applyCycle, isCritical, MAX_WINDOWS, runCycle, suggestPlan, totals, type CyclePlan } from '../../domain/sim';
import { sceneStore } from '../../scene/sceneStore';
import { MissionViewModel, type MissionDeps } from '../mission/MissionViewModel';
import { sceneAddons } from '../workshop/WorkshopViewModel';

export type OpsStep = 'control' | 'planner' | 'summary';
export interface OpsExtra { plan: CyclePlan; tab: 'plan' | 'journal' | 'objectives'; ffN: number; interrupted?: string; }

export class OpsViewModel extends MissionViewModel<OpsExtra> {
  constructor(d: MissionDeps, readonly step: OpsStep) { super(d, { plan: { instruments: [], obsHours: 8, txWindows: 4 }, tab: 'plan', ffN: 3 }); }
  protected onReady(m: MissionState): void {
    if (!m.launch?.launchedAt) { this.go('/campagne/acte-3/revue'); return; }
    const last = m.ops.history.at(-1);
    const installed = COMPONENTS.filter((c) => m.config.includes(c.id) && c.instrument).map((c) => c.instrument as InstrumentId);
    this.setState({ plan: last ? { instruments: last.instruments, obsHours: last.obsHours, txWindows: last.txWindows } : this.srv ? { instruments: installed, obsHours: 4, txWindows: 1 } : suggestPlan(m) });
    sceneStore.set({ view: 'orbit', mood: 'normal', orbit: m.launch.orbit, addons: sceneAddons(m.config) });
  }
  get critical() { return this.srv ? !!this.m.server?.etat?.crise : isCritical(this.m); }
  get serverMode() { return !!this.srv; }
  /** Avancement d'un objectif : science du serveur (cumulée / maximum) ou aperçu local. */
  achievement = (o: ObjectiveId): number => {
    const e = this.m.server?.etat; if (!this.srv || !e) return objectiveAchievement(this.m.ops.byInstrument, o);
    const id = OBJECTIVE_IDS[o]; const max = e.maxParObjectif[id] ?? 0; return max ? Math.min(1, (e.parObjectif[id] ?? 0) / max) : 0;
  };
  get forecast() { return runCycle(this.m, this.getState().plan); }
  get serverEtat() { return this.m.server?.etat; }
  setMode = (mode: MissionState['ops']['mode']) => { if (mode === 'semi') this.setState({ plan: suggestPlan(this.m) }); void this.commit({ ...this.m, ops: { ...this.m.ops, mode } }); };
  toggleInstrument = (i: InstrumentId) => { const p = this.getState().plan; this.setState({ plan: { ...p, instruments: p.instruments.includes(i) ? p.instruments.filter((x) => x !== i) : [...p.instruments, i] } }); };
  setObs = (h: number) => this.setState({ plan: { ...this.getState().plan, obsHours: Math.max(0, Math.min(12, h)) } });
  toggleWindow = (w: number) => this.setState({ plan: { ...this.getState().plan, txWindows: w } });
  setTab = (tab: OpsExtra['tab']) => this.setState({ tab });
  setFF = (n: number) => this.setState({ ffN: Math.max(1, Math.min(5, n)) });
  planAvailability() {
    if (this.critical) return { ok: false, reason: t('Alerte critique en cours : ouvrez l’alerte.') };
    if (this.srv) return this.m.server?.etat?.terminee ? { ok: false, reason: t('Simulation terminée.') } : { ok: true };
    const f = this.forecast; if (this.getState().plan.txWindows > MAX_WINDOWS) return { ok: false, reason: t('Trop de fenêtres.') };
    if (f.batteryAfter <= 0) return { ok: false, reason: t('Plan non tenable : la batterie serait vide (réserve non respectée).') };
    return { ok: true };
  }
  openPlanner = () => void this.goTo('/campagne/acte-4/planificateur');
  /** Mode connecté : un cycle = un jour simulé par le serveur. */
  private async execServer(n: number) {
    const gw = this.srv!; let st = this.m; let stop: string | undefined;
    try {
      for (let i = 0; i < n; i++) {
        const srv = st.server!; const before = srv.etat; const jour = (before?.jour ?? 0) + 1; const plan = this.getState().plan;
        const commandes = [...COMPONENTS.filter((c) => st.config.includes(c.id) && c.instrument).map((c) => ({ type: 'planifier-observation', jour, instrumentId: c.id, active: plan.instruments.includes(c.instrument as InstrumentId) })),
          { type: 'programmer-transmission', jour, active: plan.txWindows > 0 }];
        const r = await gw.simulate(srv, commandes, 1); const after = summarizeEtat(r.etatSimulation)!;
        const c = cycleFromServer(before, after, plan); const server: ServerSnapshot = { ...srv, etat: after, act: r.acte };
        st = { ...st, server, ops: { ...st.ops, cycle: c.n, batteryWh: c.batteryAfter, storageGb: c.storageAfter, produced: round1(after.genere / 8), transmitted: round1(after.transmis / 8), lost: round1(after.perdu / 8), history: [...st.ops.history, c] } };
        this.record({ code: 'EVT-A4-001', trace: 'cycle_executed', data: { cycle: c.n, server: true } });
        if (c.clue) this.record({ code: 'EVT-A4-004', trace: 'anomaly_clue', data: { cycle: c.n, clue: c.clue } });
        if (after.crise) { stop = `Avance interrompue au jour ${after.jour} : décision de crise attendue.`; break; }
        if (after.terminee) { stop = t('Simulation terminée.'); break; }
      }
    } catch (e) { await this.commit(st); this.fail(e); return; }
    this.setState({ interrupted: stop }); await this.goTo('/campagne/acte-4/bilan', { ops: st.ops, server: st.server });
  }
  private async exec(n: number) {
    if (this.srv) return this.execServer(n);
    let st = this.m; let stop: string | undefined;
    for (let i = 0; i < n; i++) {
      const plan = st.ops.mode === 'semi' && i > 0 ? suggestPlan(st) : this.getState().plan;
      const c = runCycle(st, plan); st = { ...st, ops: applyCycle(st, c) };
      this.record({ code: 'EVT-A4-001', trace: 'cycle_executed', data: { cycle: c.n, plan, energy_in: c.energyIn, energy_out: c.energyOut } });
      if (c.produced > 0) this.record({ code: 'EVT-A4-002', trace: 'observation', data: { cycle: c.n, produced_gb: c.produced } });
      if (c.missedWindow) this.record({ code: 'EVT-A4-003', trace: 'window_missed', data: { cycle: c.n } });
      if (c.clue) this.record({ code: 'EVT-A4-004', trace: 'anomaly_clue', data: { cycle: c.n, clue: c.clue } });
      if (isCritical(st)) { stop = `Avance interrompue au cycle ${c.n} : alerte.`; break; }
      if (c.clue && n > 1) { stop = `Avance interrompue au cycle ${c.n} : indice d’anomalie.`; break; }
    }
    this.setState({ interrupted: stop }); await this.goTo('/campagne/acte-4/bilan', { ops: st.ops });
  }
  execute = () => { if (this.planAvailability().ok && !this.getState().busy) { this.setState({ busy: true }); void this.exec(1).finally(() => this.setState({ busy: false })); } };
  fastForward = () => { if (this.planAvailability().ok && !this.getState().busy) { this.setState({ busy: true }); void this.exec(this.getState().ffN).finally(() => this.setState({ busy: false })); } };
  next = () => (this.critical ? void this.goTo('/campagne/acte-5/alerte') : this.go('/campagne/acte-4/controle'));
  capacity = () => {
    const t = totals(this.m.config, this.m.launch?.orbit); const e = this.m.server?.etat; const b = this.m.server?.report?.bilans;
    if (!this.srv) return t;
    return { ...t, batteryWh: e?.capaciteBatterieWh || b?.capaciteBatterieWh || t.batteryWh, storageGb: e ? round1(e.stockageGbit / 8) : 50, massKg: b?.masseTotaleKg ?? t.massKg, downlinkMbps: 100 };
  };
}

const round1 = (x: number) => Math.round(x * 10) / 10;
/** Construit l'enregistrement de cycle affiché à partir de deux états serveur consécutifs. */
function cycleFromServer(b: ServerSnapshot['etat'], a: NonNullable<ServerSnapshot['etat']>, plan: CyclePlan): CycleRecord {
  const p = a.serie.at(-1); const p0 = a.serie[0]; const ombre = a.fractionOmbre;
  const clue = a.evenements.filter((x) => x.jour === a.jour && x.indice).map((x) => x.indice).join(' ') || undefined;
  return { n: a.jour, obsHours: plan.obsHours, txWindows: plan.txWindows, instruments: plan.instruments,
    energyIn: Math.round((p?.puissanceW ?? 0) * 24 * (1 - ombre)), energyOut: Math.round(a.consommeeW * 24),
    batteryBefore: b?.batterieWh ?? a.capaciteBatterieWh, batteryAfter: a.batterieWh,
    produced: round1((a.genere - (b?.genere ?? 0)) / 8), transmitted: round1((a.transmis - (b?.transmis ?? 0)) / 8), lost: round1((a.perdu - (b?.perdu ?? 0)) / 8),
    storageAfter: round1(a.tamponGbit / 8), solarFactor: p0?.puissanceW ? (p?.puissanceW ?? 0) / p0.puissanceW : 1, missedWindow: false, clue, byInstrument: {} };
}
