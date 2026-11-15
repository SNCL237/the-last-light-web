import { LAUNCHERS, ORBIT_PRESETS, type MissionState, type OrbitChoice, type OrbitKind } from '../../domain/mission';
import { launchCheck, totals } from '../../domain/sim';
import { sceneStore } from '../../scene/sceneStore';
import { reducedMotion } from '../../domain/preferences';
import { MissionViewModel, type MissionDeps } from '../mission/MissionViewModel';
import { sceneAddons, serverIssues } from '../workshop/WorkshopViewModel';
import type { Issue } from '../../domain/sim';

export const PHASES = ['Compte à rebours', 'Contrôle des systèmes', 'Décollage', 'Séparation des étages', 'Injection translunaire', 'Insertion en orbite lunaire'];
export interface LaunchExtra { orbitId?: string; launcherId: string; orbit: OrbitChoice; confirm: boolean; checkpoint: boolean; eliasOpen: boolean; phase: number; paused: boolean; staticMode: boolean; }

export class LaunchViewModel extends MissionViewModel<LaunchExtra> {
  private timer?: number;
  constructor(d: MissionDeps, private step: 'review' | 'sequence') {
    super(d, { launcherId: 'lv-medium', orbit: ORBIT_PRESETS.polar, confirm: false, checkpoint: true, eliasOpen: false, phase: 0, paused: false,
      staticMode: typeof window !== 'undefined' && reducedMotion() });
  }
  protected onReady(m: MissionState): void {
    if (m.launch?.launchedAt) { this.go('/campagne/acte-4/controle'); return; }
    if (m.launch) this.setState({ launcherId: m.launch.launcherId, orbit: m.launch.orbit });
    if (this.srv && this.step === 'review') {
      const gw = this.srv; const o = gw.orbits.find((x) => x.id === m.server?.orbitId) ?? gw.orbits[0];
      const lv = m.server?.launcherId ?? LAUNCHERS.find((l) => /moyen/i.test(l.label))?.id ?? LAUNCHERS[0].id;
      this.setState({ orbitId: o.id, orbit: o.choice, launcherId: lv }); void this.pushLaunch();
    }
    if (this.step === 'sequence') { sceneStore.set({ view: 'transfer', mood: 'normal', progress: 0, addons: sceneAddons(m.config) }); if (!this.getState().staticMode) this.play(); }
    else this.sync();
  }
  private disposed = false;
  /** Page quittée : plus aucune minuterie ni navigation ne doit partir de cette séquence. */
  dispose = () => { this.disposed = true; window.clearInterval(this.timer); };
  /** Remontage (StrictMode en développement) : on reprend la séquence là où elle était. */
  revive = () => {
    this.disposed = false; const s = this.getState();
    if (this.step === 'sequence' && s.status === 'ready' && !this.finished && !s.paused && !s.staticMode) this.play();
  };
  private sync() { sceneStore.set({ view: 'orbit', mood: 'normal', orbit: this.getState().orbit, addons: sceneAddons(this.m.config) }); }
  get issues(): Issue[] { return this.srv ? serverIssues(this.m.server?.report) : launchCheck(this.m, this.getState().launcherId, this.getState().orbit); }
  /** Mode connecté : le choix lanceur/orbite est envoyé au serveur, qui renvoie la compatibilité (masse, budget…). */
  private async pushLaunch() {
    const gw = this.srv; const s = this.getState(); if (!gw || !s.orbitId || !this.m.server) return;
    this.setState({ busy: true });
    try { const report = await gw.setLaunch(this.m.server, s.launcherId, s.orbitId); await this.commit({ ...this.m, server: { ...this.m.server, report, launcherId: s.launcherId, orbitId: s.orbitId } }); this.setState({ busy: false }); }
    catch (e) { this.fail(e); }
  }
  chooseServerOrbit = (id: string) => { const o = this.srv?.orbits.find((x) => x.id === id); if (!o) return; this.setState({ orbitId: id, orbit: o.choice }); this.sync(); void this.pushLaunch(); };
  chooseLauncher = (id: string) => { this.setState({ launcherId: id }); void this.pushLaunch(); };
  chooseOrbit = (k: OrbitKind) => { const { label: _l, desc: _d, ...o } = ORBIT_PRESETS[k]; void _l; void _d; this.setState({ orbit: o }); this.sync(); };
  setParam = (key: 'periKm' | 'apoKm' | 'incDeg', v: number) => {
    const o = { ...this.getState().orbit, [key]: v };
    if (o.kind !== 'elliptic') o.apoKm = o.periKm; if (o.apoKm < o.periKm) o.apoKm = o.periKm;
    this.setState({ orbit: o }); this.sync();
  };
  capacityKg = () => (this.srv && this.getState().orbitId ? this.srv.launcherCapacity(this.getState().launcherId, this.getState().orbitId!) : this.launcher().capacityKg);
  launchAvailability() { if (this.getState().busy) return { ok: false, reason: 'Vérification serveur…' }; const e = this.issues.filter((i) => i.severity === 'error'); return e.length ? { ok: false, reason: `Lancement impossible : ${e[0].title.toLowerCase()}.` } : { ok: true }; }
  requestLaunch = () => { if (this.launchAvailability().ok) this.setState({ confirm: true }); };
  cancel = () => this.setState({ confirm: false });
  toggleCheckpoint = () => this.setState({ checkpoint: !this.getState().checkpoint });
  toggleElias = () => this.setState({ eliasOpen: !this.getState().eliasOpen });
  confirmLaunch = async () => {
    const s = this.getState(); if (s.busy || !this.launchAvailability().ok) return; this.setState({ busy: true });
    const launch = { launcherId: s.launcherId, orbit: s.orbit };
    this.record({ code: 'EVT-A3-001', trace: 'launch_configuration', data: { launcher: s.launcherId, orbit: s.orbit } });
    this.record({ code: 'EVT-A3-002', trace: 'launch_validation', data: { warnings: this.issues.map((i) => i.code) } });
    let checkpoints = this.m.checkpoints;
    if (s.checkpoint) { const { checkpoints: _c, ...snapshot } = this.m; void _c; checkpoints = [...checkpoints.filter((c) => c.id !== 'pre-launch'), { id: 'pre-launch', label: 'Avant le lancement', at: new Date().toISOString(), snapshot: { ...snapshot, launch } }]; }
    if (this.srv && this.m.server) {
      try { const r = await this.srv.advanceTo(this.m.server, 3); await this.commit({ ...this.m, server: { ...this.m.server, act: r.acte } }); }
      catch (e) { this.fail(e); this.setState({ confirm: false }); return; }
    }
    await this.goTo('/campagne/acte-3/lancement', { launch, checkpoints });
    this.setState({ busy: false, confirm: false });
  };
  // Séquence (P12)
  play = () => { window.clearInterval(this.timer); if (this.disposed) return; this.setState({ paused: false });
    this.timer = window.setInterval(() => { if (this.disposed) { window.clearInterval(this.timer); return; } const p = this.getState().phase + 1; if (p >= PHASES.length) { window.clearInterval(this.timer); void this.finish(); return; }
      this.setState({ phase: p }); sceneStore.set({ progress: p / (PHASES.length - 1) }); }, 1800); };
  pause = () => { window.clearInterval(this.timer); this.setState({ paused: true }); };
  skip = () => { window.clearInterval(this.timer); this.setState({ phase: PHASES.length - 1 }); void this.finish(); };
  private finished = false;
  finish = async () => {
    if (this.finished || this.disposed || !this.m.launch) return; this.finished = true;
    this.record({ code: 'EVT-A3-003', trace: 'launch_confirmed', data: { launcher: this.m.launch.launcherId } });
    const t = totals(this.m.config, this.m.launch.orbit);
    if (this.srv && this.m.server) {
      try { const r = await this.srv.advanceTo(this.m.server, 4); await this.commit({ ...this.m, server: { ...this.m.server, act: r.acte } }); }
      catch (e) { this.finished = false; this.fail(e); return; }
    }
    await this.goTo('/campagne/acte-4/controle', { launch: { ...this.m.launch, launchedAt: new Date().toISOString() }, ops: { ...this.m.ops, batteryWh: t.batteryWh } });
  };
  capacityFor = (id: string) => (this.srv && this.getState().orbitId ? this.srv.launcherCapacity(id, this.getState().orbitId!) : LAUNCHERS.find((l) => l.id === id)?.capacityKg ?? 0);
  serverOrbits = () => this.srv?.orbits ?? [];
  serverFigures = () => (this.srv ? this.m.server?.report?.bilans : undefined);
  launcher = () => LAUNCHERS.find((l) => l.id === this.getState().launcherId)!;
}
