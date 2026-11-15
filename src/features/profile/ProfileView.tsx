import { useEffect } from 'react';
import { MoonExplorer } from './MoonExplorer';
import { useViewModel } from '../../core/useViewModel';
import type { Estimate, ObjectiveId, ProfileCatalog } from '../../domain/profile';
import { eliasDelta, estimateOf, instrumentsOf, nextAvailability, ProfileViewModel, STEP_LABELS, STEPS, type ProfileState } from './ProfileViewModel';

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

/** Repli 2D (S-01) : pôle sud stylisé ; les zones s'allument selon les objectifs retenus. */
function PolarMap({ s }: { s: ProfileState }) {
  const on = (id: ObjectiveId) => (s.primary === id ? 'primary' : s.secondaries.includes(id) ? 'secondary' : 'off');
  return (
    <svg className="polar" viewBox="-110 -110 220 220" role="img" aria-label="Carte schématique de la région polaire sud lunaire">
      <defs><radialGradient id="moon" cx="40%" cy="35%"><stop offset="0" stopColor="#c3cad3" /><stop offset="1" stopColor="#3a424d" /></radialGradient></defs>
      <circle r="100" fill="url(#moon)" />
      {[30, 60, 90].map((r) => <circle key={r} r={r} className="polar-grid" />)}
      <line x1="-100" x2="100" className="polar-grid" /><line y1="-100" y2="100" className="polar-grid" />
      <g data-zone={on('mapping')}><circle r="88" className="zone zone--ring" /></g>
      <g data-zone={on('ice')}><circle cx="-14" cy="10" r="16" className="zone" /><circle cx="22" cy="-18" r="11" className="zone" /></g>
      <g data-zone={on('thermal')}><path d="M-60 -40 A72 72 0 0 1 -10 -70 L-6 -46 A48 48 0 0 0 -40 -26 Z" className="zone" /></g>
      <g data-zone={on('composition')}><path d="M40 40 A60 60 0 0 0 70 -10 L48 -8 A38 38 0 0 1 28 26 Z" className="zone" /></g>
      <text y="-104" textAnchor="middle" className="polar-label">Pôle Sud · ombre permanente</text>
    </svg>);
}

function Gauge({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return <div className="gauge"><span className="hint">{label}</span><strong>{value}{unit && <small> {unit}</small>}</strong></div>;
}

function Totals({ e }: { e: Estimate }) {
  return <dl className="kv">
    <dt>Masse</dt><dd>{fmt(e.massKg)} kg</dd><dt>Énergie</dt><dd>{fmt(e.powerW)} W</dd>
    <dt>Données</dt><dd>{fmt(e.dataGbPerDay)} Go/j</dd><dt>Coût</dt><dd>{fmt(e.costM)} M€</dd></dl>;
}

function InstrumentList({ c, ids }: { c: ProfileCatalog; ids: string[] }) {
  if (!ids.length) return <p className="hint">Aucun instrument tant qu&apos;aucun objectif n&apos;est choisi.</p>;
  return <table className="table"><caption className="sr">Instruments pertinents</caption>
    <thead><tr><th scope="col">Instrument</th><th scope="col">Masse</th><th scope="col">Énergie</th><th scope="col">Données</th><th scope="col">Coût</th></tr></thead>
    <tbody>{c.instruments.filter((i) => ids.includes(i.id)).map((i) => (
      <tr key={i.id}><th scope="row">{i.name}<br /><span className="hint">réf. {i.reference} · {i.role}</span></th>
        <td>{fmt(i.massKg)} kg</td><td>{fmt(i.powerW)} W</td><td>{fmt(i.dataGbPerDay)} Go/j</td><td>{fmt(i.costM)} M€</td></tr>))}</tbody></table>;
}

export function ProfileView({ vm }: { vm: ProfileViewModel }) {
  const s = useViewModel(vm);
  useEffect(() => { void vm.init(); }, [vm]);

  if (s.status !== 'ready' || !s.catalog) return (
    <main className="screen"><div className="scene" aria-hidden="true" />
      {s.status === 'error'
        ? <div role="alert" className="alert"><span>⚠ {s.error}</span><button className="btn btn--small" onClick={vm.retry}>Réessayer</button></div>
        : <p role="status" className="hint">Chargement…</p>}
    </main>);

  const c = s.catalog;
  const e = estimateOf(s) as Estimate;
  const ids = instrumentsOf(s);
  const nxt = nextAvailability(s);
  const idx = STEPS.indexOf(s.step);
  const label = (id: ObjectiveId) => c.objectives.find((o) => o.id === id)?.label ?? id;
  const delta = eliasDelta(s);
  const trade = c.tradeoffs.find((t) => t.decision === s.elias);

  return (
    <main className="shell">
      <div className="scene" aria-hidden="true" />
      <header className="topbar">
        <span className="brand">THE LAST LIGHT</span>
        <span className="hint">Acte I · A Promise That Must Live — Étape {idx + 1}/5 : {STEP_LABELS[s.step]}</span>
        <a className="btn btn--small" href="#/">Menu</a>
      </header>

      <nav className="rail panel" aria-label="Étapes de l'Acte I"><ol>
        {STEPS.map((st, i) => {
          const reach = vm.canGoTo(st);
          return <li key={st}><button className="step" aria-current={st === s.step ? 'step' : undefined} disabled={!reach || s.submitting}
            title={reach ? undefined : 'Terminez d’abord les étapes précédentes'} onClick={() => vm.goTo(st)}>
            <span className="step-n" aria-hidden="true">{i < idx ? '✓' : i + 1}</span>{STEP_LABELS[st]}</button></li>;
        })}</ol></nav>

      <section className="center center--atlas" aria-label="Région polaire">
        <MoonExplorer objectives={s.primary ? [s.primary, ...s.secondaries] : []} fallback={<><PolarMap s={s} />
          <ul className="legend"><li data-zone="primary">Principal</li><li data-zone="secondary">Secondaire</li><li data-zone="off">Non retenu</li></ul></>} /></section>

      <section className="side panel" aria-live="polite">
        {s.step === 'briefing' && <><h1 className="panel-title">Briefing polaire</h1>{c.polarBriefing.map((t) => <p key={t}>{t}</p>)}</>}

        {s.step === 'debate' && <><h1 className="panel-title">Débat de l&apos;équipe</h1>
          {c.debate.map((r) => <p key={r.speaker} className="say"><strong>{r.speaker}</strong>{r.text}</p>)}</>}

        {s.step === 'selection' && <><h1 className="panel-title">Objectifs scientifiques</h1>
          <p className="hint">1 objectif principal, puis 0 à 2 secondaires.</p>
          <div className="cards">{c.objectives.map((o) => {
            const role = s.primary === o.id ? 'primary' : s.secondaries.includes(o.id) ? 'secondary' : 'off';
            const sec = vm.secondaryAvailability(o.id);
            return <article key={o.id} className={`panel ocard ocard--${role}`}>
              <h2 className="ocard-title">{o.label}{role !== 'off' && <span className="tag">✓ {role === 'primary' ? 'Principal' : 'Secondaire'}</span>}</h2>
              <p>{o.question}</p><p className="hint">{o.value}</p>
              <div className="row">
                <button className="btn btn--small" aria-pressed={role === 'primary'} onClick={() => vm.setPrimary(o.id)}>Principal</button>
                <button className="btn btn--small" aria-pressed={role === 'secondary'} aria-disabled={!sec.enabled}
                  title={sec.reason} onClick={sec.enabled ? () => vm.toggleSecondary(o.id) : undefined}>Secondaire</button>
                {!sec.enabled && s.primary !== o.id && <span className="hint">{sec.reason}</span>}
              </div></article>;
          })}</div>
          <label className="check"><input type="checkbox" checked={s.noSecondaryByChoice} onChange={(ev) => vm.setNoSecondary(ev.target.checked)} />
            Je ne retiens volontairement aucun objectif secondaire</label>
          {s.secondaries.length > 0 && <div className="alert alert--info" role="status">ℹ {c.secondaryConstraint}</div>}
          <h2 className="panel-title">Instruments pertinents</h2><InstrumentList c={c} ids={ids} /></>}

        {s.step === 'elias' && <><h1 className="panel-title">L&apos;instrument d&apos;Elias</h1>
          {c.eliasIntro.map((r) => <p key={r.speaker} className="say"><strong>{r.speaker}</strong>{r.text}</p>)}
          <table className="table tradeoff"><caption className="sr">Je gagne / je perds</caption>
            <thead><tr><th scope="col">Décision</th><th scope="col">Je gagne</th><th scope="col">Je perds</th></tr></thead>
            <tbody>{c.tradeoffs.map((t) => (
              <tr key={t.decision} className={s.elias === t.decision ? 'is-on' : undefined}>
                <th scope="row"><label className="check"><input type="radio" name="elias" checked={s.elias === t.decision} onChange={() => vm.decideElias(t.decision)} />{t.label}</label></th>
                <td>{t.gain}</td><td>{t.loss}</td></tr>))}</tbody></table>
          {delta && <div className="consequence"><div><h2 className="panel-title">Sans le radar</h2><Totals e={delta.without} /></div>
            <div><h2 className="panel-title">Avec le radar</h2><Totals e={delta.with} /></div></div>}
          {trade && <p className="say" role="status"><strong>{trade.reaction.speaker}</strong>{trade.reaction.text}</p>}</>}

        {s.step === 'confirm' && s.primary && <><h1 className="panel-title">Profil scientifique</h1>
          <dl className="kv"><dt>Principal</dt><dd>{label(s.primary)}</dd>
            <dt>Secondaires</dt><dd>{s.secondaries.length ? s.secondaries.map(label).join(', ') : 'Aucun (choix volontaire)'}</dd>
            <dt>Instrument d&apos;Elias</dt><dd>{trade?.label}</dd></dl>
          <h2 className="panel-title">Contraintes prévisionnelles</h2><InstrumentList c={c} ids={ids} /><Totals e={e} />
          {s.elias === 'defer' && <div className="alert" role="status">⚠ Décision reportée : le radar devra être tranché dans l&apos;atelier.</div>}
          <p className="hint">Estimation indicative ; les valeurs officielles sont calculées par le serveur.</p></>}
      </section>

      <footer className="bottombar panel">
        <Gauge label="Coût estimé" value={fmt(e.costM)} unit="M€" />
        <Gauge label="Objectifs" value={`${s.primary ? 1 + s.secondaries.length : 0}/3`} />
        <Gauge label="Instruments" value={String(e.count)} />
        <div className="bottombar-actions">
          {s.error && <span role="alert" className="alert">⚠ {s.error}</span>}
          <span id="next-reason" role="status" className="hint">{nxt.reason}</span>
          {idx > 0 && <button className="btn btn--small" disabled={s.submitting} onClick={vm.back}>Retour</button>}
          <button className="btn btn--primary btn--small" aria-disabled={!nxt.enabled} aria-describedby="next-reason"
            onClick={nxt.enabled ? vm.next : undefined}>{s.step === 'confirm' ? (s.submitting ? 'Enregistrement…' : 'Confirmer le profil') : 'Suivant'}</button>
        </div>
      </footer>
    </main>);
}
