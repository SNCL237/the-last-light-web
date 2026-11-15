import { useEffect, type KeyboardEvent } from 'react';
import { useViewModel } from '../../core/useViewModel';
import { TAB_LABELS, TAB_ORDER } from '../../domain/briefing';
import { BriefingViewModel, continueAvailability, selectedPosture } from './BriefingViewModel';

export function BriefingView({ vm }: { vm: BriefingViewModel }) {
  const s = useViewModel(vm);
  useEffect(() => { void vm.init(); }, [vm]);

  if (s.status !== 'ready' || !s.content) return (
    <main className="screen"><div className="scene" aria-hidden="true" data-mood="recruit" />
      {s.status === 'error' ? (
        <div role="alert" className="alert"><span>⚠ {s.error}</span><button className="btn btn--small" onClick={vm.retry}>Réessayer</button></div>
      ) : <p role="status" className="hint">Chargement…</p>}
    </main>);

  const c = s.content;
  const posture = selectedPosture(s);
  const cont = continueAvailability(s);
  const onKey = (e: KeyboardEvent) => {
    const i = TAB_ORDER.indexOf(s.tab);
    const next = e.key === 'ArrowRight' ? TAB_ORDER[(i + 1) % 4] : e.key === 'ArrowLeft' ? TAB_ORDER[(i + 3) % 4] : null;
    if (next) { e.preventDefault(); vm.selectTab(next); document.getElementById(`tab-${next}`)?.focus(); }
  };
  const list = (items: string[]) => items.map((t) => <p key={t}>{t}</p>);

  return (
    <main className="screen">
      <div className="scene" aria-hidden="true" data-mood="recruit" />
      <header className="brand">THE LAST LIGHT</header>
      <div><h1 className="title">Briefing</h1><p className="hint">Rencontre de l&apos;équipe</p></div>

      <div className="stack">
        <div className="panel tabs" role="tablist" aria-label="Briefing" onKeyDown={onKey}>
          {TAB_ORDER.map((t) => (
            <button key={t} id={`tab-${t}`} role="tab" className="tab" aria-selected={s.tab === t} aria-controls="tabpanel"
              tabIndex={s.tab === t ? 0 : -1} onClick={() => vm.selectTab(t)}>{TAB_LABELS[t]}</button>))}
        </div>
        <section id="tabpanel" role="tabpanel" aria-labelledby={`tab-${s.tab}`} className="panel">
          {s.tab === 'context' && list(c.context)}
          {s.tab === 'objectives' && list(c.objectives)}
          {s.tab === 'constraints' && list(c.constraints)}
          {s.tab === 'characters' && (
            <div className="chars">{c.characters.map((p) => (
              <div key={p.id} className="char">
                <div className="avatar" aria-hidden="true">{p.initials}</div>
                <div><strong>{p.name}</strong><p className="hint">{p.role}</p>
                  <p>Priorité : {p.priority}</p><p className="hint">{p.voice}</p></div>
              </div>))}</div>)}
        </section>

        <fieldset className="modes" disabled={s.submitting}>
          <legend className="panel-title">Votre posture initiale</legend>
          {c.postures.map((p) => {
            const on = s.stance === p.id;
            return (
              <label key={p.id} className="mode">
                <input type="radio" name="stance" className="sr" checked={on} onChange={() => vm.chooseStance(p.id)} />
                <div className={`panel mode-body${on ? ' is-on' : ''}`}>
                  <h2 className="panel-title">{p.label}{on ? ' ✓ Sélectionnée' : ''}</h2><p>{p.summary}</p>
                </div>
              </label>);
          })}
        </fieldset>

        {posture && (
          <div className="panel reaction" role="status">
            <h2 className="panel-title">{posture.reaction.speaker}</h2><p>{posture.reaction.text}</p>
            {!s.asked
              ? <button className="btn btn--small" onClick={vm.askQuestion}>Demander : {posture.question}</button>
              : <><p className="hint">Vous : {posture.question}</p><strong>{posture.answer.speaker} : </strong>{posture.answer.text}</>}
          </div>)}

        {s.error && <div role="alert" className="alert">⚠ {s.error}</div>}
        <div className="actions">
          <button className="btn btn--primary btn--small" aria-disabled={!cont.enabled} aria-describedby="cont-reason"
            onClick={cont.enabled ? vm.continueToAct1 : undefined}>Commencer l&apos;Acte I</button>
          <button className="btn btn--small" disabled={s.submitting} onClick={vm.skip}>Passer sans choisir</button>
          <span id="cont-reason" role="status" className="hint">{cont.reason}</span>
        </div>
      </div>
    </main>
  );
}
