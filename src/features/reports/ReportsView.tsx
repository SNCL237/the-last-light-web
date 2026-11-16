import { useEffect } from 'react';
import { useViewModel } from '../../core/useViewModel';
import type { ReportSummary } from '../../domain/ports';
import { ENDINGS } from '../../domain/script';
import { Icon } from '../../ui/Icon';
import { Panel, RadarChart } from '../../ui/kit';
import { maxOf, pct, ReportsViewModel, type SortKey } from './ReportsViewModel';
import { t, locale, tmap } from '../../i18n';

const OBJ: Record<string, string> = tmap({ mapping: 'Cartographie polaire', ice: 'Recherche de glace', thermal: 'Analyse thermique', composition: 'Composition de surface' });
const ORB: Record<string, string> = tmap({ polar: 'Polaire', low: 'Circulaire basse', elliptic: 'Elliptique' });
const date = (r: ReportSummary) => (r.at ? new Date(r.at).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' }) : t('Date inconnue'));
const title = (r: ReportSummary) => ENDINGS[r.ending as keyof typeof ENDINGS]?.title ?? r.ending;

function Detail({ r }: { r: ReportSummary }) {
  const cats = Object.keys(r.categories);
  return <Panel title={t("Détail du rapport")} icon="target">
    <p className="rep-end">{title(r)}</p>
    <p className="big-num">{r.score}<small>/ {r.scale ?? 100} · {Math.round(pct(r) * 100)} % · {r.source === 'serveur' ? t('calcul serveur') : t('calcul local')}</small></p>
    {cats.length >= 3 && <RadarChart axes={cats.map((c) => ({ label: t(c), value: Math.min(1, r.categories[c] / maxOf(r, c)) }))} />}
    <ul className="rep-bars">{cats.map((c) => { const v = Math.min(1, r.categories[c] / maxOf(r, c)); return <li key={c}><span>{t(c)}</span><div className="ticks" aria-hidden="true">{Array.from({ length: 20 }, (_, k) => <i key={k} className={k < v * 20 ? 'on' : ''} />)}</div><b className="mono">{r.categories[c]} / {maxOf(r, c)}</b></li>; })}</ul>
    <p className="muted">{t("Objectif principal :")} {OBJ[r.primary] ?? r.primary}{r.orbit ? ` · ${t('orbite')} ${ORB[r.orbit] ?? r.orbit}` : ''}{r.finalState ? ` · ${t('état final')} ${t(r.finalState === 'stable' ? 'stable' : r.finalState === 'degraded' ? 'dégradé' : 'perdu')}` : ''}</p>
  </Panel>;
}
function Compare({ a, b }: { a: ReportSummary; b: ReportSummary }) {
  const cats = [...new Set([...Object.keys(a.categories), ...Object.keys(b.categories)])];
  const cell = (r: ReportSummary, c: string) => (r.categories[c] === undefined ? '—' : `${Math.round((r.categories[c] / maxOf(r, c)) * 100)} %`);
  const delta = (c: string) => (a.categories[c] === undefined || b.categories[c] === undefined ? null : Math.round((b.categories[c] / maxOf(b, c) - a.categories[c] / maxOf(a, c)) * 100));
  return <Panel title={t("Comparaison côte à côte")} icon="layers" className="rep-compare">
    <p className="muted">{t("Valeurs en pourcentage de chaque catégorie : un rapport local (sur 100) et un rapport serveur (sur 1000) restent comparables.")}</p>
    <table className="tbl"><thead><tr><th scope="col">{t("Catégorie")}</th><th scope="col">A · {date(a)}</th><th scope="col">B · {date(b)}</th><th scope="col">{t("B − A")}</th></tr></thead>
      <tbody>{cats.map((c) => { const d = delta(c); return <tr key={c}><th scope="row">{t(c)}</th><td>{cell(a, c)}</td><td>{cell(b, c)}</td><td className={d === null ? '' : d >= 0 ? 'better' : 'worse'}>{d === null ? '—' : `${d >= 0 ? '+' : ''}${d} pts`}</td></tr>; })}
        <tr><th scope="row">{t("Total")}</th><td>{Math.round(pct(a) * 100)} %</td><td>{Math.round(pct(b) * 100)} %</td><td>{`${Math.round((pct(b) - pct(a)) * 100) >= 0 ? '+' : ''}${Math.round((pct(b) - pct(a)) * 100)} pts`}</td></tr>
        <tr><th scope="row">{t("Fin")}</th><td>{title(a)}</td><td>{title(b)}</td><td /></tr>
        <tr><th scope="row">{t("Objectif principal")}</th><td>{OBJ[a.primary] ?? a.primary}</td><td>{OBJ[b.primary] ?? b.primary}</td><td /></tr></tbody></table>
  </Panel>;
}

export function ReportsView({ vm }: { vm: ReportsViewModel }) {
  const s = useViewModel(vm); useEffect(() => { void vm.init(); }, [vm]);
  const list = vm.sorted(); const sel = vm.get(s.selected); const [ca, cb] = s.compare.map((id) => vm.get(id));
  return <main className="page">
    <header className="page-top"><a href="#/" className="word">{t("THE LAST LIGHT")}<span>{t("Rapports & comparaison")}</span></a><a className="btn2 btn2--ghost btn2--sm" href="#/"><Icon name="x" size={13} /> {t("Retour au menu")}</a></header>
    <div className="page-body">
      <div className="page-head"><h1>{t("Rapports de mission")}</h1><p className="muted">{t("Chaque mission terminée laisse un rapport. Sélectionnez-en deux pour les comparer.")}</p></div>
      {s.serverNote && <p className="page-msg page-msg--warn" role="status"><Icon name="alert" size={13} /> {t(s.serverNote)}</p>}
      {s.status === 'loading' && <p className="mono" role="status">{t("Lecture des rapports…")}</p>}
      {s.status === 'error' && <p className="page-msg page-msg--warn" role="alert">{t(s.error)}</p>}
      {s.status === 'ready' && list.length === 0 && <section className="glass rep-empty"><h2>{t("Aucun rapport pour l'instant")}</h2>
        <p className="muted">{t("Un rapport apparaît ici à la fin de chaque mission (Acte VI). Il garde la fin obtenue, le score par catégorie et vos choix principaux.")}</p>
        <div className="row2"><a className="btn2 btn2--primary" href="#/mode">{t("Nouvelle mission")}</a><a className="btn2 btn2--ghost" href="#/campagne/reprendre">{t("Reprendre la campagne")}</a></div></section>}
      {s.status === 'ready' && list.length > 0 && <div className="rep-grid">
        <section className="glass rep-list"><header className="glass-h"><h2><Icon name="log" size={14} />{list.length} {t("rapport")}{list.length > 1 ? 's' : ''}</h2>
          <div className="seg" role="radiogroup" aria-label={t("Trier par")}>{(['date', 'score', 'ending'] as SortKey[]).map((k) => <button key={k} role="radio" aria-checked={s.sort === k} className={`seg-i${s.sort === k ? ' is-on' : ''}`} onClick={() => vm.setSort(k)}>{{ date: 'Date', score: 'Score', ending: t('Fin') }[k]}</button>)}</div></header>
          <div className="rep-scroll"><table className="tbl rep-table"><thead><tr><th scope="col"><span className="sr">{t("Comparer")}</span></th><th scope="col">{t("Date")}</th><th scope="col">{t("Fin")}</th><th scope="col">{t("Score")}</th><th scope="col">{t("Objectif")}</th><th scope="col">{t("Source")}</th></tr></thead>
            <tbody>{list.map((r) => <tr key={r.id + r.at} className={s.selected === r.id ? 'is-on' : ''} onClick={() => vm.select(r.id)}>
              <td onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Comparer le rapport du ${date(r)}`} checked={s.compare.includes(r.id)} onChange={() => vm.toggleCompare(r.id)} /></td>
              <td><button className="rep-link" onClick={() => vm.select(r.id)}>{date(r)}</button></td><td>{title(r)}</td>
              <td className="mono">{r.score}/{r.scale ?? 100}<small className="muted"> · {Math.round(pct(r) * 100)} %</small></td><td>{OBJ[r.primary] ?? r.primary}</td>
              <td><span className={`tag2${r.source === 'serveur' ? '' : ' tag2--local'}`}>{r.source === 'serveur' ? t('Serveur') : 'Local'}</span></td></tr>)}</tbody></table></div>
          <p className="muted">{s.compare.length < 2 ? (s.compare.length ? t('Cochez 1 rapport pour comparer.') : t('Cochez 2 rapports pour comparer.')) : t('Comparaison affichée ci-dessous.')}</p></section>
        {sel && <Detail r={sel} />}
        {ca && cb && <Compare a={ca} b={cb} />}
      </div>}
    </div>
  </main>;
}
