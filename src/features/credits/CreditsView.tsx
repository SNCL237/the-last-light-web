import { useEffect } from 'react';
import { useViewModel } from '../../core/useViewModel';
import { CreditsViewModel, creditedEntries, sourcesOf } from './CreditsViewModel';
import { t } from '../../i18n';

export function CreditsView({ vm }: { vm: CreditsViewModel }) {
  const s = useViewModel(vm);
  useEffect(() => { void vm.init(); }, [vm]);
  const credited = creditedEntries(s);
  const sources = sourcesOf(s);
  return (
    <main className="screen">
      <div className="scene" aria-hidden="true" />
      <header className="brand">{t("THE LAST LIGHT")}</header>
      <h1 className="title">{t("Crédits")}</h1>
      <div className="stack">
        {s.status === 'loading' && <p role="status" className="hint">{t("Chargement…")}</p>}
        {s.status === 'error' && (
          <div role="alert" className="alert"><span>⚠ {t(s.error)}</span>
            <button className="btn btn--small" onClick={vm.retry}>{t("Réessayer")}</button></div>)}
        {s.status === 'ready' && (<>
          <section className="panel"><h2 className="panel-title">{t("Équipe")}</h2><p>{t("À compléter par l'équipe du projet.")}</p></section>
          <section className="panel"><h2 className="panel-title">{t("Sources et licences")}</h2>
            {sources.length === 0 ? <p className="hint">{t("Aucun visuel externe intégré pour l'instant.")}</p> : (
              <ul className="credit-list">{sources.map((x) => <li key={x.name}>{x.url ? <a href={x.url} target="_blank" rel="noreferrer">{t(x.name)}</a> : x.name}</li>)}</ul>)}
            <p className="hint">{t("Projet indépendant : il n'est ni affilié à la NASA ni approuvé par elle. Les images d'agences spatiales sont utilisées selon leurs consignes d'usage.")}</p>
          </section>
          <section className="panel"><h2 className="panel-title">{t("Visuels")}</h2>
            {credited.length === 0 ? <p className="hint">{t("Aucun visuel crédité pour l'instant.")}</p> : (
              <ul className="credit-list">{credited.map((e) => (
                <li key={e.id}><strong>{t(e.title)}</strong> — {t(e.credit)} · {t(e.license)}
                  {e.source.url && <> · <a href={e.source.url} target="_blank" rel="noreferrer">{t("source")}</a></>}</li>))}</ul>)}
          </section>
          {s.issues.length > 0 && (
            <section className="panel" role="alert"><h2 className="panel-title">{t("Manifeste : à corriger (mode développement)")}</h2>
              <ul className="credit-list">{s.issues.map((i) => <li key={i}>{i}</li>)}</ul></section>)}
        </>)}
      </div>
      <button className="btn btn--small" onClick={vm.back}>{t("Retour")}</button>
    </main>
  );
}
