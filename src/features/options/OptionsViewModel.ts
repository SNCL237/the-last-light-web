import { t } from '../../i18n';
import { Store } from '../../core/Store';
import { clearLocalProgress, DEFAULT_PREFS, loadPrefs, savePrefs, type Prefs } from '../../domain/preferences';
import type { Navigator } from '../../domain/ports';

export interface OptionsState { prefs: Prefs; reloadNeeded: boolean; confirmClear: boolean; message?: string }

/** P04 : chaque réglage s'applique immédiatement ; seul le passage 2D ↔ 3D demande un rechargement. */
export class OptionsViewModel extends Store<OptionsState> {
  private initialRender: Prefs['render'];
  constructor(private nav: Navigator, readonly apiUrl?: string) { const p = loadPrefs(); super({ prefs: p, reloadNeeded: false, confirmClear: false }); this.initialRender = p.render; }
  set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    const prefs = { ...this.getState().prefs, [k]: v }; savePrefs(prefs);
    this.setState({ prefs, reloadNeeded: prefs.render !== this.initialRender, message: undefined });
  };
  reset = () => { savePrefs({ ...DEFAULT_PREFS }); this.setState({ prefs: { ...DEFAULT_PREFS }, reloadNeeded: DEFAULT_PREFS.render !== this.initialRender, message: t('Réglages par défaut rétablis.') }); };
  reload = () => location.reload();
  askClear = () => this.setState({ confirmClear: true });
  cancelClear = () => this.setState({ confirmClear: false });
  /** Efface la progression enregistrée dans ce navigateur (les préférences sont conservées). */
  clear = () => { clearLocalProgress(); this.setState({ confirmClear: false, message: t('Progression locale effacée. Une nouvelle mission repartira de zéro.') }); };
  /** Mode connecté : abandonne le jeton invité ; une nouvelle session serveur sera créée. */
  newSession = () => { try { localStorage.removeItem('tll.api.token'); localStorage.removeItem('tll.server.current'); } catch { /* */ } this.setState({ message: t('Nouvelle session invitée au prochain appel au serveur.') }); };
  back = () => this.nav.go('/');
}
