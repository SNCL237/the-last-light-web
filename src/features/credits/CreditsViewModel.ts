import { Store } from '../../core/Store';
import { CREDITED_STATUSES, isInternal, manifestIssues, type AssetEntry } from '../../domain/assets';
import { RepositoryError, type AssetManifestRepository, type Navigator } from '../../domain/ports';

export interface CreditsState {
  status: 'loading' | 'ready' | 'error';
  entries: AssetEntry[];
  issues: string[];       // renseigné uniquement en développement
  error?: string;
}
export const creditedEntries = (s: CreditsState): AssetEntry[] => s.entries.filter((e) => CREDITED_STATUSES.includes(e.status));
/** Sources externes distinctes parmi les visuels crédités. */
export function sourcesOf(s: CreditsState): { name: string; url?: string }[] {
  const m = new Map<string, { name: string; url?: string }>();
  creditedEntries(s).filter((e) => !isInternal(e)).forEach((e) => m.set(e.source.name, e.source));
  return [...m.values()];
}

export class CreditsViewModel extends Store<CreditsState> {
  private started = false;
  constructor(private repo: AssetManifestRepository, private nav: Navigator, private dev = false) {
    super({ status: 'loading', entries: [], issues: [] });
  }
  init = async (): Promise<void> => { if (this.started) return; this.started = true; await this.load(); };
  retry = (): Promise<void> => this.load();
  back = (): void => this.nav.go('/');
  private load = async (): Promise<void> => {
    this.setState({ status: 'loading', error: undefined });
    try {
      const entries = await this.repo.getAll();
      this.setState({ status: 'ready', entries, issues: this.dev ? manifestIssues(entries) : [] });
    } catch (e) {
      this.setState({ status: 'error', error: e instanceof RepositoryError ? e.message : 'Impossible de charger les crédits.' });
    }
  };
}
