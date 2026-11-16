import { t } from '../../i18n';
import { Store } from '../../core/Store';
import type { GameMode } from '../../domain/campaign';
import { RepositoryError, type CampaignRepository, type Navigator } from '../../domain/ports';

export interface ModeState { selected: GameMode | null; submitting: boolean; error?: string; }

/** « Confirmer » : un mode doit être choisi ; pas de double validation pendant la création. */
export function confirmAvailability(s: ModeState): { enabled: boolean; reason?: string } {
  if (s.submitting) return { enabled: false, reason: t('Création de la campagne…') };
  if (!s.selected) return { enabled: false, reason: t('Choisissez un mode pour continuer.') };
  return { enabled: true };
}

export class ModeSelectionViewModel extends Store<ModeState> {
  constructor(private repo: CampaignRepository, private nav: Navigator) {
    super({ selected: null, submitting: false });
  }
  select = (mode: GameMode): void => {
    if (!this.getState().submitting) this.setState({ selected: mode, error: undefined });
  };
  back = (): void => this.nav.go('/');
  confirm = async (): Promise<void> => {
    const { selected, submitting } = this.getState();
    if (!selected || submitting) return;
    this.setState({ submitting: true, error: undefined });
    try {
      await this.repo.create(selected); // écrit CampaignState.mode côté backend
      this.nav.go('/campagne/recrue'); // la recrue se crée avant le prologue
    } catch (e) {
      this.setState({ submitting: false, error: e instanceof RepositoryError ? e.message : 'Erreur inattendue' });
    }
  };
}
