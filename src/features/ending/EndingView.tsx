import { useEffect } from 'react';
import { useViewModel } from '../../core/useViewModel';
import { LAUNCHERS, ORBIT_PRESETS } from '../../domain/mission';
import { CRISIS_OPTIONS, objectiveAchievement, score, totals } from '../../domain/sim';
import { ENDINGS } from '../../domain/script';
import { Icon } from '../../ui/Icon';
import { ActionButton, fmt, KV, Panel, RadarChart, TrendChart } from '../../ui/kit';
import { Shell } from '../../ui/Shell';
import { Loading } from '../mission/Loading';
import { EndingViewModel } from './EndingViewModel';
import { t as tr, locale, tmap, tf } from '../../i18n';

const OBJ: Record<string, string> = tmap({ mapping: 'Cartographie polaire', ice: 'Recherche de glace', thermal: 'Analyse thermique', composition: 'Composition de surface' });
const SECTIONS = [['summary', 'Résumé'], ['science', 'Science'], ['tech', 'Technique'], ['data', 'Données'], ['decisions', 'Décisions'], ['score', 'Score'], ['lessons', 'Leçons']] as const;
const FS = tmap({ stable: 'stable', degraded: 'dégradé durable', loss: 'perte irrécupérable' } as const);

export function EndingView({ vm }: { vm: EndingViewModel }) {
  const s = useViewModel(vm); useEffect(() => { void vm.init(); }, [vm]);
  if (s.status !== 'ready' || !s.mission?.crisis?.finalState) return <Loading s={s} retry={vm.retry} />;
  const m = s.mission; const cr = s.mission.crisis; const fs = s.mission.crisis.finalState; const ending = m.ending ?? 'fragment'; const E = ENDINGS[ending]; const sc = vm.lines(); const total = vm.total(); const scale = vm.scale(); const recos = vm.recommendations();
  const t = totals(m.config, m.launch?.orbit); const lv = LAUNCHERS.find((l) => l.id === m.launch?.launcherId); const h = m.ops.history;
  const objs = [m.profile.primary, ...m.profile.secondaries];

  if (vm.step === 'ending') {
    const lines = E.lines; const done = s.line >= lines.length;
    return <div className={`ending ending--${ending}`}><div className="ending-in">
      <p className="mono">{tr("Fin attribuée par la simulation ·")} {FS[fs]}</p><h1>{tr(E.title)}</h1><p className="ending-r">{tr(E.result)}</p>
      <div className="lines" aria-live="polite">{lines.slice(0, s.line + 1).map((l) => <p key={l.speaker} className="line2"><span className="who">{tr(l.speaker)}</span>{tr(l.text)}</p>)}</div>
      {done && <p className="ending-i">{tr(E.impression)}</p>}
      <div className="row2">{!done && <button className="btn2 btn2--ghost" onClick={vm.nextLine}>{tr("Avancer")}</button>}<button className="btn2 btn2--primary" onClick={vm.toFinal} autoFocus={done}>{done ? tr('Continuer') : tr('Passer')}</button></div></div></div>;
  }
  if (vm.step === 'final') {
    return <div className={`ending ending--${ending}`}><div className="ending-in">
      <h1>{tr(E.title)}</h1><p className="big-num">{total}<small>/ {scale}</small></p><p className="ending-i">{tr("«")} {tr(E.conclusion)} {tr("»")}</p>
      <p className="muted">{tr("Une autre stratégie aurait-elle changé la mission ?")}</p>
      <ul className="unlocks">{m.archiveRead && <li><Icon name="check" size={12} /> {tr("Archive « Marges » d'Elias débloquée")}</li>}{ending === 'legacy' && <li><Icon name="check" size={12} /> {tr("Variante de dialogue : la fierté de Maya")}</li>}<li><Icon name="check" size={12} /> {tr("Rapport archivé pour comparaison")}</li></ul>
      <div className="row2 wrap">{m.checkpoints.map((c) => <button key={c.id} className="btn2 btn2--ghost" onClick={() => void vm.replay(c.id)}><Icon name="clock" size={12} /> {tr("Rejouer :")} {tr(c.label)}</button>)}
        <button className="btn2 btn2--ghost" onClick={() => vm.go('/campagne/acte-6/rapport')}>{tr("Consulter le rapport")}</button><a className="btn2 btn2--ghost" href="#/mode">{tr("Nouvelle campagne")}</a><a className="btn2 btn2--primary" href="#/">{tr("Menu principal")}</a></div></div></div>;
  }

  const prev = s.previous.find((p) => p.id === s.compareId);
  const axes = sc.map((l) => ({ label: tr(l.category), value: l.points / l.max }));
  const decisions: [string, string, string][] = [
    [tr('Acte I'), `${tr('Objectif principal :')} ${OBJ[m.profile.primary]} ; ${tr('instrument d’Elias :')} ${{ keep: tr('conservé'), drop: tr('écarté'), defer: tr('reporté') }[m.profile.elias]}`, tr('Fixe les instruments et les critères de réussite.')],
    [tr('Acte II'), tf('Configuration v{v} : {w} W de panneaux, {wh} Wh de batterie', { v: m.configVersion, w: fmt(t.solarW, 0), wh: t.batteryWh }), m.peakHandled ? tr('Le pire cas énergétique était couvert : la crise a moins pesé.') : tr('Le pire cas n’était pas couvert : la marge a manqué pendant la crise.')],
    ...m.acceptances.map((a) => [tr('Acte II'), `${tr('Avertissement accepté :')} ${a.code} (${a.value})`, tr('Risque connu, tracé avec la version de configuration.')] as [string, string, string]),
    [tr('Acte III'), `${tr(lv?.label ?? '')} · ${tr(ORBIT_PRESETS[m.launch?.orbit.kind ?? 'polar'].label)} ${m.launch?.orbit.periKm} × ${m.launch?.orbit.apoKm} km`, tr(`Ombre et maintien d’orbite fixés pour toute la mission.`)],
    [tr('Acte V'), `${tr('Décision :')} ${cr.options.map((o) => tr(CRISIS_OPTIONS.find((x) => x.id === o)?.label)).join(' + ')}`, tf('État final {a} (prévu : {b}).', { a: FS[fs], b: FS[cr.predicted.finalState] })],
  ];
  return <Shell act={6} step={tr("Rapport final")} save={s.save} wide
    left={<Panel title={tr("Sections")} icon="log"><ul className="rail2">{SECTIONS.map(([id, l]) => <li key={id}><a className={`rail-i${s.section === id ? ' is-on' : ''}`} href={`#/campagne/acte-6/rapport`} onClick={(e) => { e.preventDefault(); vm.setSection(id); document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><span className="rail-t">{tr(l)}</span></a></li>)}</ul></Panel>}
    right={<div className="stack2"><Panel title={tr("Profil de performance")} icon="target"><RadarChart axes={axes} /><p className="big-num">{total}<small>/ {scale}{scale === 1000 ? tr(' · calcul serveur') : ''}</small></p></Panel>
      <Panel title={tr("Comparer")} icon="layers">{s.previous.length ? <><select className="field" value={s.compareId ?? ''} onChange={(e) => vm.setCompare(e.target.value || null)} aria-label={tr("Rapport antérieur")}><option value="">{tr("Choisir un rapport antérieur…")}</option>{s.previous.map((p) => <option key={p.id + p.at} value={p.id}>{new Date(p.at).toLocaleDateString(locale())} · {tr(ENDINGS[p.ending as keyof typeof ENDINGS]?.title)} · {p.score}</option>)}</select>
        {prev && <table className="tbl"><thead><tr><th scope="col">{tr("Catégorie")}</th><th scope="col">{tr("Actuel")}</th><th scope="col">{tr("Antérieur")}</th></tr></thead><tbody>{sc.map((l) => <tr key={l.category}><th scope="row">{tr(l.category)}</th><td>{l.points}</td><td>{prev.categories[l.category] ?? '—'}</td></tr>)}<tr><th scope="row">{tr("Total")}</th><td>{total}</td><td>{prev.score}</td></tr></tbody></table>}</> : <p className="muted">{tr("Aucun rapport antérieur : rejouez pour comparer.")}</p>}</Panel></div>}
    center={<div className="report">
      <Panel title={tr("Résumé de mission")} icon="target" id="sec-summary"><KV rows={[[tr('Objectif principal'), OBJ[m.profile.primary], 'target'], [tr('Secondaires'), m.profile.secondaries.map((o) => OBJ[o]).join(', ') || tr('aucun (choix volontaire)'), 'layers'], [tr('Lanceur / orbite'), `${tr(lv?.label ?? '')} · ${m.launch?.orbit.periKm} × ${m.launch?.orbit.apoKm} km, ${m.launch?.orbit.incDeg}°`, 'rocket'], [tr('Durée'), `${m.ops.cycle} ${tr('cycles')}`, 'clock'], [tr('État final'), FS[fs], 'orbit'], [tr('Fin'), E.title, 'log']]} /></Panel>
      <Panel title={tr("Résultats scientifiques")} icon="payload" id="sec-science"><ul className="objs">{objs.map((o, i) => { const a = vm.achievement(o); return <li key={o}><span>{OBJ[o]}{i === 0 && <small> {tr("· principal")}</small>}</span><div className="ticks" aria-hidden="true">{Array.from({ length: 20 }, (_, k) => <i key={k} className={k < a * 20 ? 'on' : ''} />)}</div><b className="mono">{a >= 0.8 ? tr('Atteint') : a >= 0.4 ? tr('Partiel') : tr('Non atteint')} · {Math.round(a * 100)} %</b></li>; })}</ul></Panel>
      <Panel title={tr("Performances techniques")} icon="power" id="sec-tech"><KV rows={[[tr('Masse'), `${fmt(t.massKg)} kg / ${lv?.capacityKg} kg`, 'mass'], ['Budget', `${fmt(t.costM + (lv?.costM ?? 0))} ${tr('M€')}`, 'money'], [tr('Panneaux / batterie'), `${t.solarW} W / ${t.batteryWh} Wh`, 'battery'], ['Incidents', tf('{a} indices, {b} fenêtre(s) manquée(s)', { a: h.filter((c) => c.clue).length, b: h.filter((c) => c.missedWindow).length }), 'alert']]} />
        <TrendChart label={tr("Batterie sur la mission")} unit={tr("Wh")} series={[{ name: tr('Batterie (Wh)'), values: [t.batteryWh, ...h.map((c) => c.batteryAfter)], cls: 'c-acc' }]} /></Panel>
      <Panel title={tr("Gestion des données")} icon="storage" id="sec-data"><KV rows={[[tr('Générées'), `${fmt(m.ops.produced)} ${tr('Go')}`, 'storage'], [tr('Transmises'), `${fmt(m.ops.transmitted)} ${tr('Go')}`, 'comms'], [tr('Restées à bord'), `${fmt(m.ops.storageGb)} ${tr('Go')}`, 'storage'], [tr('Perdues'), `${fmt(m.ops.lost)} ${tr('Go')}`, 'alert']]} /></Panel>
      <Panel title={tr("Décisions déterminantes · cause → effet")} icon="clock" id="sec-decisions"><ol className="timeline">{decisions.map(([a, d, e], i) => <li key={i}><span className="mono">{a}</span><strong>{d}</strong><span className="eff">→ {e}</span></li>)}</ol></Panel>
      <Panel title={tr("Score par catégorie")} icon="target" id="sec-score"><p className="muted">{tr("Le score ne compense jamais une contrainte bloquante : aucune n'a pu être ignorée au lancement.")}</p>
        <table className="tbl"><tbody>{sc.map((l) => <tr key={l.category}><th scope="row">{tr(l.category)}</th><td className="mono">{l.points} / {l.max}</td><td>{l.why.map((w) => tr(w)).join(' ')}</td></tr>)}</tbody></table></Panel>
      <Panel title={tr("Conclusion et leçons")} icon="log" id="sec-lessons"><p><strong>{tr(E.title)}.</strong> {tr(E.impression)}</p><ul className="lessons"><li>{tr(E.conclusion)}</li>{!m.peakHandled && <li>{tr("Le pire cas énergétique (demandes simultanées dans l'ombre) méritait une marge.")}</li>}{m.ops.lost > 0 && <li>{fmt(m.ops.lost)} {tr("Go perdus : débit ou mémoire sous-dimensionnés.")}</li>}<li>{tr("Une configuration lançable peut rester risquée en exploitation.")}</li>{recos.map((r) => <li key={r}>{r}</li>)}</ul>{m.server?.bilan?.missionsReelles?.length ? <p className="muted">{tr("Missions réelles comparables :")} {m.server.bilan.missionsReelles.join(', ')}.</p> : null}</Panel>
    </div>}
    bottom={<><div className="score-strip">{sc.map((l) => <span key={l.category}><small>{tr(l.category)}</small><b>{l.points}</b>/{l.max}</span>)}</div><div className="bottom-a"><ActionButton id="end" onClick={vm.toEnding}>{tr("Fin narrative")}</ActionButton></div></>} />;
}
