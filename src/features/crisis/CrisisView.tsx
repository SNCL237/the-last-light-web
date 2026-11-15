import { useEffect } from 'react';
import { useViewModel } from '../../core/useViewModel';
import { parts, CRISIS_OPTIONS } from '../../domain/sim';
import { CRISIS_VOICES, ELIAS_FINAL, RESOLUTION_MAYA } from '../../domain/script';
import { Icon } from '../../ui/Icon';
import { ActionButton, AlertBanner, ConfirmModal, Consequence, fmt, Gauge, KV, Lines, Panel, SystemBadge, TradeoffTable, TrendChart } from '../../ui/kit';
import { Shell } from '../../ui/Shell';
import { Loading } from '../mission/Loading';
import { CrisisViewModel } from './CrisisViewModel';

const FS = { stable: 'Stable', degraded: 'Dégradé durable', loss: 'Perte irrécupérable' } as const;

export function CrisisView({ vm }: { vm: CrisisViewModel }) {
  const s = useViewModel(vm); useEffect(() => { void vm.init(); }, [vm]);
  if (s.status !== 'ready' || !s.mission?.launch) return <Loading s={s} retry={vm.retry} />;
  const m = s.mission; const cap = vm.capacity(); const h = m.ops.history; const last = h.at(-1)!; const hrs = vm.hours;
  const deficit = last ? last.energyOut - last.energyIn : 0;
  const gauges = <><Gauge icon="battery" label="Énergie" value={fmt(m.ops.batteryWh, 0)} unit={`/ ${cap.batteryWh} Wh`} ratio={m.ops.batteryWh / cap.batteryWh} level={m.ops.batteryWh < cap.batteryWh * 0.35 ? 'crit' : m.ops.batteryWh < cap.batteryWh * 0.6 ? 'low' : 'ok'} />
    <Gauge icon="power" label="Production / conso." value={`${fmt(last?.energyIn ?? 0, 0)} / ${fmt(last?.energyOut ?? 0, 0)}`} unit="Wh/j" level={deficit > 0 ? 'crit' : 'ok'} />
    <Gauge icon="storage" label="Stockage" value={fmt(m.ops.storageGb)} unit={`/ ${cap.storageGb} Go`} ratio={m.ops.storageGb / cap.storageGb} />
    <Gauge icon="clock" label="Délai avant seuil" value={hrs === null ? 'Aucun' : `${fmt(hrs)} h`} level={hrs !== null && hrs < 48 ? 'crit' : 'ok'} hint="Au bilan actuel ; le temps est figé pendant votre décision" /></>;
  const frozen = <span className="frozen"><Icon name="pause" size={12} /> Temps figé pendant la décision</span>;

  if (vm.step === 'alert') return <Shell act={5} step="Alerte critique" mood="crisis" save={s.save}
    banner={<AlertBanner kind="crit" title={deficit > 0 ? 'Marge énergétique critique' : 'Anomalie énergétique détectée'}>Production solaire à {Math.round(last.solarFactor * 100)} % · {deficit > 0 ? `déficit de ${fmt(deficit, 0)} Wh par cycle` : 'bilan encore positif, marge réduite'} · prochaine fenêtre de communication différée.</AlertBanner>}
    center={<div className="center-cards"><Panel title="Situation" icon="alert" className="wide-card crisis-card">
      <p className="big-num">{hrs === null ? '—' : `${fmt(hrs)} h`}<small>{hrs === null ? 'Aucun seuil prévu au rythme actuel' : 'avant le seuil de décharge profonde'}</small></p>
      <TrendChart label="Production et consommation par cycle" unit="Wh" series={[{ name: 'Production', values: h.map((c) => c.energyIn), cls: 'c-info' }, { name: 'Consommation', values: h.map((c) => c.energyOut), cls: 'c-acc' }]} />{frozen}</Panel></div>}
    bottom={<>{gauges}<div className="bottom-a"><ActionButton id="diag" onClick={vm.toDiagnostic} kind="danger">Ouvrir le diagnostic</ActionButton></div></>} />;

  if (vm.step === 'diagnostic') {
    const cs = parts(m.config).filter((c) => c.powerW > 0);
    return <Shell act={5} step="Diagnostic" mood="crisis" save={s.save} wide
      left={<Panel title="Santé des composants" icon="layers"><ul className="sys">{[['Panneaux solaires', last.solarFactor < 0.7 ? 'critical' : 'degraded'], ['Batterie', m.ops.batteryWh < cap.batteryWh * 0.35 ? 'critical' : 'degraded'], ['Régulateur thermique', 'degraded'], ['Émetteur', 'ok'], ['Ordinateur', 'ok'], ['Pointage', 'ok']].map(([n, st]) => <li key={n}><span>{n}</span><SystemBadge state={st as 'ok'} /></li>)}</ul></Panel>}
      center={<div className="center-cards"><Panel title="Tendances" icon="power" className="wide-card"><TrendChart label="Batterie" unit="Wh" series={[{ name: 'Batterie (Wh)', values: [cap.batteryWh, ...h.map((c) => c.batteryAfter)], cls: 'c-acc' }]} threshold={{ value: cap.batteryWh * 0.1, label: 'décharge profonde' }} />
        <TrendChart label="Stockage" unit="Go" series={[{ name: 'Stockage (Go)', values: [0, ...h.map((c) => c.storageAfter)], cls: 'c-info' }]} threshold={{ value: cap.storageGb, label: 'capacité' }} />{frozen}</Panel></div>}
      right={<div className="stack2"><Panel title="Consommation par sous-système" icon="power"><table className="tbl"><thead><tr><th scope="col">Composant</th><th scope="col">W</th><th scope="col">Wh / cycle</th></tr></thead>
        <tbody><tr><th scope="row">Chauffage et avionique (bus)</th><td>{160 + 25}</td><td>{fmt(185 * 24, 0)}</td></tr>{cs.map((c) => { const hrs2 = c.slot === 'instrument' ? last.obsHours : c.slot === 'radio' ? last.txWindows : 24;
          return <tr key={c.id}><th scope="row">{c.name}</th><td>{c.powerW}</td><td>{fmt(c.powerW * hrs2, 0)}</td></tr>; })}</tbody></table></Panel>
        <Panel title="Fenêtre de communication" icon="comms"><KV rows={[['Prochaine fenêtre', 'différée de 4 h', 'clock'], ['Débit', `${cap.downlinkMbps} Mbit/s`, 'comms'], ['À bord', `${fmt(m.ops.storageGb)} Go non transmis`, 'storage'], ['Transmis à ce jour', `${fmt(m.ops.transmitted)} Go`, 'check']]} /></Panel></div>}
      bottom={<>{gauges}<div className="bottom-a"><ActionButton id="arb" onClick={vm.toArbitration} kind="danger">Passer à l&apos;arbitrage</ActionButton></div></>} />;
  }

  if (vm.step === 'arbitration') {
    const p = vm.predicted;
    return <Shell act={5} step="Arbitrage" mood="crisis" save={s.save}
      left={<Panel title="Options d'urgence" icon="alert"><ul className="crisis-opts">{CRISIS_OPTIONS.map((o) => { const why = vm.reason(o.id); const on = s.chosen.includes(o.id);
        return <li key={o.id}><label className={`opt${on ? ' is-on' : ''}${why ? ' is-off' : ''}`}><input type="checkbox" checked={on} disabled={!!why} onChange={() => vm.toggle(o.id)} /><span><strong>{o.label}</strong>{why && <small className="why"><Icon name="x" size={11} /> {why}</small>}</span></label></li>; })}</ul>
        <Lines lines={CRISIS_VOICES} /></Panel>}
      right={<div className="stack2"><Panel title="Je sauve / je perds" icon="target"><TradeoffTable rows={CRISIS_OPTIONS.map((o) => ({ key: o.id, label: o.label, save: o.save, lose: o.lose, on: s.chosen.includes(o.id) }))} /></Panel>
        <Panel title="Effets prévus" icon="clock">{p ? <><Consequence rows={[
          { label: 'État prévu', before: 'Crise', after: FS[p.finalState], worse: p.finalState === 'loss' },
          { label: 'Batterie minimale', before: `${fmt(m.ops.batteryWh, 0)} Wh`, after: `${fmt(p.batteryMin, 0)} Wh`, worse: p.batteryMin < m.ops.batteryWh },
          { label: 'Données transmises (fin)', before: `${fmt(m.ops.transmitted)} Go`, after: `${fmt(m.ops.transmitted + p.transmitted)} Go`, worse: false }]} />
          <p className="muted">Prévision à production constante. Le moteur calculera l&apos;effet réel, dégradations comprises.</p></> : <p className="muted">{vm.serverMode ? (s.chosen.length ? 'Le serveur calculera l\u2019effet réel après votre décision ; il ne fournit pas de prévision (une seule décision possible).' : 'Choisissez une option : le serveur en accepte une par crise.') : 'Choisissez une ou plusieurs options compatibles.'}</p>}</Panel></div>}
      bottom={<>{gauges}<div className="bottom-a">{s.error && <span role="alert" className="action-why">{s.error}</span>}<ActionButton id="decide" onClick={vm.requestDecision} disabled={!s.chosen.length} reason="Choisissez au moins une option." kind="danger">Appliquer la décision</ActionButton></div>
        {s.confirm && (p || vm.serverMode) && <ConfirmModal title="Décision de crise" irreversible busy={s.busy} confirmLabel="Appliquer" onCancel={vm.cancel} onConfirm={vm.decide}>
          <p>Options : <strong>{s.chosen.map((c) => CRISIS_OPTIONS.find((o) => o.id === c)?.label).join(' + ')}</strong>.</p>
          <p>Systèmes sacrifiés : {s.chosen.filter((c) => c !== 'continue').map((c) => CRISIS_OPTIONS.find((o) => o.id === c)?.lose).join(' ; ') || 'aucun'}.</p>
          <p>{p ? <>État prévu : <strong>{FS[p.finalState]}</strong>. </> : <>L&apos;effet sera calculé par le serveur. </>}Aucune option n&apos;est la seule bonne : c&apos;est un compromis.</p></ConfirmModal>}</>} />;
  }

  const c = m.crisis; if (!c?.finalState || !c.computed) return <Loading s={{ status: 'loading' }} retry={vm.retry} />;
  return <Shell act={5} step="Résolution" mood={c.finalState === 'loss' ? 'crisis' : 'normal'} save={s.save}
    banner={<AlertBanner kind={c.finalState === 'loss' ? 'crit' : c.finalState === 'degraded' ? 'warn' : 'info'} title={`État final verrouillé : ${FS[c.finalState]}`} />}
    right={<div className="stack2"><Panel title={c.serverOnly ? 'Effet calculé par le serveur' : 'Prévu / calculé'} icon="target">{!c.serverOnly && <Consequence rows={[
      { label: 'État', before: FS[c.predicted.finalState], after: FS[c.finalState], worse: c.finalState !== c.predicted.finalState && c.finalState === 'loss' },
      { label: 'Données transmises', before: `${fmt(c.predicted.transmitted)} Go`, after: `${fmt(c.computed.transmitted)} Go`, worse: c.computed.transmitted < c.predicted.transmitted }]} />}
      <KV rows={[['Systèmes affectés', c.options.map((o) => CRISIS_OPTIONS.find((x) => x.id === o)?.label).join(', '), 'layers'], ['Données sauvées', `${fmt(m.ops.transmitted)} Go`, 'check'], ['Données perdues', `${fmt(m.ops.lost)} Go`, 'alert'], ['Cycles tenus après la décision', `${c.computed.daysSurvived}`, 'clock'], ['Batterie minimale', `${fmt(c.computed.batteryMin, 0)} Wh`, 'battery']]} /></Panel></div>}
    center={<div className="center-cards"><Panel title={m.archiveRead ? 'Message final d’Elias' : 'Maya'} icon="log" className="wide-card archive">
      {m.archiveRead ? <Lines lines={[...ELIAS_FINAL, { speaker: 'Maya', text: RESOLUTION_MAYA[c.finalState] }]} /> : <><Lines lines={[{ speaker: 'Maya', text: RESOLUTION_MAYA[c.finalState] }]} /><p className="muted">Une archive d&apos;Elias n&apos;a pas été consultée : son message reste fragmenté.</p></>}</Panel></div>}
    bottom={<>{gauges}<div className="bottom-a">{s.error && <span role="alert" className="action-why">{s.error}</span>}<ActionButton id="report" onClick={vm.toReport}>Débriefing de mission</ActionButton></div></>} />;
}
