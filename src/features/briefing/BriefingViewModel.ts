import { Store } from '../../core/Store';
import type { BriefingContent, BriefingTab, Posture, StanceId } from '../../domain/briefing';
import { RepositoryError, type BriefingRepository, type CampaignRepository, type EventRecorder, type Navigator, type NarrativeStateRepository } from '../../domain/ports';

export interface BriefingState {
  status: 'loading' | 'ready' | 'error';
  content?: BriefingContent; tab: BriefingTab; stance: StanceId | null;
  asked: boolean; submitting: boolean; error?: string;
}
export const selectedPosture = (s: BriefingState): Posture | undefined => s.content?.postures.find((p) => p.id === s.stance);

/** Continuer : posture choisie ; sinon « Passer sans choisir » (explicite). Pas de double validation. */
export function continueAvailability(s: BriefingState): { enabled: boolean; reason?: string } {
  if (s.submitting) return { enabled: false, reason: 'Enregistrement…' };
  if (!s.stance) return { enabled: false, reason: 'Choisissez une posture, ou passez explicitement cette étape.' };
  return { enabled: true };
}

export class BriefingViewModel extends Store<BriefingState> {
  private started = false;
  private campaignId?: string;

  constructor(private briefing: BriefingRepository, private narrative: NarrativeStateRepository,
              private campaigns: CampaignRepository, private events: EventRecorder, private nav: Navigator) {
    super({ status: 'loading', tab: 'context', stance: null, asked: false, submitting: false });
  }

  init = async (): Promise<void> => {
    if (this.started) return; this.started = true;
    try {
      const content = await this.briefing.getBriefing();
      this.campaignId = (await this.campaigns.getLatest().catch(() => null))?.id;
      this.setState({ status: 'ready', content });
    } catch { this.setState({ status: 'error', error: 'Impossible de charger le briefing.' }); }
  };
  retry = (): Promise<void> => { this.started = false; this.setState({ status: 'loading', error: undefined }); return this.init(); };

  selectTab = (tab: BriefingTab): void => this.setState({ tab });
  chooseStance = (stance: StanceId): void => { if (!this.getState().submitting) this.setState({ stance, asked: false, error: undefined }); };
  askQuestion = (): void => { if (this.getState().stance) this.setState({ asked: true }); };
  continueToAct1 = (): Promise<void> => this.proceed(false);
  skip = (): Promise<void> => this.proceed(true);

  private async proceed(skip: boolean): Promise<void> {
    const s = this.getState();
    if (s.submitting || (!skip && !s.stance)) return;
    const value: StanceId | 'skipped' = skip ? 'skipped' : (s.stance as StanceId);
    this.setState({ submitting: true, error: undefined });
    try {
      if (this.campaignId) {
        await this.narrative.setInitialStance(this.campaignId, value);
        this.events.record(this.campaignId, { code: 'EVT-PRO-003', trace: 'initial_stance', data: { stance: value }, at: new Date() }).catch(() => { /* best-effort */ });
      }
      this.nav.go('/campagne/acte-1/profil');
    } catch (e) {
      this.setState({ submitting: false, error: e instanceof RepositoryError ? e.message : 'Erreur inattendue' });
    }
  }
}
