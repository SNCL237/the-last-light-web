import { RepositoryError, type ScientificProfileRepository } from '../domain/ports';
import type { ScientificProfile } from '../domain/profile';

type Dto = ReturnType<typeof toDto>;
const fromDto = (d: Dto) => ({ primary: d.primary_objective, secondaries: d.secondary_objectives, elias: d.elias_instrument });
const toDto = (p: ScientificProfile) => ({
  primary_objective: p.primary, secondary_objectives: p.secondaries, no_secondary_by_choice: p.noSecondaryByChoice,
  elias_instrument: p.elias, instruments: p.instruments, confirmed_at: p.confirmedAt.toISOString(),
});

/** Contrat supposé : PUT {API}/campaigns/{id}/profile — à aligner avec le backend (ne modifier que toDto). */
export class HttpScientificProfileRepository implements ScientificProfileRepository {
  constructor(private baseUrl: string, private fetchFn: typeof fetch = (...a) => fetch(...a)) {}
  async save(campaignId: string, p: ScientificProfile): Promise<void> {
    let res: Response;
    try {
      res = await this.fetchFn(`${this.baseUrl}/campaigns/${encodeURIComponent(campaignId)}/profile`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toDto(p)),
      });
    } catch (e) { throw new RepositoryError('Connexion au serveur impossible', e); }
    if (!res.ok) throw new RepositoryError(`Profil non enregistré (HTTP ${res.status})`);
  }
  async load(campaignId: string) {
    let res: Response;
    try { res = await this.fetchFn(`${this.baseUrl}/campaigns/${encodeURIComponent(campaignId)}/profile`, { credentials: 'include' }); }
    catch (e) { throw new RepositoryError('Connexion au serveur impossible', e); }
    if (res.status === 404) return null;
    if (!res.ok) throw new RepositoryError(`Profil illisible (HTTP ${res.status})`);
    return fromDto(await res.json());
  }
}
export class LocalScientificProfileRepository implements ScientificProfileRepository {
  async save(campaignId: string, p: ScientificProfile): Promise<void> {
    try { localStorage.setItem(`tll.profile.${campaignId}`, JSON.stringify(toDto(p))); }
    catch (e) { throw new RepositoryError('Sauvegarde locale impossible', e); }
  }
  async load(campaignId: string) {
    try { const raw = localStorage.getItem(`tll.profile.${campaignId}`); return raw ? fromDto(JSON.parse(raw)) : null; }
    catch { return null; }
  }
}
