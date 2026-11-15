import type { CampaignSummary, GameMode } from '../domain/campaign';
import { RepositoryError, type CampaignRepository } from '../domain/ports';

const KEY = 'tll.campaign.latest';

/** Adaptateur sans backend (démo, hors ligne, tests). */
export class LocalCampaignRepository implements CampaignRepository {
  constructor(seed?: CampaignSummary) {
    try { if (seed && !localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(seed)); } catch { /* stockage indisponible */ }
  }
  async getLatest(): Promise<CampaignSummary | null> {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      return { ...o, updatedAt: new Date(o.updatedAt) } as CampaignSummary;
    } catch { return null; }
  }
  async create(mode: GameMode): Promise<CampaignSummary> {
    const c: CampaignSummary = { id: crypto.randomUUID(), currentAct: 0, mode, updatedAt: new Date() };
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { throw new RepositoryError('Sauvegarde locale impossible'); }
    return c;
  }
}
