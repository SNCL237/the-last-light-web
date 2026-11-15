import { useEffect } from 'react';
import { useViewModel } from '../../core/useViewModel';
import { BUDGET_M, LAUNCHERS, SUBSYSTEMS } from '../../domain/mission';
import { orbitMetrics } from '../../domain/orbit';
import { comp, subsystemCompleteness, totals } from '../../domain/sim';
import { ELIAS_ARCHIVE, SUBSYSTEM_INTROS } from '../../domain/script';
import { ORBIT_PRESETS } from '../../domain/mission';
import { Icon } from '../../ui/Icon';
import { ActionButton, AlertBanner, Consequence, fmt, Gauge, InfoModal, KV, levelOf, Lines, Panel, TrendChart } from '../../ui/kit';
import { Shell } from '../../ui/Shell';
import { Loading } from '../mission/Loading';
import { WorkshopViewModel } from './WorkshopViewModel';
import { InventoryPanel, PartCard } from './Inventory';

export function WorkshopView({ vm }: { vm: WorkshopViewModel }) {
  const s = useViewModel(vm); useEffect(() => { void vm.init(); }, [vm]);
  if (s.status !== 'ready' || !s.mission) return <Loading s={s} retry={vm.retry} />;
  const m = s.mission; const t = totals(m.config); const f = vm.figures(); const budgetCap = f.local ? BUDGET_M - LAUNCHERS[0].costM : f.budgetM; const done = subsystemCompleteness(m.config); const issues = vm.issues;
  const ss = SUBSYSTEMS.find((x) => x.id === s.subsystem)!;
  const insp = s.inspected ? comp(s.inspected) : undefined;
  const errs = issues.filter((i) => i.severity === 'error'); const warns = issues.filter((i) => i.severity === 'warning');
  const ownErr = (id: string) => issues.find((i) => i.componentId === id);
  const journal = m.acceptances.map((a) => ({ t: `v${a.configVersion}`, text: `Avertissement accepté : ${a.code} (${a.value})` }));

  const gauges = <>
    <Gauge icon="mass" label="Masse" value={fmt(f.massKg)} unit="kg" ratio={f.massKg / LAUNCHERS[1].capacityKg} level={levelOf(f.massKg / LAUNCHERS[1].capacityKg, 0.9, 1)} hint={`Référence : ${LAUNCHERS[1].label} (${LAUNCHERS[1].capacityKg} kg)`} />
    <Gauge icon="money" label="Budget" value={fmt(f.costM)} unit={`/ ${budgetCap} ${f.local ? 'M€' : 'M$'}`} ratio={f.costM / budgetCap} level={levelOf(f.costM / budgetCap, 0.85, 1)} hint={f.local ? 'Budget total moins le lanceur le moins cher' : 'Calcul serveur, lanceur compris s\u2019il est choisi'} />
    <Gauge icon="power" label="Puissance" value={done.power && Number.isFinite(f.powerRatio) ? `${Math.round(f.powerRatio * 100)}` : '—'} unit={done.power ? '% prod. moyenne' : ''} ratio={done.power ? f.powerRatio : 0} level={done.power ? levelOf(f.powerRatio, 0.9, 1) : 'ok'} hint="Consommation / production moyenne sur l'orbite (ombre comprise)" />
    <Gauge icon="storage" label={f.local ? 'Stockage' : 'Données'} value={f.local ? fmt(f.storageGb, 0) : fmt(f.dataGbPerDay)} unit={f.local ? `Go · ${fmt(t.dataGbPerDay)} Go/j` : 'Go/j générés'} ratio={f.local && f.storageGb ? Math.min(1, (f.dataGbPerDay * 2) / f.storageGb) : undefined} level={f.local && f.storageGb && f.storageGb < f.dataGbPerDay * 2 ? 'low' : 'ok'} />
  </>;

  if (s.step === 'validation') {
    const m0 = orbitMetrics(ORBIT_PRESETS.polar); const N = 24; const ecl = Math.round(N * m0.eclipseFrac);
    const peakW = f.local ? t.peakW : f.consumedW; const sunW = f.local ? t.solarW * 0.85 : f.producedW / (1 - m0.eclipseFrac);
    const prod = Array.from({ length: N }, (_, i) => (i < N - ecl ? sunW : 0));
    const avail = vm.validationAvailability();
    return <Shell act={2} step="Prévalidation" save={s.save} journal={journal} wide
      left={<Panel title="Résumé" icon="target"><KV rows={[['Erreurs', `${errs.length}`, 'alert'], ['Avertissements', `${warns.length}`, 'help'], ['Version', `v${m.configVersion}`, 'save'], ['Fiabilité', `${Math.round(t.reliability * 100)} %`, 'check'], ['Calcul', f.local ? 'aperçu local' : 'serveur (autorité)', 'save']]} />
        <button className="btn2 btn2--ghost" onClick={() => vm.backToDesign()}><Icon name="structure" /> Retour à l&apos;atelier</button></Panel>}
      right={<div className="stack2">
        <Panel title="Erreurs bloquantes" icon="alert">{errs.length ? <ul className="issues">{errs.map((i) => <li key={i.code + (i.subsystem ?? '')} className="iss iss--err"><Icon name="alert" /><div><strong>{i.title}</strong><p>{i.detail}</p>{i.value && <span className="mono">Valeur : {i.value}</span>}</div>
          <button className="btn2 btn2--ghost btn2--sm" onClick={() => vm.backToDesign(i.componentId ?? i.subsystem)}>Corriger</button></li>)}</ul> : <p className="ok-line"><Icon name="check" /> Aucune erreur bloquante.</p>}</Panel>
        <Panel title="Avertissements" icon="help">{warns.length ? <ul className="issues">{warns.map((i) => <li key={i.code} className="iss iss--warn"><Icon name="alert" /><div><strong>{i.title}</strong><p>{i.detail}</p><span className="mono">Gravité : avertissement · valeur : {i.value} · config v{m.configVersion}</span>
          <label className="chk"><input type="checkbox" checked={s.accepted.includes(i.code)} onChange={() => vm.toggleAccept(i.code)} /> J&apos;accepte ce risque en connaissance de cause</label></div>
          {i.componentId && <button className="btn2 btn2--ghost btn2--sm" onClick={() => vm.backToDesign(i.componentId)}>Corriger</button>}</li>)}</ul> : <p className="ok-line"><Icon name="check" /> Aucun avertissement.</p>}</Panel>
      </div>}
      center={<div className="center-cards">
        <Panel title="Scénario « pire cas » — une orbite polaire de 100 km" icon="power" className="wide-card">
          <TrendChart label="Puissance sur une orbite" unit="W" series={[{ name: 'Production', values: prod, cls: 'c-info' }, { name: 'Nominal', values: Array(N).fill(f.consumedW), cls: 'c-text' }, { name: f.local ? 'Pics simultanés' : 'Consommation (serveur)', values: Array(N).fill(peakW), cls: 'c-acc' }]} />
          <KV rows={[['Ombre', `${Math.round(m0.eclipseMin)} min / ${Math.round(m0.periodS / 60)} min`, 'clock'], ['Batterie installée', `${fmt(f.batteryWh, 0)} Wh`, 'battery'], ['Besoin minimal (ombre)', `${f.batteryNeedWh} Wh`, 'battery'], ...(f.local ? [['Besoin pire cas', `${f.batteryPeakNeedWh} Wh`, 'alert'] as [string, string, string]] : [['Source', 'calcul serveur (C3)', 'check'] as [string, string, string]])]} />
          {m.archiveRead && <p className="quote">{ELIAS_ARCHIVE.text}</p>}
        </Panel></div>}
      bottom={<>{gauges}<div className="bottom-a">{s.error && <span role="alert" className="action-why">{s.error}</span>}<ActionButton id="validate" onClick={vm.validateConfig} disabled={!avail.ok} reason={avail.reason} busy={s.busy}>Valider la configuration</ActionButton></div></>} />;
  }

  return <Shell act={2} step="Atelier spatial" save={s.save} journal={journal}
    banner={m.profile.elias === 'defer' && <AlertBanner kind="warn" title="Décision reportée : l'instrument d'Elias">Tranchez ici : installez ou non le radar dans « Charge utile ».</AlertBanner>}
    left={<Panel title="Sous-systèmes" icon="layers"><ul className="rail2" role="list">{SUBSYSTEMS.map((x) => {
      const owner = { structure: 'Maya', power: 'Maya', comms: 'Amara', control: 'Amara', payload: 'Noah', propulsion: 'Daniel' }[x.id];
      const err = issues.some((i) => i.subsystem === x.id && i.severity === 'error' && i.code !== 'INCOMPLET');
      return <li key={x.id}><button className={`rail-i${s.subsystem === x.id ? ' is-on' : ''}`} aria-pressed={s.subsystem === x.id} onClick={() => vm.selectSubsystem(x.id)}>
        <span className="rail-ic"><Icon name={x.id} /></span><span className="rail-t">{x.label}<small>{owner}</small></span>
        <span className={`dot ${done[x.id] ? (err ? 'dot--err' : 'dot--ok') : 'dot--off'}`} aria-label={done[x.id] ? (err ? 'erreur' : 'complet') : 'incomplet'}>{done[x.id] ? (err ? '!' : '✓') : '○'}</span></button></li>;
    })}</ul>
      <div className="row2"><button className="btn2 btn2--ghost btn2--sm" onClick={vm.undoLast} disabled={!s.undo.length}>Annuler</button><button className="btn2 btn2--ghost btn2--sm" onClick={vm.redoLast} disabled={!s.redo.length}>Rétablir</button><button className="btn2 btn2--ghost btn2--sm" onClick={vm.reset} disabled={!m.config.length}>Réinitialiser</button></div>
      <button className="btn2 btn2--ghost btn2--sm" onClick={vm.applyPreset}><Icon name="check" size={13} /> Preset recommandé (Guidé)</button>
      {m.archiveRead && <button className="btn2 btn2--ghost btn2--sm" onClick={vm.openArchive}><Icon name="log" size={13} /> Archive d&apos;Elias</button>}</Panel>}
    right={<div className="stack2">
      <div className="seg seg--in right-tabs" role="tablist" aria-label="Panneau de droite">{(['catalog', 'inventory'] as const).map((k) =>
        <button key={k} role="tab" aria-selected={s.rightTab === k} className={`seg-i${s.rightTab === k ? ' is-on' : ''}`} onClick={() => vm.setTab(k)}>{k === 'catalog' ? 'Catalogue' : `Inventaire · ${m.config.length}`}</button>)}</div>
      {s.rightTab === 'inventory' && <InventoryPanel vm={vm} sort={s.invSort} totals={{ massKg: f.massKg, costM: f.costM, consumedW: f.consumedW, producedW: f.producedW, local: f.local }} />}
      {s.rightTab === 'catalog' && <><Panel title={`Catalogue · ${ss.label}`} icon={ss.id} actions={<button className="ic ic--sm" onClick={vm.openIntro} aria-label={`À quoi sert : ${ss.label}`}><Icon name="help" size={14} /></button>}><p className="muted">{ss.why}</p>
        <ul className="cat">{vm.catalog().map((c) => { const on = vm.installed(c.id); const why = vm.reason(c); const e = ownErr(c.id);
          return <li key={c.id} className={`ccard${on ? ' is-on' : ''}${why ? ' is-off' : ''}${s.inspected === c.id ? ' is-focus' : ''}`}>
            <button className="ccard-main" onClick={() => vm.inspect(c.id)} aria-label={`Fiche : ${c.name}`}><strong>{c.name}</strong><span className="mono">{fmt(c.massKg)} kg · {c.powerW ? `${c.powerW} W · ` : ''}{c.solarW ? `+${c.solarW} W · ` : ''}{c.batteryWh ? `${c.batteryWh} Wh · ` : ''}{fmt(c.costM)} M€</span>
              {on && <span className="tag2"><Icon name="check" size={11} /> Installé</span>}{e && on && <span className="tag2 tag2--warn"><Icon name="alert" size={11} /> {e.title}</span>}</button>
            {why ? <span className="why" role="note"><Icon name="x" size={12} /> {why}</span> : <div className="row2">
              {on ? <button className="btn2 btn2--ghost btn2--sm" onClick={() => vm.remove(c.id)}>Retirer</button> : <button className="btn2 btn2--primary btn2--sm" onClick={() => vm.install(c.id)}>Installer</button>}
              <label className="chk chk--sm"><input type="checkbox" checked={s.compare.includes(c.id)} onChange={() => vm.toggleCompare(c.id)} />Comparer</label></div>}</li>; })}</ul></Panel>
      {insp && <Panel title="Fiche" icon="target"><h3 className="h3">{insp.name}</h3><p className="muted">{insp.desc}</p>
        <KV rows={[['Masse', `${fmt(insp.massKg)} kg`, 'mass'], ['Coût', `${fmt(insp.costM)} M€`, 'money'], ['Consommation', `${insp.powerW} W`, 'power'], ['Fiabilité', `${Math.round(insp.reliability * 100)} %`, 'check'],
          ...(insp.solarW ? [['Production', `${insp.solarW} W`, 'power'] as [string, string, string]] : []), ...(insp.batteryWh ? [['Capacité', `${insp.batteryWh} Wh`, 'battery'] as [string, string, string]] : []),
          ...(insp.downlinkMbps ? [['Débit', `${insp.downlinkMbps} Mbit/s`, 'comms'] as [string, string, string]] : []), ...(insp.storageGb ? [['Mémoire', `${insp.storageGb} Go`, 'storage'] as [string, string, string]] : []),
          ...(insp.dvMs ? [['Δv', `${insp.dvMs} m/s`, 'propulsion'] as [string, string, string]] : []), ...(insp.dataGbPerDay ? [['Données', `${insp.dataGbPerDay} Go/j`, 'storage'] as [string, string, string]] : [])]} /></Panel>}
      {s.compare.length > 1 && <Panel title="Comparer" icon="layers"><table className="tbl"><thead><tr><th scope="col">Critère</th>{s.compare.map((id) => <th key={id} scope="col">{comp(id)?.name}</th>)}</tr></thead>
        <tbody>{(['massKg', 'costM', 'powerW', 'reliability'] as const).map((k) => <tr key={k}><th scope="row">{{ massKg: 'Masse (kg)', costM: 'Coût (M€)', powerW: 'Conso. (W)', reliability: 'Fiabilité' }[k]}</th>{s.compare.map((id) => <td key={id}>{k === 'reliability' ? `${Math.round((comp(id)?.[k] ?? 0) * 100)} %` : fmt(comp(id)?.[k] ?? 0)}</td>)}</tr>)}</tbody></table></Panel>}
      {s.lastChange && <Panel title={s.lastChange.label} icon="orbit"><Consequence rows={[
        { label: 'Masse', before: `${fmt(s.lastChange.before.massKg)} kg`, after: `${fmt(s.lastChange.after.massKg)} kg`, worse: s.lastChange.after.massKg > s.lastChange.before.massKg },
        { label: 'Coût', before: `${fmt(s.lastChange.before.costM)} M€`, after: `${fmt(s.lastChange.after.costM)} M€`, worse: s.lastChange.after.costM > s.lastChange.before.costM },
        { label: 'Conso. nominale', before: `${fmt(s.lastChange.before.nominalW)} W`, after: `${fmt(s.lastChange.after.nominalW)} W`, worse: s.lastChange.after.nominalW > s.lastChange.before.nominalW },
        { label: 'Production moy.', before: `${fmt(s.lastChange.before.avgProdW)} W`, after: `${fmt(s.lastChange.after.avgProdW)} W`, worse: s.lastChange.after.avgProdW < s.lastChange.before.avgProdW }]} /></Panel>}</>}
    </div>}
    center={s.archiveOpen ? <div className="center-cards"><Panel title="Archive débloquée" icon="log" className="archive"><Lines lines={[ELIAS_ARCHIVE]} /><p className="muted">La note n&apos;explique pas encore toute la chaîne de défaillance.</p>
      <button className="btn2 btn2--primary" onClick={vm.readArchive}>Classer dans les archives</button></Panel></div> : <div className="orbiter-tag"><span className="mono" aria-hidden="true">TLL-ORBITER · {m.config.length} composants · v{m.configVersion}</span>
      <button className={`btn2 btn2--sm ${s.exploded ? 'btn2--primary' : 'btn2--ghost'}`} aria-pressed={s.exploded} onClick={vm.toggleExplode} disabled={!m.config.length}><Icon name="layers" size={13} /> {s.exploded ? 'Rassembler l\u2019orbiteur' : 'Vue éclatée'}</button>
      {s.exploded && <span className="muted">Survolez une pièce pour sa fiche ; survolez une ligne de l&apos;inventaire pour la repérer.</span>}<PartCard cur={f.local ? 'M€' : 'M$'} /></div>}
    bottom={<>{gauges}{s.intro && SUBSYSTEM_INTROS[s.intro] && (() => { const it = SUBSYSTEM_INTROS[s.intro as string]; const idx = SUBSYSTEMS.findIndex((x) => x.id === s.intro);
      return <InfoModal title={it.title} onClose={vm.closeIntro} footer={<label className="chk chk--sm"><input type="checkbox" checked={s.introMute} onChange={vm.toggleIntroMute} /> Ne plus afficher ces aides</label>}>
        <p className="intro-step mono">Sous-système {idx + 1} sur {SUBSYSTEMS.length}</p>
        <h3 className="intro-h">En quoi consiste cette étape</h3><p>{it.what}</p>
        <h3 className="intro-h">Pourquoi c&apos;est important</h3><p>{it.why}</p>
        <p className="intro-real"><Icon name="orbit" size={13} /> {it.real}</p>
        <p className="intro-tip"><Icon name="help" size={13} /> {it.tip}</p></InfoModal>; })()}<div className="bottom-a">{s.error && <span role="alert" className="action-why">{s.error}</span>}{s.busy && <span className="muted" role="status">Synchronisation serveur…</span>}<ActionButton id="prevalidate" onClick={vm.openValidation} disabled={s.save === 'saving'}>Prévalider <Icon name="play" size={12} /></ActionButton></div></>} />;
}
