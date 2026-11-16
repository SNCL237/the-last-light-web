import { useEffect, useRef } from 'react';
import { useViewModel } from '../../core/useViewModel';
import { ACT_LABELS, MODE_LABELS } from '../../domain/campaign';
import { MenuViewModel, continueAvailability } from './MenuViewModel';
import { t, locale } from '../../i18n';

const fmt = { format: (d: Date | number) => new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(d) };

/** View : aucune logique métier, uniquement l'affichage de l'état et la délégation des actions. */
export function MenuView({ vm }: { vm: MenuViewModel }) {
  const s = useViewModel(vm);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { void vm.init(); }, [vm]);
  useEffect(() => { if (s.confirmNew) cancelRef.current?.focus(); }, [s.confirmNew]);
  const cont = continueAvailability(s);

  return (
    <main className="screen">
      <div className="scene" aria-hidden="true" data-render-mode={s.renderMode} />
      <header className="brand">{t("THE LAST LIGHT")}</header>

      <section className="panel menu" aria-labelledby="menu-title">
        <h1 id="menu-title" className="panel-title">{t("Menu principal")}</h1>
        {s.status === 'loading' ? (
          <p role="status" className="hint">{t("Chargement…")}</p>
        ) : (
          <>
            {s.error && (
              <div role="alert" className="alert">
                <span>⚠ {t(s.error)}</span>
                <button className="btn btn--small" onClick={vm.retry}>{t("Réessayer")}</button>
              </div>
            )}
            <button className="btn btn--primary" onClick={vm.newMission}>{t("Nouvelle mission")}</button>
            <button className="btn" aria-disabled={!cont.enabled} aria-describedby="cont-info"
              onClick={cont.enabled ? vm.continueCampaign : undefined}>{t("Continuer")}</button>
            <p id="cont-info" className="hint">
              {s.save
                ? `${t(ACT_LABELS[s.save.currentAct])} · ${t(MODE_LABELS[s.save.mode])} · ${fmt.format(s.save.updatedAt)}`
                : cont.reason}
            </p>
            <button className="btn" onClick={() => vm.open('/rapports')}>{t("Rapports & comparaison")}</button>
            <button className="btn" onClick={() => vm.open('/options')}>{t("Options")}</button>
            <button className="btn" onClick={() => vm.open('/credits')}>{t("Crédits")}</button>
          </>
        )}
      </section>
      <footer className="foot">{t("Rendu :")} {s.renderMode === '2d' ? t('2D (repli)') : s.renderMode === '3d' ? '3D' : t('3D allégé')}</footer>

      {s.confirmNew && (
        <div className="veil">
          <div className="panel dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title"
            onKeyDown={(e) => e.key === 'Escape' && vm.cancelNewMission()}>
            <h2 id="dlg-title" className="panel-title">{t("Nouvelle campagne")}</h2>
            <p>{t("Une campagne est en cours. En lancer une nouvelle peut remplacer votre sauvegarde actuelle.")}</p>
            <div className="row">
              <button ref={cancelRef} className="btn" onClick={vm.cancelNewMission}>{t("Annuler")}</button>
              <button className="btn btn--primary" onClick={vm.confirmNewMission}>{t("Continuer quand même")}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
