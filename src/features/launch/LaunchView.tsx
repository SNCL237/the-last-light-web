import { useEffect } from 'react';
import { useViewModel } from '../../core/useViewModel';
import { BUDGET_M, LAUNCHERS, ORBIT_PRESETS, type OrbitKind } from '../../domain/mission';
import { orbitMetrics } from '../../domain/orbit';
import { totals } from '../../domain/sim';
import { ELIAS_UNFINISHED } from '../../domain/script';
import { GmatPanel } from '../../ui/Gmat';
import { Icon } from '../../ui/Icon';
import { ActionButton, AlertBanner, ConfirmModal, fmt, Gauge, KV, levelOf, Lines, Panel } from '../../ui/kit';
import { Shell } from '../../ui/Shell';
import { Loading } from '../mission/Loading';
import { LaunchViewModel, PHASES } from './LaunchViewModel';
import { t as tr } from '../../i18n';

export function LaunchView({ vm, step }: { vm: LaunchViewModel; step: 'review' | 'sequence' }) {
  const s = useViewModel(vm); useEffect(() => { vm.revive(); void vm.init(); return vm.dispose; }, [vm]);
  if (s.status !== 'ready' || !s.mission) return <Loading s={s} retry={vm.retry} />;
  const m = s.mission; const t = totals(m.config, s.orbit); const om = orbitMetrics(s.orbit); const lv = vm.launcher();
  const so = vm.serverOrbits(); const sb = vm.serverFigures(); const cap = vm.capacityKg(); const mass = sb?.masseTotaleKg ?? t.massKg; const cost = sb ? (sb.coutMUSD ?? 0) : t.costM + lv.costM; const budget = sb ? (m.server?.budgetM ?? 100) : BUDGET_M;
  const issues = vm.issues; const errs = issues.filter((i) => i.severity === 'error'); const avail = vm.launchAvailability();

  if (step === 'sequence') {
    const done = s.phase >= PHASES.length - 1;
    return <div className="seq" data-static={s.staticMode || undefined}>
      <div className="seq-hud"><span className="mono">T{s.phase < 1 ? '−10' : '+' + String(s.phase * 47).padStart(3, '0')} s</span><h1>{tr(PHASES[s.phase])}</h1>
        <ol className="seq-steps">{PHASES.map((p, i) => <li key={p} className={i < s.phase ? 'is-done' : i === s.phase ? 'is-on' : ''}>{i < s.phase ? <Icon name="check" size={12} /> : <span className="n">{i + 1}</span>}{tr(p)}</li>)}</ol>
        <p className="seq-sub" role="status" aria-live="polite">{[tr('Tous les postes, vérification finale.'), tr('Alimentation interne, communications confirmées.'), tr('Mise à feu. Décollage.'), tr('Séparation confirmée, deuxième étage nominal.'), tr('Injection sur la trajectoire prévue.'), tr('Insertion confirmée. L’orbiteur est seul au-dessus de la Lune.')][s.phase]}</p>
        {s.staticMode && <p className="muted">{tr("Mode sans animation :")} {tr(lv.label)} · {tr(ORBIT_PRESETS[m.launch?.orbit.kind ?? 'polar'].label)} {tr("· conception verrouillée.")}</p>}
        {s.error && <p role="alert" className="action-why">{tr(s.error)}</p>}<div className="row2">{!done && (s.paused || s.staticMode ? <button className="btn2 btn2--ghost" onClick={vm.play}><Icon name="play" size={12} /> {s.staticMode ? tr('Dérouler') : tr('Reprendre')}</button> : <button className="btn2 btn2--ghost" onClick={vm.pause}><Icon name="pause" size={12} /> {tr("Pause")}</button>)}
          <button className="btn2 btn2--primary" onClick={vm.skip} autoFocus>{done ? tr('Continuer') : tr('Passer la séquence')}</button></div></div></div>;
  }

  return <Shell act={3} step={tr("Revue de lancement")} save={s.save}
    left={<div className="stack2"><Panel title={tr("Lanceur")} icon="rocket"><div className="opts" role="radiogroup" aria-label={tr("Lanceur")}>{LAUNCHERS.map((l) => <label key={l.id} className={`opt${s.launcherId === l.id ? ' is-on' : ''}`}>
      <input type="radio" name="lv" checked={s.launcherId === l.id} onChange={() => vm.chooseLauncher(l.id)} /><span><strong>{tr(l.label)}</strong><small className="mono">{so.length ? `${vm.capacityFor(l.id)} kg sur cette orbite · ${l.costM} M$` : `${l.capacityKg} kg · ${l.costM} ${tr('M€')}`} · {Math.round(l.reliability * 100)} %</small></span></label>)}</div></Panel>
      <Panel title={tr("Orbite")} icon="orbit">{so.length ? <><div className="opts" role="radiogroup" aria-label={tr("Orbite")}>{so.map((o) => <label key={o.id} className={`opt${s.orbitId === o.id ? ' is-on' : ''}`}>
        <input type="radio" name="orb" checked={s.orbitId === o.id} onChange={() => vm.chooseServerOrbit(o.id)} /><span><strong>{tr(o.label)}</strong><small className="mono">{o.choice.periKm} {tr("km ·")} {o.choice.incDeg}{tr("° · ombre")} {Math.round(o.fractionOmbre * 1000) / 10} {tr("% · couverture")} {Math.round(o.couverture * 100)} %</small></span></label>)}</div>
        <p className="muted">{tr("Orbites fixées par le catalogue du serveur (paramètres non réglables).")}</p></> : <><div className="opts" role="radiogroup" aria-label={tr("Orbite")}>{(Object.keys(ORBIT_PRESETS) as OrbitKind[]).map((k) => <label key={k} className={`opt${s.orbit.kind === k ? ' is-on' : ''}`}>
        <input type="radio" name="orb" checked={s.orbit.kind === k} onChange={() => vm.chooseOrbit(k)} /><span><strong>{tr(ORBIT_PRESETS[k].label)}</strong><small>{tr(ORBIT_PRESETS[k].desc)}</small></span></label>)}</div>
        <label className="slider">{tr("Périlune")} <b className="mono">{s.orbit.periKm} {tr("km")}</b><input type="range" min={20} max={200} step={5} value={s.orbit.periKm} onChange={(e) => vm.setParam('periKm', +e.target.value)} /></label>
        {s.orbit.kind === 'elliptic' && <label className="slider">{tr("Apolune")} <b className="mono">{s.orbit.apoKm} {tr("km")}</b><input type="range" min={s.orbit.periKm} max={400} step={2} value={s.orbit.apoKm} onChange={(e) => vm.setParam('apoKm', +e.target.value)} /></label>}
        {s.orbit.kind === 'low' && <label className="slider">{tr("Inclinaison")} <b className="mono">{s.orbit.incDeg}°</b><input type="range" min={0} max={90} step={1} value={s.orbit.incDeg} onChange={(e) => vm.setParam('incDeg', +e.target.value)} /></label>}</>}</Panel></div>}
    right={<div className="stack2"><GmatPanel orbit={s.orbit} dryMassKg={t.massKg} />
      <Panel title={tr("Retours en direct")} icon="target"><KV rows={[[tr('Période'), `${fmt(om.periodS / 60, 2)} min`, 'clock'], [tr('Couverture des pôles'), `${Math.round(om.polarCoverage * 100)} %`, 'target'], [tr('Ombre max.'), `${fmt(om.eclipseMin, 1)} min`, 'battery'],
        ['Communications', `${Math.round(om.commsFrac * 100)} % du temps`, 'comms'], [tr('Δv requis / dispo.'), `${om.dvRequired} / ${t.dvMs} m/s`, 'propulsion'], [tr('Marge de masse'), `${fmt(cap - mass)} kg`, 'mass'], [tr('Vitesse au périlune'), `${fmt(om.vPeri, 3)} km/s`, 'orbit']]} /></Panel>
      <Panel title={tr("Rapport de risque")} icon="alert">{issues.length ? <ul className="issues">{issues.map((i) => <li key={i.code} className={`iss iss--${i.severity === 'error' ? 'err' : 'warn'}`}><Icon name="alert" /><div><strong>{tr(i.title)}</strong><p>{tr(i.detail)}</p><span className="mono">{tr(i.value)}</span></div></li>)}</ul> : <p className="ok-line"><Icon name="check" /> {tr("Aucune contrainte bloquante.")}</p>}</Panel>
      <Panel title={tr("Message d'Elias")} icon="log">{s.eliasOpen ? <Lines lines={ELIAS_UNFINISHED} /> : <p className="muted">{tr("Maya a retrouvé un enregistrement inachevé.")}</p>}<button className="btn2 btn2--ghost btn2--sm" onClick={vm.toggleElias}>{s.eliasOpen ? tr('Refermer') : tr('Écouter (facultatif)')}</button></Panel></div>}
    banner={errs.length > 0 && <AlertBanner kind="block" title={tr("Aucun lancement possible")}>{errs.map((e) => e.title).join(' · ')}</AlertBanner>}
    bottom={<><Gauge icon="mass" label={tr("Masse / capacité")} value={`${fmt(mass)} / ${cap}`} unit={tr("kg")} ratio={cap ? mass / cap : 1} level={levelOf(cap ? mass / cap : 2, 0.9, 1.0001)} />
      <Gauge icon="propulsion" label={tr("Carburant (Δv)")} value={`${t.dvMs}`} unit={`/ ${om.dvRequired} m/s`} ratio={om.dvRequired / Math.max(1, t.dvMs)} level={levelOf(om.dvRequired / Math.max(1, t.dvMs), 0.92, 1.0001)} />
      <Gauge icon="comms" label={tr("Comms")} value={`${Math.round(om.commsFrac * 100)}`} unit="%" ratio={om.commsFrac} />
      <Gauge icon="money" label={tr("Budget")} value={fmt(cost)} unit={`/ ${budget} ${sb ? 'M$' : 'M€'}`} ratio={cost / budget} level={levelOf(cost / budget, 0.9, 1.0001)} />
      <div className="bottom-a">{s.error && <span role="alert" className="action-why">{tr(s.error)}</span>}<ActionButton id="launch" onClick={vm.requestLaunch} disabled={!avail.ok} reason={tr(avail.reason)}><Icon name="rocket" size={14} /> {tr("Lancer")}</ActionButton></div>
      {s.confirm && <ConfirmModal title={tr("Confirmer le lancement")} irreversible busy={s.busy} confirmLabel={tr("Lancer la mission")} onCancel={vm.cancel} onConfirm={vm.confirmLaunch}
        extra={<label className="chk"><input type="checkbox" checked={s.checkpoint} onChange={vm.toggleCheckpoint} /> {tr("Créer un point de reprise « Avant le lancement »")}</label>}>
        <p>{tr(lv.label)} · {tr(ORBIT_PRESETS[s.orbit.kind].label)} ({s.orbit.periKm} × {s.orbit.apoKm} {tr("km,")} {s.orbit.incDeg}°).</p>
        <p>{tr("Une fois le lancement engagé,")} <strong>{tr("la conception est verrouillée")}</strong> {tr(": seules les opérations et les manœuvres resteront possibles.")}</p>
        {issues.length > 0 && <p className="muted">{tr("Risques acceptés :")} {issues.map((i) => i.title).join(', ')}.</p>}</ConfirmModal>}</>} />;
}
