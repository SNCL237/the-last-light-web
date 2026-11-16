import { t } from '../../i18n';
import { Store } from '../../core/Store';
import type { ReportArchive, ReportSummary } from '../../domain/ports';
import { OBJECTIVE_OF, type ServerGateway } from '../../data/backend/ServerGateway';

export type SortKey = 'date' | 'score' | 'ending';
export interface ReportsState { status: 'loading' | 'ready' | 'error'; reports: ReportSummary[]; sort: SortKey; selected: string | null; compare: string[]; error?: string; serverNote?: string }

const ENDING_OF: Record<string, string> = { A: 'legacy', B: 'fragment', C: 'last_signal', D: 'silence' };
const LOCAL_MAX: Record<string, number> = { Science: 35, Technique: 20, Données: 20, Ressources: 10, Décisions: 15 };
const SERVER_CATS: [string, string, number][] = [['science', 'Science', 333], ['technique', 'Technique', 278], ['ressources', 'Ressources', 222], ['fiabilite', 'Fiabilité', 167]];
/** Score en pourcentage de l'échelle du rapport (les échelles 100 et 1000 restent comparables). */
export const pct = (r: ReportSummary) => r.score / (r.scale ?? 100);
export const maxOf = (r: ReportSummary, cat: string) => r.maxima?.[cat] ?? LOCAL_MAX[cat] ?? (r.scale === 1000 ? SERVER_CATS.find((c) => c[1] === cat)?.[2] : undefined) ?? 1;

/** P03 : rapports archivés dans ce navigateur, complétés par les bilans du serveur en mode connecté. */
export class ReportsViewModel extends Store<ReportsState> {
  constructor(private archive: ReportArchive, private server?: ServerGateway) { super({ status: 'loading', reports: [], sort: 'date', selected: null, compare: [] }); }
  init = async () => {
    try {
      const local = (await this.archive.list()).map((r) => ({ ...r, source: r.source ?? 'local' } as ReportSummary));
      let merged = local; let serverNote: string | undefined;
      if (this.server) {
        try {
          const closed = await this.server.listClosed();
          const fromServer: ReportSummary[] = closed.map((m) => { const known = local.find((r) => r.id === m.id);
            return { ...(known ?? { at: '', primary: m.principal ? OBJECTIVE_OF[m.principal] ?? 'ice' : 'ice' }), id: m.id, score: Math.round(m.scoreTotal), scale: 1000, source: 'serveur', ending: ENDING_OF[m.fin] ?? 'silence',
              categories: Object.fromEntries(SERVER_CATS.map(([k, l]) => [l, Math.round(m.scores[k] ?? 0)])), maxima: Object.fromEntries(SERVER_CATS.map(([, l, mx]) => [l, mx])) } as ReportSummary; });
          merged = [...fromServer, ...local.filter((r) => !fromServer.some((s) => s.id === r.id))];
        } catch { serverNote = t('Serveur injoignable : seuls les rapports de ce navigateur sont affichés.'); }
      }
      this.setState({ status: 'ready', reports: merged, serverNote, selected: merged[0]?.id ?? null });
    } catch { this.setState({ status: 'error', error: t('Impossible de lire les rapports.') }); }
  };
  sorted = (): ReportSummary[] => {
    const { reports, sort } = this.getState();
    return [...reports].sort((a, b) => sort === 'score' ? pct(b) - pct(a) : sort === 'ending' ? a.ending.localeCompare(b.ending) : (b.at || '').localeCompare(a.at || ''));
  };
  setSort = (sort: SortKey) => this.setState({ sort });
  select = (id: string) => this.setState({ selected: id });
  toggleCompare = (id: string) => { const c = this.getState().compare; this.setState({ compare: c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-2) }); };
  get(id: string | null) { return this.getState().reports.find((r) => r.id === id); }
}
