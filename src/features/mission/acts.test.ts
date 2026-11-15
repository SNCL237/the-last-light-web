import { describe, expect, it, vi } from 'vitest';
import type { MissionState } from '../../domain/mission';
import { comp } from '../../domain/sim';
import { CrisisViewModel } from '../crisis/CrisisViewModel';
import { WorkshopViewModel } from '../workshop/WorkshopViewModel';
import { newMission, type MissionDeps } from './MissionViewModel';

function deps(initial: MissionState | null) {
  let stored = initial; const events: string[] = [];
  const d: MissionDeps = {
    campaigns: { getLatest: async () => ({ id: 'c', currentAct: 2, mode: 'guided', updatedAt: new Date() }), create: vi.fn() },
    missions: { load: async () => stored, save: async (_id, s) => { stored = s; } },
    profiles: { save: vi.fn(), load: async () => ({ primary: 'ice', secondaries: ['mapping'], elias: 'keep' }) },
    events: { record: async (_c, e) => { events.push(e.code); } }, nav: { go: vi.fn() },
  };
  return { d, events, get: () => stored };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('Atelier / prévalidation', () => {
  it('Ka exige le pointage fin ; validation bloquée tant qu’un avertissement n’est pas accepté', async () => {
    const { d, events, get } = deps(null); const vm = new WorkshopViewModel(d, 'design'); await vm.init();
    expect(vm.reason(comp('rf-ka')!)).toMatch(/pointage|précision/);
    vm.applyPreset(); await flush();
    expect(events).toContain('EVT-A2-001'); expect(events).toContain('EVT-A2-004'); // archive d'Elias à la complétion de l'énergie
    vm.install('bat-1200'); await flush(); // pire cas non couvert -> avertissement
    const v = new WorkshopViewModel(d, 'validation'); await v.init();
    expect(v.validationAvailability().ok).toBe(false);
    v.issues.filter((i) => i.severity === 'warning').forEach((i) => v.toggleAccept(i.code));
    expect(v.validationAvailability().ok).toBe(true);
    await v.validateConfig();
    expect(get()?.validated).toBe(true); expect(get()?.peakHandled).toBe(false);
    expect(get()?.acceptances.map((a) => a.code)).toContain('PIRE_CAS_ENERGIE'); expect(events).toContain('EVT-A2-003');
    expect(d.nav.go).toHaveBeenCalledWith('/campagne/acte-3/revue');
  });
});

describe('Crise', () => {
  it('« Continuer » exclut les autres options ; décision tracée et état verrouillé', async () => {
    const m: MissionState = { ...newMission({ primary: 'ice', secondaries: [], elias: 'keep' }), reached: 9,
      config: ['bus-al', 'sa-700', 'bat-1200', 'rf-x', 'adcs-std', 'obc-100', 'eng-bi', 'ins-neutron', 'ins-radar'],
      launch: { launcherId: 'lv-medium', orbit: { kind: 'polar', periKm: 100, apoKm: 100, incDeg: 90 }, launchedAt: 'x' } };
    m.ops = { ...m.ops, cycle: 5, batteryWh: 300, history: [{ n: 5, obsHours: 8, txWindows: 4, instruments: ['neutron', 'radar'], energyIn: 5700, energyOut: 6600, batteryBefore: 1200, batteryAfter: 300, produced: 27, transmitted: 27, lost: 0, storageAfter: 0, solarFactor: 0.66, missedWindow: false, byInstrument: { neutron: 2 } }] };
    const { d, events, get } = deps(m); const vm = new CrisisViewModel(d, 'arbitration'); await vm.init();
    vm.toggle('continue'); expect(vm.reason('radar_off')).toMatch(/Continuer/);
    vm.toggle('continue'); vm.toggle('low_power'); expect(vm.reason('suspend_obs')).toMatch(/inclus/);
    vm.requestDecision(); await vm.decide();
    expect(get()?.crisis?.finalState).toBe('degraded'); expect(events).toContain('EVT-A5-003');
    expect(d.nav.go).toHaveBeenCalledWith('/campagne/acte-5/resolution');
  });
});
