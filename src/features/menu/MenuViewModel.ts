import { t } from '../../i18n';
import { Store } from '../../core/Store';
import { type CampaignSummary, type RenderMode } from '../../domain/campaign';
import { RepositoryError, type CampaignRepository, type CapabilitiesProvider, type Navigator } from '../../domain/ports';

export interface MenuState {
  status: 'loading' | 'ready';
  save: CampaignSummary | null;
  renderMode: RenderMode;
  confirmNew: boolean; // modale « écraser la campagne ? »
  error?: string;
}

/** « Continuer » : disponible uniquement si une sauvegarde exploitable existe ; sinon, une raison. */
export function continueAvailability(s: MenuState): { enabled: boolean; reason?: string } {
  if (s.save) return { enabled: true };
  return { enabled: false, reason: s.error ? `${t('Sauvegarde indisponible :')} ${t(s.error)}` : t('Aucune sauvegarde exploitable.') };
}

export class MenuViewModel extends Store<MenuState> {
  private started = false;

  constructor(private repo: CampaignRepository, private caps: CapabilitiesProvider, private nav: Navigator) {
    super({ status: 'loading', save: null, renderMode: '3d', confirmNew: false });
  }

  init = async (): Promise<void> => { if (this.started) return; this.started = true; await this.load(); };
  retry = (): Promise<void> => this.load();

  private load = async (): Promise<void> => {
    this.setState({ status: 'loading', error: undefined, renderMode: this.caps.detect() });
    try {
      this.setState({ status: 'ready', save: await this.repo.getLatest() });
    } catch (e) {
      this.setState({ status: 'ready', save: null, error: e instanceof RepositoryError ? e.message : 'Erreur inattendue' });
    }
  };

  newMission = (): void => {
    if (this.getState().save) this.setState({ confirmNew: true });
    else this.nav.go('/mode');
  };
  confirmNewMission = (): void => { this.setState({ confirmNew: false }); this.nav.go('/mode'); };
  cancelNewMission = (): void => this.setState({ confirmNew: false });

  continueCampaign = (): void => {
    const save = this.getState().save;
    if (save) this.nav.go('/campagne/reprendre'); // reprise à l'écran sauvegardé (F-10)
  };
  open = (route: string): void => this.nav.go(route);
}
