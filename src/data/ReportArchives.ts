import { RepositoryError, type ReportArchive, type ReportSummary } from '../domain/ports';
export class LocalReportArchive implements ReportArchive {
  async list(): Promise<ReportSummary[]> { try { return JSON.parse(localStorage.getItem('tll.reports') ?? '[]'); } catch { return []; } }
  async add(r: ReportSummary): Promise<void> { const all = (await this.list()).filter((x) => x.id !== r.id); try { localStorage.setItem('tll.reports', JSON.stringify([...all, r].slice(-20))); } catch (e) { throw new RepositoryError('Archive locale impossible', e); } }
}
export class HttpReportArchive implements ReportArchive {
  constructor(private baseUrl: string) {}
  async list(): Promise<ReportSummary[]> { const r = await fetch(`${this.baseUrl}/reports`, { credentials: 'include' }); return r.ok ? r.json() : []; }
  async add(rep: ReportSummary): Promise<void> { const r = await fetch(`${this.baseUrl}/reports`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rep) }); if (!r.ok) throw new RepositoryError(`Rapport non archivé (HTTP ${r.status})`); }
}
