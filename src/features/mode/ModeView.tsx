import { useViewModel } from '../../core/useViewModel';
import { MODE_INFO, type GameMode } from '../../domain/campaign';
import { ModeSelectionViewModel, confirmAvailability } from './ModeSelectionViewModel';
import { t } from '../../i18n';

const MODES: GameMode[] = ['guided', 'standard', 'expert'];

export function ModeView({ vm }: { vm: ModeSelectionViewModel }) {
  const s = useViewModel(vm);
  const ok = confirmAvailability(s);
  return (
    <main className="screen">
      <div className="scene" aria-hidden="true" />
      <header className="brand">{t("THE LAST LIGHT")}</header>
      <div>
        <h1 className="title">{t("Choix du mode")}</h1>
        <p className="hint">{t("Le mode règle le niveau d'aide, pas les règles de la simulation.")}</p>
      </div>
      <fieldset className="modes" disabled={s.submitting}>
        <legend className="sr">{t("Mode de jeu")}</legend>
        {MODES.map((m) => {
          const info = MODE_INFO[m];
          const on = s.selected === m;
          return (
            <label key={m} className="mode">
              <input type="radio" name="mode" className="sr" checked={on} onChange={() => vm.select(m)} />
              <div className={`panel mode-body${on ? ' is-on' : ''}`}>
                <h2 className="panel-title">{t(info.label)}{on ? t(' ✓ Sélectionné') : ''}</h2>
                <p>{t(info.summary)}</p>
                <ul>{info.changes.map((c) => <li key={c}>{t(c)}</li>)}</ul>
              </div>
            </label>
          );
        })}
      </fieldset>
      {s.error && <div role="alert" className="alert">⚠ {t(s.error)}</div>}
      <div className="actions">
        <button className="btn btn--small" onClick={vm.back} disabled={s.submitting}>{t("Retour")}</button>
        <button className="btn btn--primary btn--small" aria-disabled={!ok.enabled} aria-describedby="ok-reason"
          onClick={ok.enabled ? vm.confirm : undefined}>{t("Confirmer")}</button>
        <span id="ok-reason" role="status" className="hint">{t(ok.reason)}</span>
      </div>
    </main>
  );
}
