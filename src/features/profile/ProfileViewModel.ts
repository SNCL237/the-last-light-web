import { t } from '../../i18n';
import { Store } from '../../core/Store';
import { RepositoryError, type CampaignRepository, type EventRecorder, type Navigator, type ProfileCatalogRepository, type ScientificProfileRepository } from '../../domain/ports';
import { estimate, MAX_SECONDARIES, relevantInstruments, type EliasDecision, type Estimate, type InstrumentId, type ObjectiveId, type ProfileCatalog } from '../../domain/profile';

export type ProfileStep = 'briefing' | 'debate' | 'selection' | 'elias' | 'confirm';
export const STEPS: ProfileStep[] = ['briefing', 'debate', 'selection', 'elias', 'confirm'];
export const STEP_LABELS: Record<ProfileStep, string> = {
  briefing: 'Briefing polaire', debate: 'Débat', selection: 'Objectifs', elias: 'Instrument d’Elias', confirm: 'Confirmation',
};

export interface ProfileState {
  status: 'loading' | 'ready' | 'error'; catalog?: ProfileCatalog; step: ProfileStep;
  primary: ObjectiveId | null; secondaries: ObjectiveId[]; noSecondaryByChoice: boolean;
  elias: EliasDecision | null; submitting: boolean; error?: string;
}
type Avail = { enabled: boolean; reason?: string };

export const objectivesOf = (s: ProfileState): ObjectiveId[] => (s.primary ? [s.primary, ...s.secondaries] : []);
export const instrumentsOf = (s: ProfileState): InstrumentId[] => (s.catalog ? relevantInstruments(s.catalog, objectivesOf(s), s.elias) : []);
export const estimateOf = (s: ProfileState): Estimate | null => (s.catalog ? estimate(s.catalog, instrumentsOf(s)) : null);
/** Aperçu « avec / sans » le radar d'Elias, pour le ConsequencePanel. */
export function eliasDelta(s: ProfileState): { without: Estimate; with: Estimate } | null {
  if (!s.catalog) return null;
  const objs = objectivesOf(s);
  return { without: estimate(s.catalog, relevantInstruments(s.catalog, objs, 'drop')), with: estimate(s.catalog, relevantInstruments(s.catalog, objs, 'keep')) };
}

/** Raison de blocage de l'étape courante (TC-004 : objectif principal obligatoire). */
export function nextAvailability(s: ProfileState): Avail {
  if (s.submitting) return { enabled: false, reason: 'Enregistrement…' };
  if (s.step === 'selection') {
    if (!s.primary) return { enabled: false, reason: t('Choix incomplet : sélectionnez un objectif principal.') };
    if (s.secondaries.length === 0 && !s.noSecondaryByChoice) return { enabled: false, reason: t('Ajoutez 1 ou 2 objectifs secondaires, ou indiquez que vous n’en retenez aucun.') };
  }
  if (s.step === 'elias' && !s.elias) return { enabled: false, reason: t('Décidez : conserver, écarter ou reporter l’instrument.') };
  if (s.step === 'confirm' && (!s.primary || !s.elias)) return { enabled: false, reason: t('Profil incomplet : revenez aux étapes précédentes.') };
  return { enabled: true };
}

export class ProfileViewModel extends Store<ProfileState> {
  private started = false;
  private campaignId?: string;

  constructor(private catalogs: ProfileCatalogRepository, private profiles: ScientificProfileRepository,
              private campaigns: CampaignRepository, private events: EventRecorder, private nav: Navigator,
              private now: () => Date = () => new Date()) {
    super({ status: 'loading', step: 'briefing', primary: null, secondaries: [], noSecondaryByChoice: false, elias: null, submitting: false });
  }

  init = async (): Promise<void> => {
    if (this.started) return; this.started = true;
    try {
      const catalog = await this.catalogs.getCatalog();
      this.campaignId = (await this.campaigns.getLatest().catch(() => null))?.id;
      this.setState({ status: 'ready', catalog });
    } catch { this.setState({ status: 'error', error: t('Impossible de charger le profil scientifique.') }); }
  };
  retry = (): Promise<void> => { this.started = false; this.setState({ status: 'loading', error: undefined }); return this.init(); };

  /** On ne saute pas d'étape vers l'avant : seules les étapes déjà atteignables sont accessibles. */
  canGoTo = (step: ProfileStep): boolean => {
    const s = this.getState(); const target = STEPS.indexOf(step);
    for (let i = 0; i < target; i++) if (!nextAvailability({ ...s, step: STEPS[i], submitting: false }).enabled) return false;
    return true;
  };
  goTo = (step: ProfileStep): void => { if (!this.getState().submitting && this.canGoTo(step)) this.setState({ step, error: undefined }); };
  back = (): void => { const i = STEPS.indexOf(this.getState().step); if (i > 0) this.goTo(STEPS[i - 1]); };
  next = (): void => {
    const s = this.getState();
    if (!nextAvailability(s).enabled) return;
    if (s.step === 'confirm') { void this.confirm(); return; }
    this.setState({ step: STEPS[STEPS.indexOf(s.step) + 1] });
  };

  setPrimary = (id: ObjectiveId): void => {
    if (this.getState().submitting) return;
    this.setState({ primary: id, secondaries: this.getState().secondaries.filter((x) => x !== id), error: undefined });
  };
  toggleSecondary = (id: ObjectiveId): void => {
    const s = this.getState();
    if (s.submitting || id === s.primary) return;
    if (s.secondaries.includes(id)) { this.setState({ secondaries: s.secondaries.filter((x) => x !== id) }); return; }
    if (s.secondaries.length >= MAX_SECONDARIES) return;
    this.setState({ secondaries: [...s.secondaries, id], noSecondaryByChoice: false });
  };
  setNoSecondary = (on: boolean): void => {
    if (this.getState().submitting) return;
    this.setState(on ? { noSecondaryByChoice: true, secondaries: [] } : { noSecondaryByChoice: false });
  };
  secondaryAvailability = (id: ObjectiveId): Avail => {
    const s = this.getState();
    if (id === s.primary) return { enabled: false, reason: t('Déjà objectif principal.') };
    if (!s.secondaries.includes(id) && s.secondaries.length >= MAX_SECONDARIES) return { enabled: false, reason: `Maximum ${MAX_SECONDARIES} objectifs secondaires.` };
    return { enabled: true };
  };
  decideElias = (d: EliasDecision): void => { if (!this.getState().submitting) this.setState({ elias: d, error: undefined }); };

  private async confirm(): Promise<void> {
    const s = this.getState();
    if (s.submitting || !s.primary || !s.elias) return;
    this.setState({ submitting: true, error: undefined });
    const profile = { primary: s.primary, secondaries: s.secondaries, noSecondaryByChoice: s.noSecondaryByChoice,
      elias: s.elias, instruments: instrumentsOf(s), confirmedAt: this.now() };
    try {
      if (this.campaignId) {
        await this.profiles.save(this.campaignId, profile);
        const at = profile.confirmedAt;
        // Ordre du catalogue : décision d'Elias puis profil confirmé. Best-effort.
        void this.events.record(this.campaignId, { code: 'EVT-A1-002', trace: 'elias_instrument', data: { decision: s.elias }, at })
          .catch(() => undefined)
          .then(() => this.events.record(this.campaignId as string, { code: 'EVT-A1-001', trace: 'scientific_profile', data: { primary: profile.primary, secondaries: profile.secondaries, instruments: profile.instruments }, at }))
          .catch(() => undefined);
      }
      this.nav.go('/campagne/acte-2/atelier');
    } catch (e) {
      this.setState({ submitting: false, error: e instanceof RepositoryError ? e.message : 'Erreur inattendue' });
    }
  }
}
