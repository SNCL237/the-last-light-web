import type { MissionState } from '../domain/mission';
import { RepositoryError, type MissionRepository } from '../domain/ports';

export class LocalMissionRepository implements MissionRepository {
  async load(id: string): Promise<MissionState | null> {
    try { const raw = localStorage.getItem(`tll.mission.${id}`); return raw ? JSON.parse(raw) as MissionState : null; } catch { return null; }
  }
  async save(id: string, s: MissionState): Promise<void> {
    try { localStorage.setItem(`tll.mission.${id}`, JSON.stringify(s)); } catch (e) { throw new RepositoryError('Sauvegarde locale impossible', e); }
  }
}
/** Contrat supposé : GET/PUT {API}/campaigns/{id}/mission (état complet). Les endpoints fins du plan (§8) le remplaceront. */
export class HttpMissionRepository implements MissionRepository {
  constructor(private baseUrl: string, private fetchFn: typeof fetch = (...a) => fetch(...a)) {}
  private url = (id: string) => `${this.baseUrl}/campaigns/${encodeURIComponent(id)}/mission`;
  async load(id: string): Promise<MissionState | null> {
    let res: Response;
    try { res = await this.fetchFn(this.url(id), { credentials: 'include' }); } catch (e) { throw new RepositoryError('Connexion au serveur impossible', e); }
    if (res.status === 404 || res.status === 204) return null;
    if (!res.ok) throw new RepositoryError(`État de mission illisible (HTTP ${res.status})`);
    return await res.json() as MissionState;
  }
  async save(id: string, s: MissionState): Promise<void> {
    let res: Response;
    try { res = await this.fetchFn(this.url(id), { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) }); }
    catch (e) { throw new RepositoryError('Connexion au serveur impossible', e); }
    if (!res.ok) throw new RepositoryError(`Sauvegarde refusée (HTTP ${res.status})`);
  }
}
