import { useEffect, useState } from 'react';
import type { OrbitChoice } from '../domain/mission';
import { elementsOf, MU_MOON, orbitMetrics, toCartesian, trueAnomalyAt } from '../domain/orbit';
import { EPOCH, missionSeconds } from '../scene/sceneStore';
import { t as tr } from '../i18n';

const f = (v: number, d = 6) => v.toFixed(d).padStart(d + 6, ' ');
const utc = (d: Date) => { const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
  return `${String(d.getUTCDate()).padStart(2, '0')} ${m} ${d.getUTCFullYear()} ${d.toISOString().slice(11, 23)}`; };

/** Lecture façon GMAT (« Report / OrbitView ») : éléments képlériens et vecteur d'état, propagés en direct (2 corps). */
export function GmatPanel({ orbit, dryMassKg, compact }: { orbit: OrbitChoice; dryMassKg?: number; compact?: boolean }) {
  const [t, setT] = useState(missionSeconds());
  useEffect(() => { const id = window.setInterval(() => setT(missionSeconds()), 100); return () => window.clearInterval(id); }, []);
  const k0 = elementsOf(orbit); const ta = trueAnomalyAt(k0, t); const k = { ...k0, ta }; const s = toCartesian(k); const m = orbitMetrics(orbit);
  const r = Math.hypot(s.x, s.y, s.z); const v = Math.hypot(s.vx, s.vy, s.vz);
  const rows: [string, string, string][] = [
    ['SMA', f(k.sma), 'km'], ['ECC', f(k.ecc, 9), ''], ['INC', f(k.inc), 'deg'], ['RAAN', f(k.raan), 'deg'], ['AOP', f(k.aop), 'deg'], ['TA', f(k.ta), 'deg'],
    ['Altitude', f(r - 1737.4), 'km'], ['VMAG', f(v), 'km/s'], ['Period', f(m.periodS / 60, 4), 'min'], ['Energy', f(-MU_MOON / (2 * k.sma), 6), 'km²/s²'],
  ];
  const vec: [string, string][] = [['X', f(s.x)], ['Y', f(s.y)], ['Z', f(s.z)], ['VX', f(s.vx)], ['VY', f(s.vy)], ['VZ', f(s.vz)]];
  return <div className="gmat" role="region" aria-label={tr("Paramètres orbitaux (format GMAT)")}>
    <div className="gmat-h"><span>{tr("TLL_Orbiter")}</span><span>{tr("MoonMJ2000Eq · LunaProp (2 corps)")}</span></div>
    <div className="gmat-ep">{tr("UTCGregorian")} <b>{utc(new Date(EPOCH.getTime() + t * 1000))}</b></div>
    <table><tbody>{rows.slice(0, compact ? 8 : rows.length).map(([a, b, c]) => <tr key={a}><th scope="row">{a}</th><td>{b}</td><td>{c}</td></tr>)}</tbody></table>
    {!compact && <table className="gmat-vec"><tbody>{[0, 3].map((i) => <tr key={i}>{vec.slice(i, i + 3).map(([a, b]) => <td key={a}><span>{a}</span>{b.trim()}</td>)}</tr>)}</tbody></table>}
    {dryMassKg !== undefined && <div className="gmat-ep">{tr("DryMass")} <b>{dryMassKg.toFixed(3)} {tr("kg")}</b> · μ☾ {MU_MOON} {tr("km³/s²")}</div>}
  </div>;
}
