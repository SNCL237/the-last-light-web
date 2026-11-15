import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { SaveIndicator } from './kit';
import { applyPrefs as applyPrefsFrom, loadPrefs, savePrefs } from '../domain/preferences';

export const ACTS = [['I', 'Profil', '#/campagne/acte-1/profil'], ['II', 'Atelier', '#/campagne/acte-2/atelier'], ['III', 'Lancement', '#/campagne/acte-3/revue'],
  ['IV', 'Opérations', '#/campagne/acte-4/controle'], ['V', 'Crise', '#/campagne/acte-5/alerte'], ['VI', 'Bilan', '#/campagne/acte-6/rapport']] as const;

export const GLOSSARY: [string, string][] = [
  ['Δv (delta-v)', 'Variation de vitesse que la propulsion peut fournir. Il en faut pour s’insérer en orbite puis la maintenir.'],
  ['Profondeur de décharge', 'Part de la batterie que l’on s’autorise à utiliser. Plus elle est faible, plus la batterie vit longtemps.'],
  ['Ombre (éclipse)', 'Partie de l’orbite où la Lune cache le Soleil : les panneaux ne produisent plus, la batterie prend le relais.'],
  ['Puissance / énergie', 'La puissance (W) est instantanée ; l’énergie (Wh) est stockée. Les deux comptent séparément.'],
  ['Pire cas', 'Situation où plusieurs systèmes demandent de l’énergie en même temps, souvent pendant l’ombre.'],
  ['Liaison descendante', 'Transmission des données de l’orbiteur vers la Terre, possible seulement pendant les fenêtres de contact.'],
  ['SMA, ECC, INC', 'Demi-grand axe, excentricité et inclinaison : trois des six éléments képlériens qui décrivent l’orbite (notation GMAT).'],
  ['RAAN, AOP, TA', 'Ascension droite du nœud ascendant, argument du périlune et anomalie vraie (position actuelle sur l’orbite).'],
  ['Orbite figée', 'Orbite elliptique dont le périlune reste au-dessus du même pôle : peu de corrections nécessaires.'],
  ['Mode basse consommation', 'L’orbiteur coupe tout ce qui n’est pas vital pour survivre.'],
];

function useOverlay() {
  const [open, setOpen] = useState<null | 'pause' | 'help' | 'journal'>(null);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen((o) => (o ? null : 'pause')); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  return [open, setOpen] as const;
}
function Prefs() {
  const [p, setP] = useState(loadPrefs); const set = (patch: Partial<typeof p>) => { const n = { ...p, ...patch }; setP(n); savePrefs(n); if (patch.render) location.reload(); };
  return <fieldset className="prefs"><legend>Réglages rapides</legend>
    <label className="chk"><input type="checkbox" checked={p.render === '2d'} onChange={(e) => set({ render: e.target.checked ? '2d' : '3d' })} /> Repli 2D (sans 3D)</label>
    <label className="chk"><input type="checkbox" checked={p.solid} onChange={(e) => set({ solid: e.target.checked })} /> Réduire la transparence</label>
    <label className="chk"><input type="checkbox" checked={p.contrast} onChange={(e) => set({ contrast: e.target.checked })} /> Contraste renforcé</label>
    <a className="btn2 btn2--ghost btn2--sm" href="#/options">Toutes les options</a></fieldset>;
}
/** Conservé pour compatibilité : applique les préférences enregistrées. */
export function applyPrefs() { applyPrefsFrom(loadPrefs()); }

export interface ShellProps {
  act: number; step: string; save?: 'ok' | 'saving' | 'error'; left?: ReactNode; right?: ReactNode; bottom?: ReactNode; center?: ReactNode;
  banner?: ReactNode; mood?: 'normal' | 'crisis'; journal?: { t: string; text: string }[]; wide?: boolean;
}
/** F-05 : gabarit commun (topbar, rail gauche, zone centrale libre pour la scène, panneau droit, barre basse). */
export function Shell({ act, step, save, left, right, bottom, center, banner, mood = 'normal', journal = [], wide }: ShellProps) {
  const [open, setOpen] = useOverlay(); const [q, setQ] = useState('');
  return <div className={`shell2${wide ? ' shell2--wide' : ''}`} data-mood={mood}>
    <header className="top2">
      <a href="#/" className="word" aria-label="THE LAST LIGHT — menu principal">THE LAST LIGHT<span>Acte {ACTS[act - 1]?.[0]} · {step}</span></a>
      <nav className="seg" aria-label="Progression des actes">{ACTS.map(([n, l], i) => <span key={n} className={`seg-i${i + 1 === act ? ' is-on' : i + 1 < act ? ' is-done' : ''}`} aria-current={i + 1 === act ? 'step' : undefined}>{i + 1 < act && <Icon name="check" size={11} />}{n} · {l}</span>)}</nav>
      <div className="svc">{save && <SaveIndicator status={save} />}
        <button className="ic" onClick={() => setOpen('journal')} aria-label="Journal"><Icon name="log" /></button>
        <button className="ic" onClick={() => setOpen('help')} aria-label="Glossaire et aide"><Icon name="help" /></button>
        <button className="ic" onClick={() => setOpen('pause')} aria-label="Pause (Échap)"><Icon name="pause" /></button></div>
    </header>
    {banner && <div className="banner-row">{banner}</div>}
    {left && <aside className="left2">{left}</aside>}
    <div className="center2">{center}</div>
    {right && <aside className="right2">{right}</aside>}
    {bottom && <footer className="bottom2">{bottom}</footer>}
    {open && <div className="veil2" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
      <div className="glass modal" role="dialog" aria-modal="true" aria-label={open === 'pause' ? 'Pause' : open === 'help' ? 'Glossaire' : 'Journal'}>
        <header className="glass-h"><h2>{open === 'pause' ? 'Pause' : open === 'help' ? 'Glossaire et aide' : 'Journal de mission'}</h2><button className="ic" onClick={() => setOpen(null)} aria-label="Fermer"><Icon name="x" /></button></header>
        {open === 'pause' && <div className="stack2"><button className="btn2 btn2--primary" autoFocus onClick={() => setOpen(null)}>Reprendre</button><Prefs /><a className="btn2 btn2--ghost" href="#/">Menu principal (progression sauvegardée)</a></div>}
        {open === 'help' && <div className="stack2"><input className="field" placeholder="Rechercher un terme…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un terme" autoFocus />
          <dl className="gloss">{GLOSSARY.filter(([t, d]) => (t + d).toLowerCase().includes(q.toLowerCase())).map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl></div>}
        {open === 'journal' && (journal.length ? <ol className="journal">{journal.map((j, i) => <li key={i}><span>{j.t}</span>{j.text}</li>)}</ol> : <p className="muted">Aucune entrée pour l&apos;instant.</p>)}
      </div></div>}
  </div>;
}
