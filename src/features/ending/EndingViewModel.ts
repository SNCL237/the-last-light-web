import { ROUTES, type MissionState } from '../../domain/mission';
import type { ReportArchive, ReportSummary } from '../../domain/ports';
import { determineEnding, objectiveAchievement, score, type ScoreLine } from '../../domain/sim';
import type { EndingId, ServerSnapshot } from '../../domain/mission';
import type { ObjectiveId } from '../../domain/profile';
import { messageFor } from '../../data/backend/api';
import { OBJECTIVE_IDS } from '../../data/backend/ServerGateway';

const ENDING_OF: Record<string, EndingId> = { A: 'legacy', B: 'fragment', C: 'last_signal', D: 'silence' };
const CAT: [string, string, number][] = [['science', 'Science', 300], ['technique', 'Technique', 250], ['ressources', 'Ressources', 200], ['fiabilite', 'Fiabilité', 150]];
import { sceneStore } from '../../scene/sceneStore';
import { MissionViewModel, type MissionDeps } from '../mission/MissionViewModel';
import { sceneAddons } from '../workshop/WorkshopViewModel';

export type EndingStep = 'report' | 'ending' | 'final';
export interface EndingExtra { section: string; previous: ReportSummary[]; compareId: string | null; line: number; }

export class EndingViewModel extends MissionViewModel<EndingExtra> {
  constructor(d: MissionDeps, private reports: ReportArchive, readonly step: EndingStep) { super(d, { section: 'summary', previous: [], compareId: null, line: 0 }); }
  protected onReady(m: MissionState): void {
    if (!m.crisis?.finalState) { this.go('/campagne/acte-5/alerte'); return; }
    if (this.srv && m.server && !m.server.bilan) { this.closing ??= this.closeOnServer(m); return; }
    const ending = m.server?.bilan ? ENDING_OF[m.server.bilan.fin] : m.ending ?? determineEnding(m); const total = this.total(m);
    sceneStore.set({ view: 'ending', mood: ending, orbit: m.launch?.orbit, addons: sceneAddons(m.config) });
    if (!m.ending) {
      void this.commit({ ...m, ending, score: total });
      this.record({ code: 'EVT-A6-001', trace: 'report_computed', data: { score: total, ending } });
      const sum: ReportSummary = { id: this.campaignId ?? 'local', at: new Date().toISOString(), ending, score: total, primary: m.profile.primary,
        categories: Object.fromEntries(this.lines(m).map((l) => [l.category, l.points])), maxima: Object.fromEntries(this.lines(m).map((l) => [l.category, l.max])),
        scale: m.server?.bilan ? 1000 : 100, source: m.server?.bilan ? 'serveur' : 'local', finalState: m.crisis?.finalState, launcher: m.launch?.launcherId, orbit: m.launch?.orbit.kind };
      void this.reports.add(sum).catch(() => undefined);
    }
    void this.reports.list().then((r) => this.setState({ previous: r.filter((x) => x.id !== this.campaignId) })).catch(() => undefined);
    if (this.step === 'ending') this.record({ code: 'EVT-A6-002', trace: 'ending_assigned', data: { ending } });
    if (this.step === 'final') this.record({ code: 'EVT-A6-003', trace: 'campaign_completed' });
  }
  /** Mode connecté : actes 5 et 6 côté serveur ; l'acte 6 clôture et renvoie le bilan C5 (sur 1000). */
  private closing?: Promise<void>;
  private async closeOnServer(m: MissionState) {
    try {
      await this.srv!.advanceTo(m.server!, 6);
      // Relecture : idempotent même si un autre appel a déjà clôturé la mission.
      const r = await this.srv!.readMission(m.server!.missionId) as unknown as { acte: number; bilan?: { scoreTotal: number; fin: 'A' | 'B' | 'C' | 'D'; scores: Record<string, number>; causes: ServerSnapshot['bilan'] extends infer B ? B extends { causes: infer C } ? C : never : never; recommandations: { pourquoi: { code: string; params: Record<string, unknown> }; piste: { code: string; params: Record<string, unknown> } }[] }; rapportJson?: string | null };
      if (!r.bilan) throw new Error('Le serveur n\u2019a pas renvoyé de bilan.');
      let missionsReelles: string[] | undefined;
      try { missionsReelles = r.rapportJson ? JSON.parse(r.rapportJson).missionsReellesComparables : undefined; } catch { /* rapport facultatif */ }
      const bilan = { scoreTotal: r.bilan.scoreTotal, fin: r.bilan.fin, scores: r.bilan.scores, causes: r.bilan.causes, recommandations: r.bilan.recommandations, missionsReelles };
      await this.commit({ ...this.m, server: { ...this.m.server!, act: r.acte, bilan } });
      this.onReady(this.m);
    } catch (e) { this.setState({ status: 'error', error: e instanceof Error ? e.message : 'Clôture impossible.' }); }
  }
  /** Lignes de score : bilan serveur (sur 1000, mode solo) ou aperçu local (sur 100). */
  lines = (m: MissionState = this.m): ScoreLine[] => {
    const b = m.server?.bilan; if (!b) return score(m);
    const why = b.causes.map((c) => messageFor(c.code, c.params));
    return CAT.map(([k, label, base]) => ({ category: label, points: Math.round(b.scores[k] ?? 0), max: Math.round((base * 1000) / 900), why: k === 'science' ? why.filter((w) => /cience|bjectif/.test(w)) : k === 'ressources' ? why.filter((w) => /udget|onnées/.test(w)) : k === 'fiabilite' ? why.filter((w) => /iabilit|isque/.test(w)) : why.filter((w) => /arge|ission/.test(w)) }));
  };
  total = (m: MissionState = this.m) => (m.server?.bilan ? Math.round(m.server.bilan.scoreTotal) : score(m).reduce((a, l) => a + l.points, 0));
  scale = () => (this.m.server?.bilan ? 1000 : 100);
  recommendations = () => (this.m.server?.bilan?.recommandations ?? []).map((r) => `${messageFor(r.pourquoi.code, r.pourquoi.params)} → ${messageFor(r.piste.code, r.piste.params)}`);
  achievement = (o: ObjectiveId): number => {
    const e = this.m.server?.etat; if (!e) return objectiveAchievement(this.m.ops.byInstrument, o);
    const id = OBJECTIVE_IDS[o]; const max = e.maxParObjectif[id] ?? 0; return max ? Math.min(1, (e.parObjectif[id] ?? 0) / max) : 0;
  };
  setSection = (section: string) => this.setState({ section });
  setCompare = (id: string | null) => this.setState({ compareId: id });
  nextLine = () => this.setState({ line: this.getState().line + 1 });
  toEnding = () => void this.goTo('/campagne/acte-6/fin');
  toFinal = () => void this.goTo('/campagne/acte-6/final');
  /** Rejouer depuis un point de reprise : l'état sauvegardé remplace l'état courant (rapport actuel déjà archivé). */
  replay = async (id: string) => {
    const cp = this.m.checkpoints.find((c) => c.id === id); if (!cp) return;
    const route = id === 'pre-launch' ? '/campagne/acte-3/revue' : '/campagne/acte-2/atelier';
    const next = { ...cp.snapshot, reached: ROUTES.indexOf(route), checkpoints: this.m.checkpoints } as MissionState;
    if (await this.commit(next)) this.go(route);
  };
}
