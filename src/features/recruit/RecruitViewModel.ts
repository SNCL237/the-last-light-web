import { t } from '../../i18n';
import { Store } from '../../core/Store';
import type { CampaignRepository, MissionRepository, Navigator } from '../../domain/ports';
import { lastRecruit, loadRecruit, nameError, saveRecruit, type EmblemId, type RoleId } from '../../domain/recruit';

export interface RecruitState { status: 'loading' | 'ready' | 'error'; name: string; role: RoleId | null; emblem: EmblemId; editing: boolean; roleLocked: boolean; touched: boolean; error?: string; saving: boolean }

/** Création (ou modification) de la recrue. Le rôle se fige au lancement : il a déjà orienté la conception. */
export class RecruitViewModel extends Store<RecruitState> {
  private campaignId?: string;
  constructor(private campaigns: CampaignRepository, private missions: MissionRepository, private nav: Navigator, private returnTo?: string) {
    super({ status: 'loading', name: '', role: null, emblem: 'crescent', editing: false, roleLocked: false, touched: false, saving: false });
  }
  init = async () => {
    try {
      const c = await this.campaigns.getLatest(); if (!c) { this.nav.go('/'); return; }
      this.campaignId = c.id; const existing = loadRecruit(c.id); const prev = existing ?? lastRecruit();
      const m = await this.missions.load(c.id).catch(() => null);
      this.setState({ status: 'ready', name: prev?.name ?? '', role: existing?.role ?? null, emblem: prev?.emblem ?? 'crescent', editing: !!existing, roleLocked: !!m?.launch?.launchedAt });
    } catch { this.setState({ status: 'error', error: t('Impossible de charger la campagne.') }); }
  };
  setName = (name: string) => this.setState({ name: name.slice(0, 32), touched: true });
  setRole = (role: RoleId) => { if (!this.getState().roleLocked) this.setState({ role }); };
  setEmblem = (emblem: EmblemId) => this.setState({ emblem });
  get nameIssue() { const s = this.getState(); return s.touched || s.name ? nameError(s.name) : null; }
  availability(): { ok: boolean; reason?: string } {
    const s = this.getState();
    if (s.saving) return { ok: false, reason: 'Enregistrement…' };
    const n = nameError(s.name); if (n) return { ok: false, reason: `${t('Indicatif :')} ${t(n)}` };
    if (!s.role) return { ok: false, reason: t('Choisissez votre rôle dans l’équipe.') };
    return { ok: true };
  }
  confirm = () => {
    const s = this.getState(); if (!this.availability().ok || !this.campaignId || !s.role) { this.setState({ touched: true }); return; }
    this.setState({ saving: true });
    saveRecruit(this.campaignId, { name: s.name.trim(), role: s.role, emblem: s.emblem, createdAt: new Date().toISOString() });
    this.nav.go(this.returnTo ?? '/campagne/prologue');
  };
  cancel = () => this.nav.go(this.returnTo ?? '/');
}
