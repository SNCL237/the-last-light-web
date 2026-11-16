import { t } from '../../i18n';
import type { CrisisOption, MissionState } from '../../domain/mission';
import { hoursToThreshold, optionAvailability, simulateRest, totals } from '../../domain/sim';
import { sceneStore } from '../../scene/sceneStore';
import { MissionViewModel, type MissionDeps } from '../mission/MissionViewModel';
import { sceneAddons } from '../workshop/WorkshopViewModel';
import { ApiError } from '../../data/backend/api';
import { summarizeEtat } from '../../data/backend/ServerGateway';
import type { FinalState } from '../../domain/mission';

const SERVER_CHOICE: Record<CrisisOption, string> = { radar_off: 'desactiver-instrument', reduce_tx: 'reduire-transmissions', suspend_obs: 'suspendre-observations', low_power: 'basse-consommation', continue: 'poursuivre' };
const STATE_OF: Record<string, FinalState> = { nominale: 'stable', ecourtee: 'degraded', perdue: 'loss' };

export type CrisisStep = 'alert' | 'diagnostic' | 'arbitration' | 'resolution';
export interface CrisisExtra { chosen: CrisisOption[]; confirm: boolean; }

export class CrisisViewModel extends MissionViewModel<CrisisExtra> {
  constructor(d: MissionDeps, readonly step: CrisisStep) { super(d, { chosen: [], confirm: false }); }
  protected onReady(m: MissionState): void {
    if (!m.launch) { this.go('/campagne/acte-3/revue'); return; }
    if (m.crisis?.finalState && this.step !== 'resolution') { this.go('/campagne/acte-5/resolution'); return; }
    sceneStore.set({ view: 'orbit', mood: 'crisis', orbit: m.launch.orbit, addons: sceneAddons(m.config) });
    if (this.step === 'alert') this.record({ code: 'EVT-A5-001', trace: 'critical_margin', data: { cycle: m.ops.cycle, battery_wh: m.ops.batteryWh, hours_to_threshold: hoursToThreshold(m) } });
    if (this.step === 'diagnostic') this.record({ code: 'EVT-A5-002', trace: 'diagnostic_viewed', data: { snapshot: { cycle: m.ops.cycle, battery_wh: m.ops.batteryWh, storage_gb: m.ops.storageGb, last: m.ops.history.at(-1) } } });
    if (this.step === 'resolution' && m.crisis?.finalState) {
      sceneStore.set({ mood: m.crisis.finalState === 'loss' ? 'silence' : m.crisis.finalState === 'stable' ? 'normal' : 'fragment' });
      if (m.archiveRead) this.record({ code: 'EVT-A5-004', trace: 'elias_final_message' });
      this.record({ code: 'EVT-A5-005', trace: 'state_locked', data: { final_state: m.crisis.finalState } });
    }
  }
  get hours() { return hoursToThreshold(this.m); }
  get serverMode() { return !!this.srv; }
  reason = (o: CrisisOption) => {
    const c = this.getState().chosen; if (c.includes(o)) return null;
    if (this.srv && c.length) return t('Le serveur accepte une seule décision par crise.');
    return optionAvailability(this.m, c, o);
  };
  toggle = (o: CrisisOption) => { const c = this.getState().chosen; if (c.includes(o)) this.setState({ chosen: c.filter((x) => x !== o) }); else if (!this.reason(o)) this.setState({ chosen: [...c, o] }); };
  get predicted() { return this.getState().chosen.length && !this.srv ? simulateRest(this.m, this.getState().chosen, true) : null; }
  open = (step: CrisisStep) => this.go(`/campagne/acte-5/${{ alert: 'alerte', diagnostic: 'diagnostic', arbitration: 'arbitrage', resolution: 'resolution' }[step]}`);
  toDiagnostic = () => void this.goTo('/campagne/acte-5/diagnostic');
  toArbitration = () => void this.goTo('/campagne/acte-5/arbitrage');
  requestDecision = () => { if (this.getState().chosen.length && (this.srv || this.predicted)) this.setState({ confirm: true }); };
  cancel = () => this.setState({ confirm: false });
  /** Mode connecté : décision envoyée au serveur, puis fin de mission simulée par lui. */
  private async decideServer() {
    const gw = this.srv!; const srv = this.m.server!; const choice = this.getState().chosen[0];
    this.setState({ busy: true });
    try {
      const radarId = choice === 'radar_off' ? gw.instrumentId('radar') : undefined;
      let r = await gw.decide(srv, SERVER_CHOICE[choice], radarId);
      let etat = summarizeEtat(r.etatSimulation) ?? srv.etat!; const before = srv.etat ?? etat;
      for (let k = 0; k < 4 && !etat.terminee; k++) {
        try { r = await gw.simulate(srv, [], Math.max(1, etat.limiteJours - etat.jour)); etat = summarizeEtat(r.etatSimulation) ?? etat; }
        catch (e) {
          if (e instanceof ApiError && e.code === 'DECISION_ATTENDUE') { r = await gw.decide(srv, 'poursuivre'); etat = summarizeEtat(r.etatSimulation) ?? etat; continue; }
          if (e instanceof ApiError && e.code === 'SIMULATION_TERMINEE') break;
          throw e;
        }
      }
      const finalState = STATE_OF[etat.issue] ?? 'degraded'; const tx = Math.round(((etat.transmis - before.transmis) / 8) * 10) / 10;
      this.record({ code: 'EVT-A5-003', trace: 'crisis_decision', data: { options: [choice], server: true, issue: etat.issue } });
      await this.goTo('/campagne/acte-5/resolution', {
        server: { ...srv, etat, act: r.acte },
        ops: { ...this.m.ops, cycle: etat.jour, batteryWh: etat.batterieWh, storageGb: Math.round((etat.tamponGbit / 8) * 10) / 10, produced: Math.round((etat.genere / 8) * 10) / 10, transmitted: Math.round((etat.transmis / 8) * 10) / 10, lost: Math.round((etat.perdu / 8) * 10) / 10 },
        crisis: { serverOnly: true, options: [choice], predicted: { finalState, transmitted: tx }, finalState,
          computed: { transmitted: tx, lost: Math.round(((etat.perdu - before.perdu) / 8) * 10) / 10, batteryMin: Math.min(...etat.serie.map((p) => p.batterieWh)), daysSurvived: etat.jour - before.jour } } });
      this.setState({ busy: false, confirm: false });
    } catch (e) { this.fail(e); this.setState({ confirm: false }); }
  }
  decide = async () => {
    if (this.srv) return this.decideServer();
    const s = this.getState(); if (s.busy || !s.chosen.length) return; this.setState({ busy: true });
    const pred = simulateRest(this.m, s.chosen, true); const real = simulateRest(this.m, s.chosen, false);
    this.record({ code: 'EVT-A5-003', trace: 'crisis_decision', data: { options: s.chosen, predicted: pred.finalState, computed: real.finalState } });
    await this.goTo('/campagne/acte-5/resolution', { ops: real.ops, crisis: { options: s.chosen, predicted: { finalState: pred.finalState, transmitted: pred.transmitted }, finalState: real.finalState,
      computed: { transmitted: real.transmitted, lost: real.lost, batteryMin: real.batteryMin, daysSurvived: real.daysSurvived } } });
    this.setState({ busy: false, confirm: false });
  };
  toReport = () => void this.goTo('/campagne/acte-6/rapport');
  capacity = () => {
    const t = totals(this.m.config, this.m.launch?.orbit); const e = this.m.server?.etat;
    return this.srv && e ? { ...t, batteryWh: e.capaciteBatterieWh || t.batteryWh, storageGb: Math.round((e.stockageGbit / 8) * 10) / 10, downlinkMbps: 100 } : t;
  };
}
