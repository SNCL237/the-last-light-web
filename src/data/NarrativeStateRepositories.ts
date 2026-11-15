import type { StanceId } from '../domain/briefing';
import { RepositoryError, type NarrativeStateRepository } from '../domain/ports';

export class HttpNarrativeStateRepository implements NarrativeStateRepository {
  constructor(private baseUrl: string, private fetchFn: typeof fetch = (...a) => fetch(...a)) {}
  async setInitialStance(campaignId: string, stance: StanceId | 'skipped'): Promise<void> {
    let res: Response;
    try {
      res = await this.fetchFn(`${this.baseUrl}/campaigns/${encodeURIComponent(campaignId)}/narrative/initial-stance`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stance }),
      });
    } catch (e) { throw new RepositoryError('Connexion au serveur impossible', e); }
    if (!res.ok) throw new RepositoryError(`Enregistrement impossible (HTTP ${res.status})`);
  }
}
export class LocalNarrativeStateRepository implements NarrativeStateRepository {
  async setInitialStance(campaignId: string, stance: StanceId | 'skipped'): Promise<void> {
    try { localStorage.setItem(`tll.narrative.${campaignId}.initial_stance`, stance); }
    catch (e) { throw new RepositoryError('Sauvegarde locale impossible', e); }
  }
}
