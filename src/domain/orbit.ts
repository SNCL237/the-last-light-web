import type { OrbitChoice } from './mission';

/** Constantes lunaires (valeurs GMAT / JPL DE). */
export const MU_MOON = 4902.800066; // km³/s²
export const R_MOON = 1737.4; // km
const D2R = Math.PI / 180;

export interface Keplerian { sma: number; ecc: number; inc: number; raan: number; aop: number; ta: number; }
export interface StateVector { x: number; y: number; z: number; vx: number; vy: number; vz: number; }

/** Éléments au format GMAT (km, degrés). AOP = 270° : périlune au-dessus du pôle Sud (orbite figée type LRO). */
export function elementsOf(o: OrbitChoice, ta = 0, raan = 45): Keplerian {
  const rp = R_MOON + o.periKm, ra = R_MOON + o.apoKm;
  return { sma: (rp + ra) / 2, ecc: (ra - rp) / (ra + rp), inc: o.incDeg, raan, aop: o.kind === 'elliptic' ? 270 : 0, ta };
}
export const periodS = (sma: number) => 2 * Math.PI * Math.sqrt(sma ** 3 / MU_MOON);

/** Résout l'équation de Kepler M = E − e·sin E (Newton). */
export function trueAnomalyAt(k: Keplerian, dtS: number): number {
  const n = Math.sqrt(MU_MOON / k.sma ** 3);
  const ta0 = k.ta * D2R, e = k.ecc;
  const E0 = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(ta0 / 2));
  let M = E0 - e * Math.sin(E0) + n * dtS; M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  let E = M; for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const ta = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  return ((ta / D2R) + 360) % 360;
}

/** Vecteur d'état cartésien dans un repère inertiel lunaire (MoonMJ2000Eq simplifié). */
export function toCartesian(k: Keplerian): StateVector {
  const { sma: a, ecc: e } = k; const i = k.inc * D2R, O = k.raan * D2R, w = k.aop * D2R, nu = k.ta * D2R;
  const p = a * (1 - e * e), r = p / (1 + e * Math.cos(nu)), h = Math.sqrt(MU_MOON * p);
  const xp = r * Math.cos(nu), yp = r * Math.sin(nu);
  const vxp = -Math.sqrt(MU_MOON / p) * Math.sin(nu), vyp = Math.sqrt(MU_MOON / p) * (e + Math.cos(nu));
  const cO = Math.cos(O), sO = Math.sin(O), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(i), si = Math.sin(i);
  const R = [[cO * cw - sO * sw * ci, -cO * sw - sO * cw * ci], [sO * cw + cO * sw * ci, -sO * sw + cO * cw * ci], [sw * si, cw * si]];
  void h;
  return { x: R[0][0] * xp + R[0][1] * yp, y: R[1][0] * xp + R[1][1] * yp, z: R[2][0] * xp + R[2][1] * yp,
    vx: R[0][0] * vxp + R[0][1] * vyp, vy: R[1][0] * vxp + R[1][1] * vyp, vz: R[2][0] * vxp + R[2][1] * vyp };
}

/** Indicateurs de mission dérivés de l'orbite (modèle simplifié, documenté). */
export function orbitMetrics(o: OrbitChoice) {
  const k = elementsOf(o); const T = periodS(k.sma);
  const rMean = k.sma;
  // Fraction d'ombre maximale (orbite dans le plan de l'écliptique, cas défavorable).
  const eclipseFrac = Math.asin(Math.min(1, R_MOON / rMean)) / Math.PI;
  // Couverture des pôles : nulle si l'inclinaison ne dépasse pas la latitude visée (85°S).
  const polarCoverage = Math.max(0, Math.min(1, (o.incDeg - 60) / 30));
  // Δv : insertion (LOI) + maintien d'orbite sur un an (plus bas = plus de corrections, figée = peu).
  const loi = 820 + (o.apoKm > o.periKm ? -90 : 0);
  const sk = o.kind === 'elliptic' ? 40 : Math.round(9000 / Math.max(30, o.periKm));
  const commsFrac = 0.52; // fraction de temps où la Terre est visible (face visible + libration), simplifiée
  const vPeri = Math.sqrt(MU_MOON * (2 / (R_MOON + o.periKm) - 1 / k.sma));
  return { k, periodS: T, eclipseFrac, eclipseMin: (eclipseFrac * T) / 60, polarCoverage, dvRequired: loi + sk, loi, sk, commsFrac, vPeri, resolutionGain: 100 / o.periKm };
}

export const fmtDeg = (v: number) => v.toFixed(6);
export const fmtKm = (v: number) => v.toFixed(6);
