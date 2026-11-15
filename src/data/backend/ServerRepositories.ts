import type { CampaignSummary, GameMode } from '../../domain/campaign';
import type { ServerSnapshot } from '../../domain/mission';
import type { CampaignRepository, ScientificProfileRepository } from '../../domain/ports';
import type { ScientificProfile } from '../../domain/profile';
import { LocalScientificProfileRepository } from '../ScientificProfileRepositories';
import type { ServerGateway } from './ServerGateway';

const PTR = 'tll.server.current';
interface Pointer { snapshot: ServerSnapshot; mode: GameMode; createdAt: string }
export function readPointer(): Pointer | null { try { const r = localStorage.getItem(PTR); return r ? JSON.parse(r) as Pointer : null; } catch { return null; } }
function writePointer(p: Pointer) { try { localStorage.setItem(PTR, JSON.stringify(p)); } catch { /* */ } }

/** Campagne = mission du serveur. L'identifiant de campagne du frontend EST l'identifiant de mission. */
export class ServerCampaignRepository implements CampaignRepository {
  constructor(private gw: ServerGateway) {}
  async getLatest(): Promise<CampaignSummary | null> {
    const p = readPointer(); if (!p) return null;
    try {
      const m = await this.gw.readMission(p.snapshot.missionId);
      return { id: m.id, currentAct: Math.max(1, Math.min(6, m.acte)) as CampaignSummary['currentAct'], mode: p.mode, updatedAt: new Date(p.createdAt) };
    } catch { return null; } // mission absente du serveur (base réinitialisée, autre compte invité)
  }
  async create(mode: GameMode): Promise<CampaignSummary> {
    const snapshot = await this.gw.createMission();
    writePointer({ snapshot, mode, createdAt: new Date().toISOString() });
    return { id: snapshot.missionId, currentAct: 0, mode, updatedAt: new Date() };
  }
}

/** Profil (P08) : objectifs envoyés au serveur ; décision d'Elias conservée localement (pas d'équivalent serveur). */
export class ServerScientificProfileRepository implements ScientificProfileRepository {
  private local = new LocalScientificProfileRepository();
  constructor(private gw: ServerGateway) {}
  async save(campaignId: string, p: ScientificProfile): Promise<void> {
    const ptr = readPointer(); if (!ptr || ptr.snapshot.missionId !== campaignId) throw new Error('Mission serveur introuvable.');
    const report = await this.gw.setObjectives(ptr.snapshot, p.primary, p.secondaries);
    writePointer({ ...ptr, snapshot: { ...ptr.snapshot, report } });
    await this.local.save(campaignId, p);
  }
  load(campaignId: string) { return this.local.load(campaignId); }
}
