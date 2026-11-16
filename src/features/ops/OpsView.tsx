import { useEffect } from 'react';
import { useViewModel } from '../../core/useViewModel';
import { COMPONENTS } from '../../domain/mission';
import type { InstrumentId } from '../../domain/profile';
import { MAX_WINDOWS, OBJECTIVE_INSTRUMENTS } from '../../domain/sim';
import { GmatPanel } from '../../ui/Gmat';
import { Icon } from '../../ui/Icon';
import { ActionButton, AlertBanner, Bars, Consequence, fmt, Gauge, KV, levelOf, Panel, SystemBadge, TrendChart, type SysState } from '../../ui/kit';
import { Shell } from '../../ui/Shell';
import { Loading } from '../mission/Loading';
import { OpsViewModel } from './OpsViewModel';
import { t, tmap } from '../../i18n';
const TT = t;

const OBJ: Record<string, string> = tmap({ mapping: 'Cartographie polaire', ice: 'Recherche de glace', thermal: 'Analyse thermique', composition: 'Composition de surface' });
const INS: Record<InstrumentId, string> = tmap({ camera: 'Caméra HR', neutron: 'Spectromètre neutronique', thermal: 'Imageur thermique', radar: 'Radar (Elias)' });

export function OpsView({ vm }: { vm: OpsViewModel }) {
  const s = useViewModel(vm); useEffect(() => { void vm.init(); }, [vm]);
  if (s.status !== 'ready' || !s.mission?.launch) return <Loading s={s} retry={vm.retry} />;
  const m = s.mission; const orbit = s.mission.launch.orbit; const cap = vm.capacity(); const h = m.ops.history; const last = h.at(-1); const crit = vm.critical;
  const sf = last?.solarFactor ?? 1; const trendE = (a?: number, b?: number) => (a === undefined || b === undefined ? 'flat' : b > a + 1 ? 'up' : b < a - 1 ? 'down' : 'flat') as 'up' | 'down' | 'flat';
  const power: SysState = sf < 0.7 ? 'critical' : sf < 0.95 ? 'degraded' : 'ok';
  const fc = vm.forecast; const pa = vm.planAvailability();
  const journal = h.flatMap((c) => [{ t: `Cycle ${c.n}`, text: `Énergie ${c.energyIn} / ${c.energyOut} Wh · ${c.produced} ${t('Go')} produits, ${c.transmitted} transmis${c.lost ? `, ${c.lost} perdus` : ''}` }, ...(c.clue ? [{ t: `Cycle ${c.n}`, text: `Indice : ${c.clue}` }] : [])]);
  const batt = [cap.batteryWh, ...h.map((c) => c.batteryAfter)]; const stor = [0, ...h.map((c) => c.storageAfter)];
  const bottomGauges = <>
    <Gauge icon="battery" label={t("Énergie (batterie)")} value={fmt(m.ops.batteryWh, 0)} unit={`/ ${cap.batteryWh} Wh`} ratio={m.ops.batteryWh / cap.batteryWh} level={m.ops.batteryWh < cap.batteryWh * 0.35 ? 'crit' : m.ops.batteryWh < cap.batteryWh * 0.6 ? 'low' : 'ok'} />
    <Gauge icon="storage" label={t("Stockage")} value={fmt(m.ops.storageGb)} unit={`/ ${cap.storageGb} ${t('Go')}`} ratio={m.ops.storageGb / cap.storageGb} level={levelOf(m.ops.storageGb / cap.storageGb, 0.7, 0.95)} />
    <Gauge icon="comms" label={t("Transmis")} value={fmt(m.ops.transmitted)} unit={t("Go")} />
    <Gauge icon="clock" label={t("Temps")} value={`${t('J+')}${m.ops.cycle}`} unit={t("cycles")} />
  </>;
  const sysRows: [string, SysState, 'up' | 'down' | 'flat'][] = [[t('Énergie'), power, sf < 1 ? 'down' : 'flat'], [t('Batterie'), m.ops.batteryWh < cap.batteryWh * 0.35 ? 'critical' : m.ops.batteryWh < cap.batteryWh * 0.6 ? 'degraded' : 'ok', trendE(batt.at(-2), batt.at(-1))],
    [t('Thermique'), (last?.n ?? 0) >= 4 ? 'degraded' : 'ok', (last?.n ?? 0) >= 4 ? 'up' : 'flat'], ['Communications', last?.missedWindow ? 'degraded' : 'ok', 'flat'], [t('Stockage'), m.ops.storageGb > cap.storageGb * 0.8 ? 'degraded' : 'ok', trendE(stor.at(-2), stor.at(-1))], [t('Pointage'), 'ok', 'flat']];
  const left = <Panel title={t("Systèmes")} icon="layers"><ul className="sys">{sysRows.map(([n, st, tr]) => <li key={n}><span>{n}</span><SystemBadge state={st} trend={tr} /></li>)}</ul>
    <Bars label={t("Production solaire par cycle")} values={Array.from({ length: 20 }, (_, i) => (i < h.length ? h[i].energyIn - h[i].energyOut : 0))} highlight={h.length - 1} />
    <p className="muted mono">{t("Bilan énergétique par cycle (Wh)")}</p></Panel>;

  if (vm.step === 'summary' && last) {
    return <Shell act={4} step={`Bilan du cycle ${last.n}`} save={s.save} journal={journal} left={left}
      banner={crit ? <AlertBanner kind="crit" title={t("Seuil critique atteint")}>{t("Production en chute, réserve en baisse. Les opérations sont suspendues jusqu'à votre décision.")}</AlertBanner> : s.interrupted ? <AlertBanner kind="warn" title={t(s.interrupted)} /> : undefined}
      right={<div className="stack2"><Panel title={t("Avant / après")} icon="orbit"><Consequence rows={[
        { label: t('Batterie'), before: `${fmt(last.batteryBefore, 0)} Wh`, after: `${fmt(last.batteryAfter, 0)} Wh`, worse: last.batteryAfter < last.batteryBefore },
        { label: t('Stockage'), before: `${fmt((h.at(-2)?.storageAfter) ?? 0)} ${t('Go')}`, after: `${fmt(last.storageAfter)} ${t('Go')}`, worse: last.storageAfter > (h.at(-2)?.storageAfter ?? 0) },
        { label: t('Production solaire'), before: '100 %', after: `${Math.round(last.solarFactor * 100)} %`, worse: last.solarFactor < 1 }]} /></Panel>
        <Panel title={t("Chaîne du cycle")} icon="target"><ol className="chain"><li><Icon name="target" size={13} /> {t("Observation :")} {last.obsHours} h · {last.instruments.map((i) => INS[i]).join(', ') || t('aucun instrument')}</li><li><Icon name="power" size={13} /> {t("Consommation :")} {fmt(last.energyOut, 0)} {t("Wh pour")} {fmt(last.energyIn, 0)} {t("Wh produits")}</li>
          <li><Icon name="storage" size={13} /> {t("Données :")} {last.produced} {t("Go produites")}</li><li><Icon name="comms" size={13} /> {t("Transmission :")} {last.transmitted} {t("Go")}{last.missedWindow ? t(' (une fenêtre manquée)') : ''}{last.lost ? ` · ${last.lost} ${t('Go')} perdus` : ''}</li></ol>
          {last.clue && <AlertBanner kind="warn" title={t("Indice d'anomalie")}>{t(last.clue)}</AlertBanner>}</Panel></div>}
      bottom={<>{bottomGauges}<div className="bottom-a">{!crit && <button className="btn2 btn2--ghost" onClick={() => vm.go('/campagne/acte-4/planificateur')}>{t("Planifier le suivant")}</button>}
        <ActionButton id="next" onClick={vm.next} kind={crit ? 'danger' : 'primary'}>{crit ? t('Ouvrir l’alerte critique') : t('Retour au contrôle')}</ActionButton></div></>} />;
  }

  if (vm.step === 'planner') {
    const installed = COMPONENTS.filter((c) => m.config.includes(c.id) && c.instrument).map((c) => c.instrument as InstrumentId);
    return <Shell act={4} step={t("Planificateur de cycle")} save={s.save} journal={journal} left={left}
      right={<div className="stack2"><Panel title={t("Mode")} icon="control"><div className="seg seg--in" role="radiogroup" aria-label={t("Mode de planification")}>{(['manual', 'semi', 'auto'] as const).map((md) => <button key={md} role="radio" aria-checked={m.ops.mode === md} className={`seg-i${m.ops.mode === md ? ' is-on' : ''}`} onClick={() => vm.setMode(md)}>{{ manual: t('Manuel'), semi: 'Semi-auto', auto: t('Automatique') }[md]}</button>)}</div>
        <p className="muted">{{ manual: t('Vous réglez chaque paramètre.'), semi: t('Le plan suggéré tient compte du débit et des réserves.'), auto: t('Répète le plan sur n cycles ; s’interrompt à toute alerte ou indice.') }[m.ops.mode]}</p></Panel>
        <Panel title={t("Instruments actifs")} icon="payload">{installed.map((i) => <label key={i} className="chk"><input type="checkbox" checked={s.plan.instruments.includes(i)} onChange={() => vm.toggleInstrument(i)} /> {INS[i]}</label>)}
          {vm.serverMode ? <p className="muted">{t("Durée d'observation fixée par le serveur (4 h par jour).")}</p>
            : <label className="slider">{t("Durée d'observation")} <b className="mono">{s.plan.obsHours} h</b><input type="range" min={0} max={12} value={s.plan.obsHours} onChange={(e) => vm.setObs(+e.target.value)} /></label>}</Panel>
        {vm.serverMode ? <Panel title={t("Transmission")} icon="comms"><label className="chk"><input type="checkbox" checked={s.plan.txWindows > 0} onChange={(e) => vm.toggleWindow(e.target.checked ? 1 : 0)} /> {t("Transmettre vers le réseau sol aujourd'hui")}</label>
          <p className="muted mono">{t("Contact ≈ 6 h/j · 100 Mbit/s (profil serveur)")}</p></Panel>
          : <Panel title={t("Fenêtres de transmission")} icon="comms"><div className="windows" role="group" aria-label={t("Fenêtres de communication (24 h)")}>{Array.from({ length: MAX_WINDOWS }, (_, i) => <button key={i} className={`win${i < s.plan.txWindows ? ' is-on' : ''}`} aria-pressed={i < s.plan.txWindows} onClick={() => vm.toggleWindow(i < s.plan.txWindows ? i : i + 1)}>{String(2 + i * 4).padStart(2, '0')}:00</button>)}</div>
          <p className="muted mono">{s.plan.txWindows} {t("× 1 h ·")} {cap.downlinkMbps} {t("Mbit/s ·")} {fmt((cap.downlinkMbps * 3600 * s.plan.txWindows) / 8000)} {t("Go")}</p></Panel>}</div>}
      center={<div className="center-cards">{vm.serverMode ? <Panel title={t("État serveur avant exécution")} icon="clock" className="wide-card">
        <KV rows={[[t('Jour simulé'), `${vm.serverEtat?.jour ?? 0} / ${vm.serverEtat?.limiteJours ?? 30}`, 'clock'], [t('Batterie'), `${fmt(m.ops.batteryWh, 0)} / ${cap.batteryWh} Wh`, 'battery'], [t('Stockage à bord'), `${fmt(m.ops.storageGb)} / ${cap.storageGb} ${t('Go')}`, 'storage'], [t('Transmis à ce jour'), `${fmt(m.ops.transmitted)} ${t('Go')}`, 'comms']]} />
        <TrendChart label={t("Batterie par jour")} unit={t("Wh")} series={[{ name: t('Batterie (Wh)'), values: batt, cls: 'c-acc' }]} threshold={{ value: cap.batteryWh * 0.2, label: t('seuil critique') }} />
        <p className="muted">{t("Le serveur ne fournit pas d'aperçu avant exécution : chaque cycle est un jour simulé par lui (autorité).")}</p></Panel> : <Panel title={t("Prévision avant exécution")} icon="clock" className="wide-card">
        <KV rows={[[t('Énergie produite'), `${fmt(fc.energyIn, 0)} Wh`, 'power'], [t('Énergie consommée'), `${fmt(fc.energyOut, 0)} Wh`, 'power'], [t('Batterie après'), `${fmt(fc.batteryAfter, 0)} / ${cap.batteryWh} Wh`, 'battery'], [t('Données produites'), `${fc.produced} ${t('Go')}`, 'storage'], [t('Transmission possible'), `${fc.transmitted} ${t('Go')}`, 'comms'], [t('Stockage après'), `${fc.storageAfter} / ${cap.storageGb} ${t('Go')}`, 'storage'], ...(fc.lost ? [[t('Données perdues'), `${fc.lost} ${t('Go')}`, 'alert'] as [string, string, string]] : [])]} />
        <TrendChart label={t("Batterie : historique et prévision")} unit={t("Wh")} series={[{ name: t('Batterie'), values: [...batt, fc.batteryAfter], cls: 'c-acc', dashedFrom: batt.length - 1 }]} threshold={{ value: cap.batteryWh * 0.35, label: t('seuil critique') }} />
        <p className="muted">{t("Prévision avec la production prévue ; l'état réel peut différer (dégradations non détectées).")}</p></Panel>}</div>}
      bottom={<>{bottomGauges}<div className="bottom-a">
        {m.ops.mode === 'auto' && <label className="slider slider--inline">n = <b className="mono">{s.ffN}</b><input type="range" min={1} max={5} value={s.ffN} onChange={(e) => vm.setFF(+e.target.value)} aria-label={t("Nombre de cycles")} /></label>}
        {m.ops.mode === 'auto' && <ActionButton id="ff" kind="ghost" onClick={vm.fastForward} disabled={!pa.ok} busy={s.busy}><Icon name="ff" size={12} /> {t("Avance rapide")}</ActionButton>}
        <ActionButton id="exec" onClick={vm.execute} disabled={!pa.ok} reason={t(pa.reason)} busy={s.busy}>{t("Exécuter le cycle")}</ActionButton></div></>} />;
  }

  const clues = h.filter((c) => c.clue);
  return <Shell act={4} step={t("Contrôle de mission")} save={s.save} journal={journal} left={left}
    banner={crit ? <AlertBanner kind="crit" title={t("Alerte critique")} action={<button className="btn2 btn2--danger btn2--sm" onClick={vm.next}>{t("Ouvrir l'alerte")}</button>} /> : clues.length > 0 ? <AlertBanner kind="warn" title={`Indice : ${clues.at(-1)!.clue}`} /> : undefined}
    right={<div className="stack2"><GmatPanel orbit={orbit} dryMassKg={cap.massKg} compact />
      <Panel title={t("Opérations")} icon="log"><div className="seg seg--in" role="tablist">{(['plan', 'journal', 'objectives'] as const).map((t) => <button key={t} role="tab" aria-selected={s.tab === t} className={`seg-i${s.tab === t ? ' is-on' : ''}`} onClick={() => vm.setTab(t)}>{TT({ plan: 'Plan', journal: 'Journal', objectives: 'Objectifs' }[t])}</button>)}</div>
        {s.tab === 'plan' && <KV rows={[['Instruments', s.plan.instruments.map((i) => INS[i]).join(', ') || '—', 'payload'], ['Observation', `${s.plan.obsHours} h / cycle`, 'clock'], [t('Fenêtres'), `${s.plan.txWindows} / ${MAX_WINDOWS}`, 'comms'], ['Mode', { manual: t('Manuel'), semi: 'Semi-auto', auto: t('Automatique') }[m.ops.mode], 'control']]} />}
        {s.tab === 'journal' && (journal.length ? <ol className="journal">{journal.slice(-6).map((j, i) => <li key={i}><span>{j.t}</span>{t(j.text)}</li>)}</ol> : <p className="muted">{t("Premier cycle à planifier.")}</p>)}
        {s.tab === 'objectives' && <ul className="objs">{[m.profile.primary, ...m.profile.secondaries].map((o, i) => { const a = vm.achievement(o);
          return <li key={o}><span>{OBJ[o]}{i === 0 && <small> {t("· principal")}</small>}</span><div className="ticks" aria-hidden="true">{Array.from({ length: 20 }, (_, k) => <i key={k} className={k < a * 20 ? 'on' : ''} />)}</div><b className="mono">{Math.round(a * 100)} %</b><small className="muted">{OBJECTIVE_INSTRUMENTS[o].map((x) => INS[x]).join(', ')}</small></li>; })}</ul>}</Panel></div>}
    center={<div className="center-bottom"><Panel title={t("Énergie et stockage")} icon="power" className="chart-card"><TrendChart label={t("Batterie par cycle")} unit={t("Wh")} series={[{ name: t('Batterie (Wh)'), values: batt, cls: 'c-acc' }]} threshold={{ value: cap.batteryWh * 0.35, label: t('seuil critique') }} />
      <TrendChart label={t("Stockage par cycle")} unit={t("Go")} series={[{ name: t('Stockage (Go)'), values: stor, cls: 'c-info' }]} threshold={{ value: cap.storageGb, label: t('capacité') }} /></Panel></div>}
    bottom={<>{bottomGauges}<div className="bottom-a"><ActionButton id="plan" onClick={crit ? vm.next : vm.openPlanner} kind={crit ? 'danger' : 'primary'}>{crit ? t('Ouvrir l’alerte') : t('Planifier le cycle')}</ActionButton></div></>} />;
}
