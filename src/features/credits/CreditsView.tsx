import { useEffect } from 'react';
import { useViewModel } from '../../core/useViewModel';
import { CreditsViewModel, creditedEntries, sourcesOf } from './CreditsViewModel';

export function CreditsView({ vm }: { vm: CreditsViewModel }) {
  const s = useViewModel(vm);
  useEffect(() => { void vm.init(); }, [vm]);
  const credited = creditedEntries(s);
  const sources = sourcesOf(s);
  return (
    <main className="screen">
      <div className="scene" aria-hidden="true" />
      <header className="brand">THE LAST LIGHT</header>
      <h1 className="title">Crédits</h1>
      <div className="stack">
        {s.status === 'loading' && <p role="status" className="hint">Chargement…</p>}
        {s.status === 'error' && (
          <div role="alert" className="alert"><span>⚠ {s.error}</span>
            <button className="btn btn--small" onClick={vm.retry}>Réessayer</button></div>)}
        {s.status === 'ready' && (<>
          <section className="panel"><h2 className="panel-title">Équipe</h2><p>À compléter par l&apos;équipe du projet.</p></section>
          <section className="panel"><h2 className="panel-title">Sources et licences</h2>
            {sources.length === 0 ? <p className="hint">Aucun visuel externe intégré pour l&apos;instant.</p> : (
              <ul className="credit-list">{sources.map((x) => <li key={x.name}>{x.url ? <a href={x.url} target="_blank" rel="noreferrer">{x.name}</a> : x.name}</li>)}</ul>)}
            <p className="hint">Projet indépendant : il n&apos;est ni affilié à la NASA ni approuvé par elle. Les images d&apos;agences spatiales sont utilisées selon leurs consignes d&apos;usage.</p>
          </section>
          <section className="panel"><h2 className="panel-title">Visuels</h2>
            {credited.length === 0 ? <p className="hint">Aucun visuel crédité pour l&apos;instant.</p> : (
              <ul className="credit-list">{credited.map((e) => (
                <li key={e.id}><strong>{e.title}</strong> — {e.credit} · {e.license}
                  {e.source.url && <> · <a href={e.source.url} target="_blank" rel="noreferrer">source</a></>}</li>))}</ul>)}
          </section>
          {s.issues.length > 0 && (
            <section className="panel" role="alert"><h2 className="panel-title">Manifeste : à corriger (mode développement)</h2>
              <ul className="credit-list">{s.issues.map((i) => <li key={i}>{i}</li>)}</ul></section>)}
        </>)}
      </div>
      <button className="btn btn--small" onClick={vm.back}>Retour</button>
    </main>
  );
}
