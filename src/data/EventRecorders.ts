import type { GameEvent } from '../domain/narrative';
import { RepositoryError, type EventRecorder } from '../domain/ports';

type Rec = GameEvent & { at: Date };

export class HttpEventRecorder implements EventRecorder {
  constructor(private baseUrl: string, private fetchFn: typeof fetch = (...a) => fetch(...a)) {}
  async record(campaignId: string, e: Rec): Promise<void> {
    const res = await this.fetchFn(`${this.baseUrl}/campaigns/${encodeURIComponent(campaignId)}/events`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: e.code, trace: e.trace, data: e.data, occurred_at: e.at.toISOString() }),
    });
    if (!res.ok) throw new RepositoryError(`Événement non enregistré (HTTP ${res.status})`);
  }
}
export class LocalEventRecorder implements EventRecorder {
  async record(campaignId: string, e: Rec): Promise<void> {
    const key = 'tll.events';
    const all = JSON.parse(localStorage.getItem(key) ?? '[]');
    all.push({ campaignId, code: e.code, trace: e.trace, data: e.data, at: e.at.toISOString() });
    localStorage.setItem(key, JSON.stringify(all));
  }
}
