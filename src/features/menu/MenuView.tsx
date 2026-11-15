import { useEffect, useRef } from 'react';
import { useViewModel } from '../../core/useViewModel';
import { ACT_LABELS, MODE_LABELS } from '../../domain/campaign';
import { MenuViewModel, continueAvailability } from './MenuViewModel';

const fmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

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
      <header className="brand">THE LAST LIGHT</header>

      <section className="panel menu" aria-labelledby="menu-title">
        <h1 id="menu-title" className="panel-title">Menu principal</h1>
        {s.status === 'loading' ? (
          <p role="status" className="hint">Chargement…</p>
        ) : (
          <>
            {s.error && (
              <div role="alert" className="alert">
                <span>⚠ {s.error}</span>
                <button className="btn btn--small" onClick={vm.retry}>Réessayer</button>
              </div>
            )}
            <button className="btn btn--primary" onClick={vm.newMission}>Nouvelle mission</button>
            <button className="btn" aria-disabled={!cont.enabled} aria-describedby="cont-info"
              onClick={cont.enabled ? vm.continueCampaign : undefined}>Continuer</button>
            <p id="cont-info" className="hint">
              {s.save
                ? `${ACT_LABELS[s.save.currentAct]} · ${MODE_LABELS[s.save.mode]} · ${fmt.format(s.save.updatedAt)}`
                : cont.reason}
            </p>
            <button className="btn" onClick={() => vm.open('/rapports')}>Rapports &amp; comparaison</button>
            <button className="btn" onClick={() => vm.open('/options')}>Options</button>
            <button className="btn" onClick={() => vm.open('/credits')}>Crédits</button>
          </>
        )}
      </section>
      <footer className="foot">Rendu : {s.renderMode === '2d' ? '2D (repli)' : s.renderMode === '3d' ? '3D' : '3D allégé'}</footer>

      {s.confirmNew && (
        <div className="veil">
          <div className="panel dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title"
            onKeyDown={(e) => e.key === 'Escape' && vm.cancelNewMission()}>
            <h2 id="dlg-title" className="panel-title">Nouvelle campagne</h2>
            <p>Une campagne est en cours. En lancer une nouvelle peut remplacer votre sauvegarde actuelle.</p>
            <div className="row">
              <button ref={cancelRef} className="btn" onClick={vm.cancelNewMission}>Annuler</button>
              <button className="btn btn--primary" onClick={vm.confirmNewMission}>Continuer quand même</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
