import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ObjectiveId } from '../../domain/profile';
import { sceneStore } from '../../scene/sceneStore';
import { reducedMotion } from '../../domain/preferences';
import type { Explorer, LayerId, Probe } from '../../scene/moonExplorer';
import { t } from '../../i18n';

const LAYERS: { id: LayerId; label: string; swatch: string; hint: string }[] = [
  { id: 'ice', label: 'Glace probable', swatch: '#28aaff', hint: 'Cratères en ombre permanente où la glace d’eau peut être piégée' },
  { id: 'hydrogen', label: 'Hydrogène (type LEND)', swatch: 'linear-gradient(90deg,#5a3cc8,#78f0ff)', hint: 'Indice d’hydrogène du sol, plus fort vers les pôles' },
  { id: 'temperature', label: 'Température (type Diviner)', swatch: 'linear-gradient(90deg,#283cc8,#3cb4ff,#fae678,#ff8c28,#e63228)', hint: 'De 40 K dans l’ombre permanente à 390 K sous le Soleil' },
  { id: 'topo', label: 'Relief (type LOLA)', swatch: 'linear-gradient(90deg,#4628a0,#3c96aa,#e6d278,#f06e3c)', hint: 'Altitude relative' },
  { id: 'tracks', label: 'Traces d’observation', swatch: '#f26b1d', hint: 'Orbites polaires prévues et bandes observées au sol' },
  { id: 'grid', label: 'Grille sélénographique', swatch: '#b8b2ff', hint: 'Méridiens et parallèles tous les 15°' },
  { id: 'names', label: 'Noms', swatch: '#e9ecff', hint: 'Cratères et mers (coordonnées approximatives)' },
];
/** Couches mises en avant par chaque objectif scientifique. */
const BY_OBJECTIVE: Record<ObjectiveId, LayerId[]> = { ice: ['ice', 'hydrogen'], mapping: ['tracks', 'topo'], thermal: ['temperature'], composition: ['topo'] };
const BASE: Record<LayerId, boolean> = { ice: true, hydrogen: false, temperature: false, topo: false, tracks: true, grid: false, names: true };
const fmtC = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2).replace('.', ',')}° ${v >= 0 ? pos : neg}`;

export function MoonExplorer({ objectives, fallback }: { objectives: ObjectiveId[]; fallback: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null); const labels = useRef<HTMLDivElement>(null); const api = useRef<Explorer>();
  const [ok, setOk] = useState(() => document.documentElement.dataset.render !== '2d');
  const [layers, setLayers] = useState<Record<LayerId, boolean>>(BASE);
  const [probe, setProbe] = useState<Probe | null>(null); const [auto, setAuto] = useState(true); const [srcOpen, setSrcOpen] = useState(false);
  const [panel, setPanel] = useState(() => window.innerWidth >= 1100);
  const key = objectives.join(',');
  // Les objectifs choisis allument leurs couches (le joueur peut ensuite les éteindre).
  useEffect(() => { setLayers((l) => { const n = { ...l }; objectives.forEach((o) => BY_OBJECTIVE[o]?.forEach((id) => { n[id] = true; })); return n; }); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ok || !canvas.current || !labels.current) return;
    sceneStore.set({ view: 'hidden' }); let cancelled = false;
    const reduced = reducedMotion();
    import('../../scene/moonExplorer').then(({ startExplorer }) => { if (!cancelled && canvas.current && labels.current) { api.current = startExplorer(canvas.current, labels.current, setProbe, reduced); api.current.setLayers(layers); } })
      .catch(() => setOk(false));
    return () => { cancelled = true; api.current?.dispose(); api.current = undefined; sceneStore.set({ view: 'ambient' }); };
  }, [ok]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.current?.setLayers(layers); }, [layers]);
  if (!ok) return <>{fallback}</>;
  const toggle = (id: LayerId) => setLayers((l) => ({ ...l, [id]: !l[id] }));
  return <div className="mx">
    <canvas ref={canvas} className="mx-canvas" tabIndex={0} aria-label={t("Globe lunaire rotatif : glissez pour tourner, molette ou pincement pour zoomer, flèches du clavier")} />
    <div ref={labels} className="mx-labels" aria-hidden="true" />
    <header className="mx-head"><strong>{t("Atlas de mission · Lune")}</strong><span className="mono">{t("SÉLÉNOCENTRIQUE · 4096 × 2048 px · ≈ 2,7 km/px")}</span>
      <button className="mx-info" onClick={() => setSrcOpen((o) => !o)} aria-expanded={srcOpen}>{t("ⓘ Sources des données")}</button>
      {srcOpen && <p className="mx-src">{t("Face visible : photo NASA reprojetée. Pôles et face cachée : relief reconstitué. Couches illustratives inspirées de LEND, Diviner et LOLA (sonde LRO). Positions des cratères approximatives.")}</p>}</header>
    <div className="mx-views" role="group" aria-label={t("Vue")}>
      {([['near', t('Face visible')], ['south', t('Pôle Sud')], ['north', t('Pôle Nord')], ['far', t('Face cachée')]] as const).map(([v, l]) => <button key={v} className="btn2 btn2--ghost btn2--sm" onClick={() => { api.current?.view(v); setAuto(false); }}>{l}</button>)}
      <label className="chk chk--sm"><input type="checkbox" checked={auto} onChange={(e) => { setAuto(e.target.checked); api.current?.setAutoRotate(e.target.checked); }} /> {t("Rotation")}</label>
    </div>
    <fieldset className={`mx-layers${panel ? '' : ' is-closed'}`}><legend><button className="mx-fold" onClick={() => setPanel((o) => !o)} aria-expanded={panel}>{t("Couches de données")} {panel ? '▾' : '▸'}</button></legend>
      {LAYERS.map((l) => <label key={l.id} className={`mx-chip${layers[l.id] ? ' is-on' : ''}`} title={t(l.hint)}>
        <input type="checkbox" checked={layers[l.id]} onChange={() => toggle(l.id)} /><i style={{ background: l.swatch }} aria-hidden="true" />{t(l.label)}</label>)}
      {layers.temperature && <div className="mx-scale"><span>40 K</span><i style={{ background: LAYERS[2].swatch }} /><span>390 K</span></div>}
      {layers.hydrogen && <div className="mx-scale"><span>{t("faible")}</span><i style={{ background: LAYERS[1].swatch }} /><span>{t("élevé")}</span></div>}
    </fieldset>
    <div className="mx-probe mono" role="status" aria-live="polite">{probe
      ? <>{probe.name && <b>{t(probe.name)} · </b>}{fmtC(probe.lat, 'N', 'S')} · {fmtC(probe.lon, 'E', 'O')} · T ≈ {Math.round(probe.tempK)} {t("K · H")} {Math.round(probe.hydrogen * 100)} %{probe.ice && <em> {t("· glace probable")}</em>}</>
      : t('Survolez la surface pour lire les mesures · glissez pour tourner')}</div>
  </div>;
}
