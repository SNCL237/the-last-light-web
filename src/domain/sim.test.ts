import { describe, expect, it } from 'vitest';
import { newMission } from '../features/mission/MissionViewModel';
import { ORBIT_PRESETS, type CrisisOption, type MissionState } from './mission';
import { applyCycle, determineEnding, isCritical, launchCheck, runCycle, simulateRest, suggestPlan, totals, validate } from './sim';

const LEAN = ['bus-al', 'sa-700', 'bat-1200', 'rf-x', 'adcs-std', 'obc-100', 'eng-bi', 'ins-neutron', 'ins-camera', 'ins-radar'];
const SOLID = ['bus-cf', 'sa-1000', 'bat-2400', 'rf-ka', 'adcs-hp', 'obc-400', 'eng-bi', 'ins-neutron', 'ins-camera'];
function fly(config: string[], profile: MissionState['profile'], options: CrisisOption[], launcherId = 'lv-medium') {
  let s: MissionState = { ...newMission(profile), config, launch: { launcherId, orbit: ORBIT_PRESETS.polar } };
  s = { ...s, ops: { ...s.ops, batteryWh: totals(config).batteryWh } };
  while (!isCritical(s) && s.ops.cycle < 8) s = { ...s, ops: applyCycle(s, runCycle(s, suggestPlan(s))) };
  const pred = simulateRest(s, options, true); const r = simulateRest(s, options, false);
  s = { ...s, ops: r.ops, crisis: { options, predicted: { finalState: pred.finalState, transmitted: pred.transmitted }, finalState: r.finalState } };
  return { s, crisisAt: s.ops.history.length, pred, r, ending: determineEnding(s) };
}

describe('simulation', () => {
  it('bilans et validation', () => {
    const t = totals(SOLID); expect(t.powerRatio).toBeLessThan(0.9);
    expect(validate({ config: SOLID, profile: { primary: 'ice', secondaries: ['mapping'], elias: 'drop' } }).filter((i) => i.severity === 'error')).toEqual([]);
    const lean = validate({ config: LEAN, profile: { primary: 'ice', secondaries: [], elias: 'keep' } });
    expect(lean.map((i) => i.code)).toContain('PIRE_CAS_ENERGIE');
    expect(validate({ config: [], profile: { primary: 'ice', secondaries: [], elias: 'keep' } }).filter((i) => i.code === 'INCOMPLET')).toHaveLength(6);
  });
  it('lancement : masse, Δv, orbite incohérente', () => {
    const s = { ...newMission({ primary: 'ice', secondaries: [], elias: 'drop' }), config: SOLID };
    expect(launchCheck(s, 'lv-medium', ORBIT_PRESETS.polar).filter((i) => i.severity === 'error')).toEqual([]);
    expect(launchCheck(s, 'lv-medium', ORBIT_PRESETS.low).map((i) => i.code)).toContain('ORBITE_INCOHERENTE');
    expect(launchCheck({ ...s, config: SOLID.map((c) => c === 'eng-bi' ? 'eng-mono' : c) }, 'lv-medium', ORBIT_PRESETS.polar).map((i) => i.code)).toContain('DELTA_V_INSUFFISANT');
  });
  it('les quatre fins sont atteignables', () => {
    const p = { primary: 'ice' as const, secondaries: ['mapping' as const], elias: 'keep' as const };
    const out = {
      solidContinue: fly(SOLID, { ...p, elias: 'drop' }, ['continue']),
      leanContinue: fly(LEAN, p, ['continue']),
      leanRadarOff: fly(LEAN, p, ['radar_off', 'reduce_tx']),
      leanLow: fly(LEAN, p, ['low_power']),
      sBandMapping: fly(LEAN.map((c) => c === 'rf-x' ? 'rf-s' : c), { primary: 'mapping', secondaries: [], elias: 'keep' }, ['continue']),
      solidSuspend: fly(SOLID, { ...p, elias: 'drop' }, ['suspend_obs']),
    };
    const summary = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, `${v.ending} crisis@${v.crisisAt} pred=${v.pred.finalState} real=${v.r.finalState} tx=${v.s.ops.transmitted} byI=${JSON.stringify(v.s.ops.byInstrument)}`]));
    void summary;
    expect(new Set(Object.values(out).map((v) => v.ending))).toEqual(new Set(['legacy', 'fragment', 'last_signal', 'silence']));
    expect(out.solidContinue.ending).toBe('legacy'); expect(out.leanContinue.r.finalState).toBe('loss'); expect(out.leanLow.r.finalState).toBe('degraded');
  });
});
