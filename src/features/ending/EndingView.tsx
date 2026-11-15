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

const OBJ: Record<string, string> = { mapping: 'Cartographie polaire', ice: 'Recherche de glace', thermal: 'Analyse thermique', composition: 'Composition de surface' };
const SECTIONS = [['summary', 'Résumé'], ['science', 'Science'], ['tech', 'Technique'], ['data', 'Données'], ['decisions', 'Décisions'], ['score', 'Score'], ['lessons', 'Leçons']] as const;
const FS = { stable: 'stable', degraded: 'dégradé durable', loss: 'perte irrécupérable' } as const;

export function EndingView({ vm }: { vm: EndingViewModel }) {
  const s = useViewModel(vm); useEffect(() => { void vm.init(); }, [vm]);
  if (s.status !== 'ready' || !s.mission?.crisis?.finalState) return <Loading s={s} retry={vm.retry} />;
  const m = s.mission; const cr = s.mission.crisis; const fs = s.mission.crisis.finalState; const ending = m.ending ?? 'fragment'; const E = ENDINGS[ending]; const sc = vm.lines(); const total = vm.total(); const scale = vm.scale(); const recos = vm.recommendations();
  const t = totals(m.config, m.launch?.orbit); const lv = LAUNCHERS.find((l) => l.id === m.launch?.launcherId); const h = m.ops.history;
  const objs = [m.profile.primary, ...m.profile.secondaries];

  if (vm.step === 'ending') {
    const lines = E.lines; const done = s.line >= lines.length;
    return <div className={`ending ending--${ending}`}><div className="ending-in">
      <p className="mono">Fin attribuée par la simulation · {FS[fs]}</p><h1>{E.title}</h1><p className="ending-r">{E.result}</p>
      <div className="lines" aria-live="polite">{lines.slice(0, s.line + 1).map((l) => <p key={l.speaker} className="line2"><span className="who">{l.speaker}</span>{l.text}</p>)}</div>
      {done && <p className="ending-i">{E.impression}</p>}
      <div className="row2">{!done && <button className="btn2 btn2--ghost" onClick={vm.nextLine}>Avancer</button>}<button className="btn2 btn2--primary" onClick={vm.toFinal} autoFocus={done}>{done ? 'Continuer' : 'Passer'}</button></div></div></div>;
  }
  if (vm.step === 'final') {
    return <div className={`ending ending--${ending}`}><div className="ending-in">
      <h1>{E.title}</h1><p className="big-num">{total}<small>/ {scale}</small></p><p className="ending-i">« {E.conclusion} »</p>
      <p className="muted">Une autre stratégie aurait-elle changé la mission ?</p>
      <ul className="unlocks">{m.archiveRead && <li><Icon name="check" size={12} /> Archive « Marges » d&apos;Elias débloquée</li>}{ending === 'legacy' && <li><Icon name="check" size={12} /> Variante de dialogue : la fierté de Maya</li>}<li><Icon name="check" size={12} /> Rapport archivé pour comparaison</li></ul>
      <div className="row2 wrap">{m.checkpoints.map((c) => <button key={c.id} className="btn2 btn2--ghost" onClick={() => void vm.replay(c.id)}><Icon name="clock" size={12} /> Rejouer : {c.label}</button>)}
        <button className="btn2 btn2--ghost" onClick={() => vm.go('/campagne/acte-6/rapport')}>Consulter le rapport</button><a className="btn2 btn2--ghost" href="#/mode">Nouvelle campagne</a><a className="btn2 btn2--primary" href="#/">Menu principal</a></div></div></div>;
  }

  const prev = s.previous.find((p) => p.id === s.compareId);
  const axes = sc.map((l) => ({ label: l.category, value: l.points / l.max }));
  const decisions: [string, string, string][] = [
    ['Acte I', `Objectif principal : ${OBJ[m.profile.primary]} ; instrument d’Elias : ${{ keep: 'conservé', drop: 'écarté', defer: 'reporté' }[m.profile.elias]}`, 'Fixe les instruments et les critères de réussite.'],
    ['Acte II', `Configuration v${m.configVersion} : ${fmt(t.solarW, 0)} W de panneaux, ${t.batteryWh} Wh de batterie`, m.peakHandled ? 'Le pire cas énergétique était couvert : la crise a moins pesé.' : 'Le pire cas n’était pas couvert : la marge a manqué pendant la crise.'],
    ...m.acceptances.map((a) => ['Acte II', `Avertissement accepté : ${a.code} (${a.value})`, 'Risque connu, tracé avec la version de configuration.'] as [string, string, string]),
    ['Acte III', `${lv?.label} · ${ORBIT_PRESETS[m.launch?.orbit.kind ?? 'polar'].label} ${m.launch?.orbit.periKm} × ${m.launch?.orbit.apoKm} km`, `Ombre et maintien d’orbite fixés pour toute la mission.`],
    ['Acte V', `Décision : ${cr.options.map((o) => CRISIS_OPTIONS.find((x) => x.id === o)?.label).join(' + ')}`, `État final ${FS[fs]} (prévu : ${FS[cr.predicted.finalState]}).`],
  ];
  return <Shell act={6} step="Rapport final" save={s.save} wide
    left={<Panel title="Sections" icon="log"><ul className="rail2">{SECTIONS.map(([id, l]) => <li key={id}><a className={`rail-i${s.section === id ? ' is-on' : ''}`} href={`#/campagne/acte-6/rapport`} onClick={(e) => { e.preventDefault(); vm.setSection(id); document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><span className="rail-t">{l}</span></a></li>)}</ul></Panel>}
    right={<div className="stack2"><Panel title="Profil de performance" icon="target"><RadarChart axes={axes} /><p className="big-num">{total}<small>/ {scale}{scale === 1000 ? ' · calcul serveur' : ''}</small></p></Panel>
      <Panel title="Comparer" icon="layers">{s.previous.length ? <><select className="field" value={s.compareId ?? ''} onChange={(e) => vm.setCompare(e.target.value || null)} aria-label="Rapport antérieur"><option value="">Choisir un rapport antérieur…</option>{s.previous.map((p) => <option key={p.id + p.at} value={p.id}>{new Date(p.at).toLocaleDateString('fr-FR')} · {ENDINGS[p.ending as keyof typeof ENDINGS]?.title} · {p.score}</option>)}</select>
        {prev && <table className="tbl"><thead><tr><th scope="col">Catégorie</th><th scope="col">Actuel</th><th scope="col">Antérieur</th></tr></thead><tbody>{sc.map((l) => <tr key={l.category}><th scope="row">{l.category}</th><td>{l.points}</td><td>{prev.categories[l.category] ?? '—'}</td></tr>)}<tr><th scope="row">Total</th><td>{total}</td><td>{prev.score}</td></tr></tbody></table>}</> : <p className="muted">Aucun rapport antérieur : rejouez pour comparer.</p>}</Panel></div>}
    center={<div className="report">
      <Panel title="Résumé de mission" icon="target" id="sec-summary"><KV rows={[['Objectif principal', OBJ[m.profile.primary], 'target'], ['Secondaires', m.profile.secondaries.map((o) => OBJ[o]).join(', ') || 'aucun (choix volontaire)', 'layers'], ['Lanceur / orbite', `${lv?.label} · ${m.launch?.orbit.periKm} × ${m.launch?.orbit.apoKm} km, ${m.launch?.orbit.incDeg}°`, 'rocket'], ['Durée', `${m.ops.cycle} cycles`, 'clock'], ['État final', FS[fs], 'orbit'], ['Fin', E.title, 'log']]} /></Panel>
      <Panel title="Résultats scientifiques" icon="payload" id="sec-science"><ul className="objs">{objs.map((o, i) => { const a = vm.achievement(o); return <li key={o}><span>{OBJ[o]}{i === 0 && <small> · principal</small>}</span><div className="ticks" aria-hidden="true">{Array.from({ length: 20 }, (_, k) => <i key={k} className={k < a * 20 ? 'on' : ''} />)}</div><b className="mono">{a >= 0.8 ? 'Atteint' : a >= 0.4 ? 'Partiel' : 'Non atteint'} · {Math.round(a * 100)} %</b></li>; })}</ul></Panel>
      <Panel title="Performances techniques" icon="power" id="sec-tech"><KV rows={[['Masse', `${fmt(t.massKg)} kg / ${lv?.capacityKg} kg`, 'mass'], ['Budget', `${fmt(t.costM + (lv?.costM ?? 0))} M€`, 'money'], ['Panneaux / batterie', `${t.solarW} W / ${t.batteryWh} Wh`, 'battery'], ['Incidents', `${h.filter((c) => c.clue).length} indices, ${h.filter((c) => c.missedWindow).length} fenêtre(s) manquée(s)`, 'alert']]} />
        <TrendChart label="Batterie sur la mission" unit="Wh" series={[{ name: 'Batterie (Wh)', values: [t.batteryWh, ...h.map((c) => c.batteryAfter)], cls: 'c-acc' }]} /></Panel>
      <Panel title="Gestion des données" icon="storage" id="sec-data"><KV rows={[['Générées', `${fmt(m.ops.produced)} Go`, 'storage'], ['Transmises', `${fmt(m.ops.transmitted)} Go`, 'comms'], ['Restées à bord', `${fmt(m.ops.storageGb)} Go`, 'storage'], ['Perdues', `${fmt(m.ops.lost)} Go`, 'alert']]} /></Panel>
      <Panel title="Décisions déterminantes · cause → effet" icon="clock" id="sec-decisions"><ol className="timeline">{decisions.map(([a, d, e], i) => <li key={i}><span className="mono">{a}</span><strong>{d}</strong><span className="eff">→ {e}</span></li>)}</ol></Panel>
      <Panel title="Score par catégorie" icon="target" id="sec-score"><p className="muted">Le score ne compense jamais une contrainte bloquante : aucune n&apos;a pu être ignorée au lancement.</p>
        <table className="tbl"><tbody>{sc.map((l) => <tr key={l.category}><th scope="row">{l.category}</th><td className="mono">{l.points} / {l.max}</td><td>{l.why.join(' ')}</td></tr>)}</tbody></table></Panel>
      <Panel title="Conclusion et leçons" icon="log" id="sec-lessons"><p><strong>{E.title}.</strong> {E.impression}</p><ul className="lessons"><li>{E.conclusion}</li>{!m.peakHandled && <li>Le pire cas énergétique (demandes simultanées dans l&apos;ombre) méritait une marge.</li>}{m.ops.lost > 0 && <li>{fmt(m.ops.lost)} Go perdus : débit ou mémoire sous-dimensionnés.</li>}<li>Une configuration lançable peut rester risquée en exploitation.</li>{recos.map((r) => <li key={r}>{r}</li>)}</ul>{m.server?.bilan?.missionsReelles?.length ? <p className="muted">Missions réelles comparables : {m.server.bilan.missionsReelles.join(', ')}.</p> : null}</Panel>
    </div>}
    bottom={<><div className="score-strip">{sc.map((l) => <span key={l.category}><small>{l.category}</small><b>{l.points}</b>/{l.max}</span>)}</div><div className="bottom-a"><ActionButton id="end" onClick={vm.toEnding}>Fin narrative</ActionButton></div></>} />;
}
