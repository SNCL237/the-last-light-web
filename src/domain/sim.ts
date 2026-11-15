import { BUDGET_M, BUS_HOUSEKEEPING_W, COMPONENTS, LAUNCHERS, ORBIT_PRESETS, RADAR_PEAK_W, SINGLE_SLOTS, SUBSYSTEMS,
  type Component, type CrisisOption, type CycleRecord, type EndingId, type FinalState, type MissionState, type OrbitChoice, type SubsystemId } from './mission';
import { orbitMetrics } from './orbit';
import type { InstrumentId, ObjectiveId } from './profile';

/**
 * Moteur de simulation PUR (aperçus). Le backend reste l'autorité ; ce module doit être partagé
 * avec lui (tests de parité). Toutes les constantes sont des paramètres de gameplay.
 */
export const DOD = 0.3, ETA = 0.9, PANEL_EFF = 0.85, MISSION_CYCLES = 20, WINDOW_H = 1, MAX_WINDOWS = 6;
export const OBJECTIVE_INSTRUMENTS: Record<ObjectiveId, InstrumentId[]> = { mapping: ['camera'], ice: ['neutron'], thermal: ['thermal'], composition: ['camera', 'thermal'] };
/** Volume transmis (Go) nécessaire pour atteindre l'objectif, par instrument. */
export const OBJECTIVE_TARGETS: Record<ObjectiveId, Partial<Record<InstrumentId, number>>> = {
  mapping: { camera: 220 }, ice: { neutron: 14, radar: 0 }, thermal: { thermal: 40 }, composition: { camera: 110, thermal: 20 },
};

export const comp = (id: string): Component | undefined => COMPONENTS.find((c) => c.id === id);
export const parts = (config: string[]) => config.map(comp).filter(Boolean) as Component[];
const sum = (cs: Component[], f: (c: Component) => number | undefined) => cs.reduce((a, c) => a + (f(c) ?? 0), 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

export function totals(config: string[], orbit: OrbitChoice = ORBIT_PRESETS.polar) {
  const cs = parts(config); const m = orbitMetrics(orbit);
  const ins = cs.filter((c) => c.slot === 'instrument');
  const radio = cs.find((c) => c.slot === 'radio');
  const base = BUS_HOUSEKEEPING_W + sum(cs.filter((c) => c.slot === 'adcs' || c.slot === 'obc'), (c) => c.powerW);
  const nominalW = base + (radio?.powerW ?? 0) * 0.3 + sum(ins, (c) => c.powerW) * 0.6;
  const hasRadar = ins.some((c) => c.instrument === 'radar');
  const peakW = base + 30 + (radio?.powerW ?? 0) + sum(ins, (c) => c.powerW) + (hasRadar ? RADAR_PEAK_W : 0);
  const solarW = sum(cs, (c) => c.solarW); const avgProdW = solarW * PANEL_EFF * (1 - m.eclipseFrac);
  const eclipseH = m.eclipseMin / 60;
  const batteryWh = sum(cs, (c) => c.batteryWh);
  const reliability = cs.reduce((a, c) => a * c.reliability, 1);
  const downlinkMbps = radio?.downlinkMbps ?? 0;
  return {
    massKg: r1(sum(cs, (c) => c.massKg)), costM: r1(sum(cs, (c) => c.costM)), solarW, avgProdW: r1(avgProdW),
    nominalW: r1(nominalW), peakW: r1(peakW), powerRatio: avgProdW ? nominalW / avgProdW : Infinity,
    batteryWh, batteryNeedWh: Math.round((nominalW * eclipseH) / (DOD * ETA)), batteryPeakNeedWh: Math.round((peakW * eclipseH) / (DOD * ETA)),
    storageGb: sum(cs, (c) => c.storageGb), dataGbPerDay: r1(sum(ins, (c) => c.dataGbPerDay)),
    downlinkGbPerDay: r1((downlinkMbps * 3600 * WINDOW_H * MAX_WINDOWS) / 8000), downlinkMbps,
    dvMs: sum(cs, (c) => c.dvMs), reliability, hasRadar, instruments: ins.map((c) => c.instrument as InstrumentId),
  };
}
export type Totals = ReturnType<typeof totals>;

export interface Issue { code: string; severity: 'error' | 'warning'; title: string; detail: string; value?: string; componentId?: string; subsystem?: SubsystemId; }

export function subsystemCompleteness(config: string[]): Record<SubsystemId, boolean> {
  const cs = parts(config); const has = (slot: string) => cs.some((c) => c.slot === slot);
  return { structure: has('bus'), power: has('solar') && has('battery'), comms: has('radio'), control: has('adcs') && has('obc'), payload: has('instrument'), propulsion: has('engine') };
}

/** Raison pour laquelle un composant ne peut pas être installé (null si possible). */
export function incompatibility(config: string[], c: Component): string | null {
  if (c.requires && !config.includes(c.requires)) return c.requiresReason ?? 'Prérequis manquant.';
  const replaced = SINGLE_SLOTS.includes(c.slot) ? parts(config).find((y) => y.slot === c.slot && y.id !== c.id) : undefined;
  const dep = replaced && parts(config).find((x) => x.requires === replaced.id);
  if (dep) return `Retirez d\u2019abord « ${dep.name} » : il exige « ${replaced.name} ».`;
  return null;
}

export function validate(s: Pick<MissionState, 'config' | 'profile'>, orbit?: OrbitChoice): Issue[] {
  const t = totals(s.config, orbit); const out: Issue[] = [];
  const done = subsystemCompleteness(s.config);
  for (const ss of SUBSYSTEMS) if (!done[ss.id]) out.push({ code: 'INCOMPLET', severity: 'error', subsystem: ss.id, title: `${ss.label} incomplet`, detail: ss.id === 'power' ? 'Il faut des panneaux ET une batterie.' : ss.id === 'control' ? 'Il faut un contrôle d’attitude ET un ordinateur.' : 'Aucun composant installé.' });
  const missing = (o: ObjectiveId) => OBJECTIVE_INSTRUMENTS[o].filter((i) => !t.instruments.includes(i));
  const pm = missing(s.profile.primary);
  if (pm.length) out.push({ code: 'OBJECTIF_PRINCIPAL_SANS_INSTRUMENT', severity: 'error', subsystem: 'payload', componentId: `ins-${pm[0]}`, title: 'Objectif principal sans instrument', detail: 'L’objectif principal ne peut pas être mesuré.', value: pm.join(', ') });
  for (const o of s.profile.secondaries) { const m = missing(o); if (m.length) out.push({ code: 'OBJECTIF_SECONDAIRE_SANS_INSTRUMENT', severity: 'warning', subsystem: 'payload', componentId: `ins-${m[0]}`, title: 'Objectif secondaire sans instrument', detail: 'Cet objectif sera abandonné.', value: o }); }
  if (done.power) {
    const pct = Math.round(t.powerRatio * 1000) / 10;
    if (t.powerRatio > 1) out.push({ code: 'PUISSANCE_INSUFFISANTE', severity: 'error', subsystem: 'power', componentId: parts(s.config).find((c) => c.slot === 'solar')?.id, title: 'Consommation supérieure à la production', detail: `${t.nominalW} W consommés pour ${t.avgProdW} W produits en moyenne d’orbite.`, value: `${pct} %` });
    else if (t.powerRatio > 0.9) out.push({ code: 'MARGE_PUISSANCE_FAIBLE', severity: 'warning', subsystem: 'power', componentId: parts(s.config).find((c) => c.slot === 'solar')?.id, title: 'Marge de puissance faible', detail: 'Au-delà de 90 % de la production, la moindre dégradation devient critique.', value: `${pct} %` });
    if (t.batteryWh < t.batteryNeedWh) out.push({ code: 'BATTERIE_INSUFFISANTE', severity: 'error', subsystem: 'power', componentId: parts(s.config).find((c) => c.slot === 'battery')?.id, title: 'Batterie insuffisante pour l’ombre', detail: `Besoin nominal ${t.batteryNeedWh} Wh (profondeur de décharge ${DOD * 100} %).`, value: `${t.batteryWh} Wh` });
    else if (t.batteryWh < t.batteryPeakNeedWh) out.push({ code: 'PIRE_CAS_ENERGIE', severity: 'warning', subsystem: 'power', componentId: parts(s.config).find((c) => c.slot === 'battery')?.id, title: 'Pire cas : demandes simultanées dans l’ombre', detail: `Si tout fonctionne en même temps pendant l’ombre, il faut ${t.batteryPeakNeedWh} Wh.`, value: `${t.batteryWh} Wh` });
  }
  if (t.costM + LAUNCHERS[0].costM > BUDGET_M) out.push({ code: 'BUDGET_DEPASSE', severity: 'error', title: 'Budget dépassé', detail: `Orbiteur ${t.costM} M€ + lanceur le moins cher ${LAUNCHERS[0].costM} M€ > ${BUDGET_M} M€.`, value: `${t.costM} M€` });
  else if (t.costM + LAUNCHERS[1].costM > BUDGET_M) out.push({ code: 'BUDGET_SERRE', severity: 'warning', title: 'Budget serré', detail: 'Seul le lanceur léger restera abordable.', value: `${t.costM} M€` });
  if (done.comms && t.dataGbPerDay > t.downlinkGbPerDay) out.push({ code: 'LIEN_INSUFFISANT', severity: 'warning', subsystem: 'comms', componentId: parts(s.config).find((c) => c.slot === 'radio')?.id, title: 'Liaison descendante insuffisante', detail: `${t.dataGbPerDay} Go/j produits, ${t.downlinkGbPerDay} Go/j transmissibles : le stockage va se remplir.`, value: `${t.downlinkGbPerDay} Go/j` });
  if (done.control && t.storageGb < t.dataGbPerDay * 2) out.push({ code: 'STOCKAGE_FAIBLE', severity: 'warning', subsystem: 'control', componentId: parts(s.config).find((c) => c.slot === 'obc')?.id, title: 'Mémoire de masse faible', detail: 'Moins de deux jours d’observations : une fenêtre manquée fera perdre des données.', value: `${t.storageGb} Go` });
  return out;
}

export function launchCheck(s: MissionState, launcherId: string, orbit: OrbitChoice): Issue[] {
  const t = totals(s.config, orbit); const m = orbitMetrics(orbit); const lv = LAUNCHERS.find((l) => l.id === launcherId)!;
  const out: Issue[] = [];
  if (t.massKg > lv.capacityKg) out.push({ code: 'MASSE_DEPASSE', severity: 'error', title: 'Masse supérieure à la capacité du lanceur', detail: `Écart ${r1(t.massKg - lv.capacityKg)} kg. Pistes : alléger l’orbiteur, choisir un lanceur plus puissant, revoir l’orbite.`, value: `${t.massKg} / ${lv.capacityKg} kg` });
  if (t.dvMs < m.dvRequired) out.push({ code: 'DELTA_V_INSUFFISANT', severity: 'error', title: 'Δv insuffisant', detail: `Insertion ${m.loi} m/s + maintien ${m.sk} m/s/an = ${m.dvRequired} m/s requis.`, value: `${t.dvMs} m/s` });
  if (m.polarCoverage < 0.5) out.push({ code: 'ORBITE_INCOHERENTE', severity: 'error', title: 'Les pôles ne sont pas survolés', detail: 'Tous les objectifs portent sur la région polaire sud : inclinaison trop faible.', value: `${orbit.incDeg}°` });
  if (t.costM + lv.costM > BUDGET_M) out.push({ code: 'BUDGET_DEPASSE', severity: 'error', title: 'Budget dépassé', detail: `${r1(t.costM + lv.costM)} M€ pour ${BUDGET_M} M€.`, value: `${r1(t.costM + lv.costM)} M€` });
  if (t.batteryWh < t.batteryNeedWh) out.push({ code: 'BATTERIE_INSUFFISANTE', severity: 'error', title: 'Batterie insuffisante pour cette orbite', detail: `Ombre de ${Math.round(m.eclipseMin)} min : ${t.batteryNeedWh} Wh requis.`, value: `${t.batteryWh} Wh` });
  if (orbit.periKm < 40) out.push({ code: 'PERILUNE_BAS', severity: 'warning', title: 'Périlune très bas', detail: 'Résolution maximale mais corrections d’orbite fréquentes et risque lié au relief.', value: `${orbit.periKm} km` });
  if (lv.reliability < 0.96) out.push({ code: 'FIABILITE_LANCEUR', severity: 'warning', title: 'Fiabilité du lanceur', detail: 'Lanceur léger : historique de vol plus court.', value: `${Math.round(lv.reliability * 100)} %` });
  return out;
}

/** Anomalie scénarisée : dégradation progressive puis perte d'une chaîne de cellules (cycle 5). */
export const solarFactor = (n: number) => [1, 1, 0.97, 0.92, 0.66, 0.64, 0.63, 0.62][Math.min(n - 1, 7)] - Math.max(0, n - 8) * 0.005;
export const CLUES: Record<number, string> = {
  3: 'Production solaire 3 % sous la prévision.', 4: 'Température d’un régulateur en hausse ; fenêtre de transmission manquée.',
  5: 'Perte d’une chaîne de cellules : production en chute.',
};
export interface CyclePlan { instruments: InstrumentId[]; obsHours: number; txWindows: number; lowPower?: boolean; }

export function runCycle(s: MissionState, plan: CyclePlan, opts: { solar?: number; n?: number } = {}): CycleRecord {
  const n = opts.n ?? s.ops.cycle + 1; const orbit = s.launch?.orbit ?? ORBIT_PRESETS.polar;
  const t = totals(s.config, orbit); const m = orbitMetrics(orbit); const cs = parts(s.config);
  const sf = opts.solar ?? solarFactor(n); const missed = n === 4 && plan.txWindows > 0;
  const heaterExtra = n >= 4 ? 25 : 0;
  const lp = plan.lowPower ? 0.65 : 1;
  const base = (BUS_HOUSEKEEPING_W + heaterExtra) * lp + sum(cs.filter((c) => c.slot === 'adcs' || c.slot === 'obc'), (c) => c.powerW) * (plan.lowPower ? 0.7 : 1);
  const ins = cs.filter((c) => c.slot === 'instrument' && plan.instruments.includes(c.instrument as InstrumentId));
  const radio = cs.find((c) => c.slot === 'radio');
  const txH = Math.max(0, plan.txWindows - (missed ? 1 : 0)) * WINDOW_H;
  const energyIn = Math.round(t.solarW * PANEL_EFF * sf * (1 - m.eclipseFrac) * 24);
  const energyOut = Math.round(base * 24 + sum(ins, (c) => c.powerW) * plan.obsHours + (ins.some((c) => c.instrument === 'radar') ? RADAR_PEAK_W * plan.obsHours * 0.25 : 0) + (radio?.powerW ?? 0) * txH);
  const batteryBefore = s.ops.batteryWh; const batteryAfter = Math.max(0, Math.min(t.batteryWh, batteryBefore + energyIn - energyOut));
  const byP: Partial<Record<InstrumentId, number>> = {};
  for (const c of ins) byP[c.instrument as InstrumentId] = ((c.dataGbPerDay ?? 0) * plan.obsHours) / 8;
  const produced = Object.values(byP).reduce((a, b) => a + (b ?? 0), 0);
  const txCap = ((radio?.downlinkMbps ?? 0) * 3600 * txH) / 8000;
  const pool = s.ops.storageGb + produced; const transmitted = Math.min(pool, txCap);
  let storageAfter = pool - transmitted; let lost = 0;
  if (storageAfter > t.storageGb) { lost = storageAfter - t.storageGb; storageAfter = t.storageGb; }
  const ratio = pool > 0 ? transmitted / pool : 0; const byInstrument: Partial<Record<InstrumentId, number>> = {};
  // Transmis : part proportionnelle du nouveau volume (simplification documentée).
  for (const [k, v] of Object.entries(byP)) byInstrument[k as InstrumentId] = (v ?? 0) * ratio;
  return { n, obsHours: plan.obsHours, txWindows: plan.txWindows, instruments: plan.instruments, energyIn, energyOut, batteryBefore, batteryAfter,
    produced: r1(produced), transmitted: r1(transmitted), lost: r1(lost), storageAfter: r1(storageAfter), solarFactor: sf, missedWindow: missed, clue: CLUES[n], byInstrument };
}

export function applyCycle(s: MissionState, c: CycleRecord): MissionState['ops'] {
  const byInstrument = { ...s.ops.byInstrument };
  for (const [k, v] of Object.entries(c.byInstrument)) byInstrument[k as InstrumentId] = r1((byInstrument[k as InstrumentId] ?? 0) + (v ?? 0));
  return { ...s.ops, cycle: c.n, batteryWh: c.batteryAfter, storageGb: c.storageAfter, produced: r1(s.ops.produced + c.produced),
    transmitted: r1(s.ops.transmitted + c.transmitted), lost: r1(s.ops.lost + c.lost), byInstrument, history: [...s.ops.history, c] };
}
/** Acte V : l'anomalie scénarisée (cycle 5) ouvre toujours la crise ; une réserve < 35 % l'ouvre plus tôt. */
export function isCritical(s: MissionState): boolean {
  const cap = totals(s.config).batteryWh; const last = s.ops.history.at(-1);
  return !!last && (last.batteryAfter < cap * 0.35 || last.n >= 5);
}
export function hoursToThreshold(s: MissionState): number | null {
  const last = s.ops.history.at(-1); if (!last) return null;
  const perH = (last.energyOut - last.energyIn) / 24; if (perH <= 0) return null;
  return Math.max(0, Math.round(((last.batteryAfter - totals(s.config).batteryWh * 0.1) / perH) * 10) / 10);
}
export function suggestPlan(s: MissionState): CyclePlan {
  const t = totals(s.config, s.launch?.orbit);
  return { instruments: t.instruments, obsHours: 8, txWindows: Math.min(MAX_WINDOWS, Math.max(2, Math.ceil((t.dataGbPerDay / Math.max(0.1, t.downlinkGbPerDay)) * MAX_WINDOWS))) };
}

// ---------- Crise ----------
export const CRISIS_OPTIONS: { id: CrisisOption; label: string; save: string; lose: string }[] = [
  { id: 'radar_off', label: 'Désactiver le radar', save: 'Énergie (pics d’émission supprimés)', lose: 'Mesures radar ; l’instrument d’Elias se tait' },
  { id: 'suspend_obs', label: 'Suspendre les observations', save: 'Énergie, place en mémoire', lose: 'Nouvelles données scientifiques' },
  { id: 'reduce_tx', label: 'Réduire les transmissions', save: 'Énergie de l’émetteur', lose: 'Données plus longtemps à bord, risque de saturation' },
  { id: 'low_power', label: 'Mode basse consommation', save: 'Survie de l’orbiteur', lose: 'Presque toute l’activité ; mission dégradée' },
  { id: 'continue', label: 'Continuer comme prévu', save: 'Toute la science, à court terme', lose: 'Risque calculé de décharge profonde' },
];
export function optionAvailability(s: MissionState, chosen: CrisisOption[], o: CrisisOption): string | null {
  if (o === 'radar_off' && !totals(s.config).hasRadar) return 'Aucun radar à bord.';
  if (o === 'continue' && chosen.some((c) => c !== 'continue')) return '« Continuer » exclut les autres options.';
  if (o !== 'continue' && chosen.includes('continue')) return 'Incompatible avec « Continuer comme prévu ».';
  if (o === 'suspend_obs' && chosen.includes('low_power')) return 'Déjà inclus dans le mode basse consommation.';
  if (o === 'low_power' && chosen.includes('suspend_obs')) return 'Retirez « Suspendre » : le mode basse consommation l’inclut.';
  return null;
}
export function crisisPlan(s: MissionState, options: CrisisOption[]): CyclePlan {
  const base = s.ops.history.at(-1) ?? { instruments: totals(s.config).instruments, obsHours: 8, txWindows: 4 };
  let ins = base.instruments.slice(); let obs = base.obsHours; let tx = base.txWindows; let lowPower = false;
  if (options.includes('radar_off')) ins = ins.filter((i) => i !== 'radar');
  if (options.includes('suspend_obs')) obs = 2;
  if (options.includes('reduce_tx')) tx = Math.min(tx, 2);
  if (options.includes('low_power')) { lowPower = true; obs = 0; tx = 1; }
  return { instruments: ins, obsHours: obs, txWindows: tx, lowPower };
}
/** Simule la fin de mission. `predicted` = production figée (ce que voit l'équipe) ; sinon dégradation continue. */
export function simulateRest(s: MissionState, options: CrisisOption[], predicted: boolean) {
  let st: MissionState = s; const plan = crisisPlan(s, options); let zeroDays = 0; let batteryMin = s.ops.batteryWh; let lossAt: number | null = null;
  const frozen = solarFactor(Math.max(5, s.ops.cycle));
  for (let n = s.ops.cycle + 1; n <= MISSION_CYCLES; n++) {
    const c = runCycle(st, plan, { n, solar: predicted ? frozen : solarFactor(n) });
    st = { ...st, ops: applyCycle(st, c) }; batteryMin = Math.min(batteryMin, c.batteryAfter);
    zeroDays = c.batteryAfter <= 0 ? zeroDays + 1 : 0;
    if (zeroDays >= 2) { lossAt = n; break; }
  }
  const degraded = options.some((o) => o !== 'continue' && o !== 'reduce_tx');
  const finalState: FinalState = lossAt ? 'loss' : degraded ? 'degraded' : 'stable';
  return { finalState, ops: st.ops, batteryMin, daysSurvived: (lossAt ?? MISSION_CYCLES) - s.ops.cycle,
    transmitted: r1(st.ops.transmitted - s.ops.transmitted), lost: r1(st.ops.lost - s.ops.lost + (lossAt ? st.ops.storageGb : 0)) };
}

// ---------- Résultats, fins, score ----------
export function objectiveAchievement(byInstrument: Partial<Record<InstrumentId, number>>, o: ObjectiveId): number {
  const tg = OBJECTIVE_TARGETS[o]; const ks = Object.entries(tg).filter(([, v]) => (v ?? 0) > 0);
  return Math.min(1, ks.reduce((a, [k, v]) => a + Math.min(1, (byInstrument[k as InstrumentId] ?? 0) / (v as number)), 0) / ks.length);
}
export function determineEnding(s: MissionState): EndingId {
  const fs = s.crisis?.finalState ?? 'stable'; const by = s.ops.byInstrument;
  const p = objectiveAchievement(by, s.profile.primary);
  const sec = s.profile.secondaries.map((o) => objectiveAchievement(by, o));
  const sacrificed = !!s.crisis?.options.some((o) => o === 'radar_off' || o === 'low_power');
  if (p < 0.4) return 'silence';
  if (fs === 'loss' || (sacrificed && p >= 0.6 && fs === 'degraded')) return 'last_signal';
  if (p >= 0.8 && sec.every((x) => x >= 0.8) && fs === 'stable') return 'legacy';
  return 'fragment';
}
export interface ScoreLine { category: string; points: number; max: number; why: string[]; }
export function score(s: MissionState): ScoreLine[] {
  const by = s.ops.byInstrument; const p = objectiveAchievement(by, s.profile.primary);
  const sec = s.profile.secondaries.map((o) => objectiveAchievement(by, o)); const secAvg = sec.length ? sec.reduce((a, b) => a + b, 0) / sec.length : 1;
  const fs = s.crisis?.finalState ?? 'stable'; const t = totals(s.config, s.launch?.orbit);
  const lv = LAUNCHERS.find((l) => l.id === s.launch?.launcherId);
  const ratio = s.ops.produced ? s.ops.transmitted / s.ops.produced : 0;
  const budgetMargin = lv ? (BUDGET_M - t.costM - lv.costM) / BUDGET_M : 0;
  const massMargin = lv ? (lv.capacityKg - t.massKg) / lv.capacityKg : 0;
  const lines: ScoreLine[] = [
    { category: 'Science', max: 35, points: Math.round(20 * p + 15 * secAvg), why: [`Objectif principal atteint à ${Math.round(p * 100)} % (20 pts max).`, sec.length ? `Objectifs secondaires : ${Math.round(secAvg * 100)} % en moyenne (15 pts max).` : 'Aucun objectif secondaire retenu : 15 pts acquis (choix assumé).'] },
    { category: 'Technique', max: 20, points: fs === 'stable' ? 20 : fs === 'degraded' ? 12 : 4, why: [`État final : ${fs === 'stable' ? 'stable' : fs === 'degraded' ? 'dégradé durable' : 'perte irrécupérable'}.`] },
    { category: 'Données', max: 20, points: Math.round(20 * Math.min(1, ratio)), why: [`${s.ops.transmitted} Go transmis sur ${s.ops.produced} Go produits ; ${s.ops.lost} Go perdus.`] },
    { category: 'Ressources', max: 10, points: Math.round(5 * Math.max(0, Math.min(1, budgetMargin * 5)) + 5 * Math.max(0, Math.min(1, massMargin * 4))), why: [`Marge budgétaire ${Math.round(budgetMargin * 100)} %.`, `Marge de masse lanceur ${Math.round(massMargin * 100)} %.`] },
    { category: 'Décisions', max: 15, points: (s.archiveRead ? 3 : 0) + (s.peakHandled ? 5 : 0) + (s.checkpoints.some((c) => c.id === 'pre-launch') ? 2 : 0) + (s.crisis && s.crisis.finalState !== 'loss' ? 5 : 0), why: [
      s.archiveRead ? 'Archive d’Elias consultée (+3).' : 'Archive d’Elias non consultée.',
      s.peakHandled ? 'Pire cas énergétique traité à la conception (+5).' : 'Pire cas énergétique non traité.',
      s.checkpoints.some((c) => c.id === 'pre-launch') ? 'Point de reprise avant lancement (+2).' : 'Pas de point de reprise avant lancement.',
      s.crisis?.finalState !== 'loss' ? 'Décision de crise qui préserve l’orbiteur (+5).' : 'Décision de crise suivie d’une perte.'] },
  ];
  return lines;
}
