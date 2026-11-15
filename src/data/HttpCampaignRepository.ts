import type { Act, CampaignSummary, GameMode } from '../domain/campaign';
import { RepositoryError, type CampaignRepository } from '../domain/ports';

/** Forme supposée de la réponse : à aligner avec les contrats du backend (@smdg/contracts). */
interface CampaignDto { id: string; current_act: number; mode: string; updated_at: string; }

const MODES: GameMode[] = ['guided', 'standard', 'expert'];

export function toDomain(dto: CampaignDto): CampaignSummary {
  const act = dto.current_act;
  const updatedAt = new Date(dto.updated_at);
  if (!dto.id || !Number.isInteger(act) || act < 0 || act > 6 || !MODES.includes(dto.mode as GameMode) || isNaN(+updatedAt)) {
    throw new RepositoryError('Réponse du serveur invalide');
  }
  return { id: dto.id, currentAct: act as Act, mode: dto.mode as GameMode, updatedAt };
}

export class HttpCampaignRepository implements CampaignRepository {
  constructor(
    private baseUrl: string,
    private fetchFn: typeof fetch = (...a) => fetch(...a),
    private timeoutMs = 8000,
  ) {}

  async getLatest(): Promise<CampaignSummary | null> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await this.fetchFn(`${this.baseUrl}/campaigns/latest`, {
        signal: ctrl.signal, headers: { Accept: 'application/json' }, credentials: 'include',
      });
      if (res.status === 404 || res.status === 204) return null;
      if (!res.ok) throw new RepositoryError(`Serveur indisponible (HTTP ${res.status})`);
      return toDomain((await res.json()) as CampaignDto);
    } catch (e) {
      if (e instanceof RepositoryError) throw e;
      throw new RepositoryError('Connexion au serveur impossible', e);
    } finally {
      clearTimeout(timer);
    }
  }

  async create(mode: GameMode): Promise<CampaignSummary> {
    try {
      const res = await this.fetchFn(`${this.baseUrl}/campaigns`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) throw new RepositoryError(`Création impossible (HTTP ${res.status})`);
      return toDomain((await res.json()) as CampaignDto);
    } catch (e) {
      if (e instanceof RepositoryError) throw e;
      throw new RepositoryError('Connexion au serveur impossible', e);
    }
  }
}
