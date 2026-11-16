import { useEffect } from 'react';
import { MoonExplorer } from './MoonExplorer';
import { useViewModel } from '../../core/useViewModel';
import type { Estimate, ObjectiveId, ProfileCatalog } from '../../domain/profile';
import { eliasDelta, estimateOf, instrumentsOf, nextAvailability, ProfileViewModel, STEP_LABELS, STEPS, type ProfileState } from './ProfileViewModel';
import { t as tr, locale } from '../../i18n';

const fmt = (n: number) => n.toLocaleString(locale(), { maximumFractionDigits: 1 });

/** Repli 2D (S-01) : pôle sud stylisé ; les zones s'allument selon les objectifs retenus. */
function PolarMap({ s }: { s: ProfileState }) {
  const on = (id: ObjectiveId) => (s.primary === id ? 'primary' : s.secondaries.includes(id) ? 'secondary' : 'off');
  return (
    <svg className="polar" viewBox="-110 -110 220 220" role="img" aria-label={tr("Carte schématique de la région polaire sud lunaire")}>
      <defs><radialGradient id="moon" cx="40%" cy="35%"><stop offset="0" stopColor="#c3cad3" /><stop offset="1" stopColor="#3a424d" /></radialGradient></defs>
      <circle r="100" fill="url(#moon)" />
      {[30, 60, 90].map((r) => <circle key={r} r={r} className="polar-grid" />)}
      <line x1="-100" x2="100" className="polar-grid" /><line y1="-100" y2="100" className="polar-grid" />
      <g data-zone={on('mapping')}><circle r="88" className="zone zone--ring" /></g>
      <g data-zone={on('ice')}><circle cx="-14" cy="10" r="16" className="zone" /><circle cx="22" cy="-18" r="11" className="zone" /></g>
      <g data-zone={on('thermal')}><path d="M-60 -40 A72 72 0 0 1 -10 -70 L-6 -46 A48 48 0 0 0 -40 -26 Z" className="zone" /></g>
      <g data-zone={on('composition')}><path d="M40 40 A60 60 0 0 0 70 -10 L48 -8 A38 38 0 0 1 28 26 Z" className="zone" /></g>
      <text y="-104" textAnchor="middle" className="polar-label">{tr("Pôle Sud · ombre permanente")}</text>
    </svg>);
}

function Gauge({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return <div className="gauge"><span className="hint">{label}</span><strong>{value}{unit && <small> {unit}</small>}</strong></div>;
}

function Totals({ e }: { e: Estimate }) {
  return <dl className="kv">
    <dt>{tr("Masse")}</dt><dd>{fmt(e.massKg)} {tr("kg")}</dd><dt>{tr("Énergie")}</dt><dd>{fmt(e.powerW)} W</dd>
    <dt>{tr("Données")}</dt><dd>{fmt(e.dataGbPerDay)} {tr("Go/j")}</dd><dt>{tr("Coût")}</dt><dd>{fmt(e.costM)} {tr('M€')}</dd></dl>;
}

function InstrumentList({ c, ids }: { c: ProfileCatalog; ids: string[] }) {
  if (!ids.length) return <p className="hint">{tr("Aucun instrument tant qu'aucun objectif n'est choisi.")}</p>;
  return <table className="table"><caption className="sr">{tr("Instruments pertinents")}</caption>
    <thead><tr><th scope="col">{tr("Instrument")}</th><th scope="col">{tr("Masse")}</th><th scope="col">{tr("Énergie")}</th><th scope="col">{tr("Données")}</th><th scope="col">{tr("Coût")}</th></tr></thead>
    <tbody>{c.instruments.filter((i) => ids.includes(i.id)).map((i) => (
      <tr key={i.id}><th scope="row">{tr(i.name)}<br /><span className="hint">{tr("réf.")} {i.reference} · {tr(i.role)}</span></th>
        <td>{fmt(i.massKg)} {tr("kg")}</td><td>{fmt(i.powerW)} W</td><td>{fmt(i.dataGbPerDay)} {tr("Go/j")}</td><td>{fmt(i.costM)} {tr('M€')}</td></tr>))}</tbody></table>;
}

export function ProfileView({ vm }: { vm: ProfileViewModel }) {
  const s = useViewModel(vm);
  useEffect(() => { void vm.init(); }, [vm]);

  if (s.status !== 'ready' || !s.catalog) return (
    <main className="screen"><div className="scene" aria-hidden="true" />
      {s.status === 'error'
        ? <div role="alert" className="alert"><span>⚠ {tr(s.error)}</span><button className="btn btn--small" onClick={vm.retry}>{tr("Réessayer")}</button></div>
        : <p role="status" className="hint">{tr("Chargement…")}</p>}
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
        <span className="brand">{tr("THE LAST LIGHT")}</span>
        <span className="hint">{tr("Acte I · A Promise That Must Live — Étape")} {idx + 1}/5 : {tr(STEP_LABELS[s.step])}</span>
        <a className="btn btn--small" href="#/">{tr("Menu")}</a>
      </header>

      <nav className="rail panel" aria-label={tr("Étapes de l'Acte I")}><ol>
        {STEPS.map((st, i) => {
          const reach = vm.canGoTo(st);
          return <li key={st}><button className="step" aria-current={st === s.step ? 'step' : undefined} disabled={!reach || s.submitting}
            title={reach ? undefined : tr('Terminez d’abord les étapes précédentes')} onClick={() => vm.goTo(st)}>
            <span className="step-n" aria-hidden="true">{i < idx ? '✓' : i + 1}</span>{tr(STEP_LABELS[st])}</button></li>;
        })}</ol></nav>

      <section className="center center--atlas" aria-label={tr("Région polaire")}>
        <MoonExplorer objectives={s.primary ? [s.primary, ...s.secondaries] : []} fallback={<><PolarMap s={s} />
          <ul className="legend"><li data-zone="primary">{tr("Principal")}</li><li data-zone="secondary">{tr("Secondaire")}</li><li data-zone="off">{tr("Non retenu")}</li></ul></>} /></section>

      <section className="side panel" aria-live="polite">
        {s.step === 'briefing' && <><h1 className="panel-title">{tr("Briefing polaire")}</h1>{c.polarBriefing.map((x) => <p key={x}>{tr(x)}</p>)}</>}

        {s.step === 'debate' && <><h1 className="panel-title">{tr("Débat de l'équipe")}</h1>
          {c.debate.map((r) => <p key={r.speaker} className="say"><strong>{tr(r.speaker)}</strong>{tr(r.text)}</p>)}</>}

        {s.step === 'selection' && <><h1 className="panel-title">{tr("Objectifs scientifiques")}</h1>
          <p className="hint">{tr("1 objectif principal, puis 0 à 2 secondaires.")}</p>
          <div className="cards">{c.objectives.map((o) => {
            const role = s.primary === o.id ? 'primary' : s.secondaries.includes(o.id) ? 'secondary' : 'off';
            const sec = vm.secondaryAvailability(o.id);
            return <article key={o.id} className={`panel ocard ocard--${role}`}>
              <h2 className="ocard-title">{tr(o.label)}{role !== 'off' && <span className="tag">✓ {role === 'primary' ? tr('Principal') : tr('Secondaire')}</span>}</h2>
              <p>{tr(o.question)}</p><p className="hint">{tr(o.value)}</p>
              <div className="row">
                <button className="btn btn--small" aria-pressed={role === 'primary'} onClick={() => vm.setPrimary(o.id)}>{tr("Principal")}</button>
                <button className="btn btn--small" aria-pressed={role === 'secondary'} aria-disabled={!sec.enabled}
                  title={tr(sec.reason)} onClick={sec.enabled ? () => vm.toggleSecondary(o.id) : undefined}>{tr("Secondaire")}</button>
                {!sec.enabled && s.primary !== o.id && <span className="hint">{tr(sec.reason)}</span>}
              </div></article>;
          })}</div>
          <label className="check"><input type="checkbox" checked={s.noSecondaryByChoice} onChange={(ev) => vm.setNoSecondary(ev.target.checked)} />
            {tr("Je ne retiens volontairement aucun objectif secondaire")}</label>
          {s.secondaries.length > 0 && <div className="alert alert--info" role="status">ℹ {c.secondaryConstraint}</div>}
          <h2 className="panel-title">{tr("Instruments pertinents")}</h2><InstrumentList c={c} ids={ids} /></>}

        {s.step === 'elias' && <><h1 className="panel-title">{tr("L'instrument d'Elias")}</h1>
          {c.eliasIntro.map((r) => <p key={r.speaker} className="say"><strong>{tr(r.speaker)}</strong>{tr(r.text)}</p>)}
          <table className="table tradeoff"><caption className="sr">{tr("Je gagne / je perds")}</caption>
            <thead><tr><th scope="col">{tr("Décision")}</th><th scope="col">{tr("Je gagne")}</th><th scope="col">{tr("Je perds")}</th></tr></thead>
            <tbody>{c.tradeoffs.map((t) => (
              <tr key={t.decision} className={s.elias === t.decision ? 'is-on' : undefined}>
                <th scope="row"><label className="check"><input type="radio" name="elias" checked={s.elias === t.decision} onChange={() => vm.decideElias(t.decision)} />{tr(t.label)}</label></th>
                <td>{tr(t.gain)}</td><td>{tr(t.loss)}</td></tr>))}</tbody></table>
          {delta && <div className="consequence"><div><h2 className="panel-title">{tr("Sans le radar")}</h2><Totals e={delta.without} /></div>
            <div><h2 className="panel-title">{tr("Avec le radar")}</h2><Totals e={delta.with} /></div></div>}
          {trade && <p className="say" role="status"><strong>{tr(trade.reaction.speaker)}</strong>{tr(trade.reaction.text)}</p>}</>}

        {s.step === 'confirm' && s.primary && <><h1 className="panel-title">{tr("Profil scientifique")}</h1>
          <dl className="kv"><dt>{tr("Principal")}</dt><dd>{tr(label(s.primary))}</dd>
            <dt>{tr("Secondaires")}</dt><dd>{s.secondaries.length ? s.secondaries.map((x) => tr(label(x))).join(', ') : tr('Aucun (choix volontaire)')}</dd>
            <dt>{tr("Instrument d'Elias")}</dt><dd>{tr(trade?.label)}</dd></dl>
          <h2 className="panel-title">{tr("Contraintes prévisionnelles")}</h2><InstrumentList c={c} ids={ids} /><Totals e={e} />
          {s.elias === 'defer' && <div className="alert" role="status">{tr("⚠ Décision reportée : le radar devra être tranché dans l'atelier.")}</div>}
          <p className="hint">{tr("Estimation indicative ; les valeurs officielles sont calculées par le serveur.")}</p></>}
      </section>

      <footer className="bottombar panel">
        <Gauge label={tr("Coût estimé")} value={fmt(e.costM)} unit="M€" />
        <Gauge label={tr("Objectifs")} value={`${s.primary ? 1 + s.secondaries.length : 0}/3`} />
        <Gauge label={tr("Instruments")} value={String(e.count)} />
        <div className="bottombar-actions">
          {s.error && <span role="alert" className="alert">⚠ {tr(s.error)}</span>}
          <span id="next-reason" role="status" className="hint">{tr(nxt.reason)}</span>
          {idx > 0 && <button className="btn btn--small" disabled={s.submitting} onClick={vm.back}>{tr("Retour")}</button>}
          <button className="btn btn--primary btn--small" aria-disabled={!nxt.enabled} aria-describedby="next-reason"
            onClick={nxt.enabled ? vm.next : undefined}>{s.step === 'confirm' ? (s.submitting ? tr('Enregistrement…') : tr('Confirmer le profil')) : tr('Suivant')}</button>
        </div>
      </footer>
    </main>);
}
