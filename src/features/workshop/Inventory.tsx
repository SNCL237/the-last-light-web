import { useSyncExternalStore } from 'react';
import { comp } from '../../domain/sim';
import { SUBSYSTEMS, type Component } from '../../domain/mission';
import { sceneStore } from '../../scene/sceneStore';
import { Icon } from '../../ui/Icon';
import { fmt, Panel } from '../../ui/kit';
import type { WorkshopViewModel } from './WorkshopViewModel';
import { t } from '../../i18n';

const usePartHover = () => useSyncExternalStore(sceneStore.subscribe, sceneStore.getPartHover);
const power = (c: Component) => (c.solarW ? `+${fmt(c.solarW, 0)} W` : c.powerW ? `${fmt(c.powerW)} W` : '—');

/** Panneau Inventaire : composants installés, sous-totaux par sous-système, totaux (serveur en mode connecté). */
export function InventoryPanel({ vm, sort, totals }: { vm: WorkshopViewModel; sort: 'mass' | 'cost' | 'power'; totals: { massKg: number; costM: number; consumedW: number; producedW: number; local: boolean } }) {
  const groups = vm.inventory(); const hover = usePartHover(); const count = groups.reduce((a, g) => a + g.items.length, 0);
  const rel = groups.reduce((a, g) => a * g.reliability, 1); const cur = totals.local ? 'M€' : 'M$';
  return <Panel title={`Inventaire · ${count} composant${count > 1 ? 's' : ''}`} icon="layers" className="inv">
    {count === 0 ? <p className="muted">{t("Aucun composant installé. Ouvrez le catalogue, ou appliquez le preset recommandé.")}</p> : <>
      <div className="inv-sort"><span className="muted">{t("Trier par")}</span><div className="seg" role="radiogroup" aria-label={t("Trier l'inventaire")}>{(['mass', 'cost', 'power'] as const).map((k) =>
        <button key={k} role="radio" aria-checked={sort === k} className={`seg-i${sort === k ? ' is-on' : ''}`} onClick={() => vm.setInvSort(k)}>{{ mass: t('Masse'), cost: 'Coût', power: t('Puissance') }[k]}</button>)}</div></div>
      <div className="inv-scroll"><table className="tbl inv-table">
        <thead><tr><th scope="col">{t("Composant")}</th><th scope="col">{t("Masse")}</th><th scope="col">{t("Puiss.")}</th><th scope="col">{t("Coût")}</th><th scope="col">{t("Fiab.")}</th><th scope="col"><span className="sr">{t("Actions")}</span></th></tr></thead>
        {groups.filter((g) => g.items.length).map((g) => { const ss = SUBSYSTEMS.find((x) => x.id === g.sub)!;
          return <tbody key={g.sub}>
            <tr className="inv-group"><th scope="rowgroup" colSpan={6}><Icon name={g.sub} size={12} /> {t(ss.label)}<span className="mono">{fmt(g.massKg)} {t("kg ·")} {g.solarW ? `+${fmt(g.solarW, 0)} W` : `${fmt(g.powerW)} W`} · {fmt(g.costM)} {cur}</span></th></tr>
            {g.items.map((c) => <tr key={c.id} className={hover?.id === c.id ? 'is-hot' : ''} onMouseEnter={() => vm.focusPart(c.id)} onMouseLeave={() => vm.focusPart(null)} onFocus={() => vm.focusPart(c.id)} onBlur={() => vm.focusPart(null)}>
              <th scope="row"><button className="inv-name" onClick={() => vm.openFromInventory(c.id)} title={t("Ouvrir la fiche")}>{t(c.name)}</button></th>
              <td className="mono">{fmt(c.massKg)} {t("kg")}</td><td className="mono">{power(c)}</td><td className="mono">{fmt(c.costM)} {cur}</td><td className="mono">{Math.round(c.reliability * 100)} %</td>
              <td><button className="ic ic--sm" onClick={() => vm.remove(c.id)} aria-label={`Retirer ${c.name}`} title={t("Retirer")}><Icon name="x" size={12} /></button></td></tr>)}
          </tbody>; })}
        <tfoot><tr><th scope="row">{t("Total")}{totals.local ? '' : ' (serveur)'}</th><td className="mono">{fmt(totals.massKg)} {t("kg")}</td><td className="mono">{fmt(totals.consumedW)} W</td><td className="mono">{fmt(totals.costM)} {cur}</td><td className="mono">{Math.round(rel * 100)} %</td><td /></tr></tfoot>
      </table></div>
      <p className="muted">{t("Production moyenne d'orbite :")} {fmt(totals.producedW)} {t("W pour")} {fmt(totals.consumedW)} {t("W consommés. La fiabilité totale est le produit des fiabilités : chaque composant ajouté la fait baisser.")}{totals.local ? '' : t(' Le total serveur inclut le carburant et le lanceur choisi.')}</p>
    </>}
  </Panel>;
}

/** Fiche technique flottante, ancrée sur la pièce survolée dans la vue éclatée. */
export function PartCard({ cur }: { cur: string }) {
  const hover = usePartHover(); const c = hover ? comp(hover.id) : undefined;
  if (!hover || !c) return null;
  // Côté opposé au centre de l'écran : la fiche ne recouvre jamais le corps de l'orbiteur.
  const left = Math.min(Math.max(hover.x < window.innerWidth / 2 ? hover.x - 258 : hover.x + 18, 12), window.innerWidth - 252); const top = Math.min(Math.max(hover.y - 40, 70), window.innerHeight - 190);
  return <div className="part-card glass" style={{ left, top }} role="status">
    <strong>{t(c.name)}</strong><span className="muted">{t(SUBSYSTEMS.find((x) => x.id === c.subsystem)?.label)}</span>
    <dl><div><dt>{t("Masse")}</dt><dd>{fmt(c.massKg)} {t("kg")}</dd></div><div><dt>{t("Puissance")}</dt><dd>{power(c)}</dd></div><div><dt>{t("Coût")}</dt><dd>{fmt(c.costM)} {cur}</dd></div><div><dt>{t("Fiabilité")}</dt><dd>{Math.round(c.reliability * 100)} %</dd></div>
      {c.batteryWh ? <div><dt>{t("Capacité")}</dt><dd>{c.batteryWh} {t("Wh")}</dd></div> : null}{c.dataGbPerDay ? <div><dt>{t("Données")}</dt><dd>{c.dataGbPerDay} {t("Go/j")}</dd></div> : null}</dl>
  </div>;
}
