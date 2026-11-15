import type { OrbitChoice } from '../domain/mission';

/** Description déclarative de la scène : chaque page la règle, le moteur 3D (ou le repli 2D) l'interprète. */
export type SceneView = 'ambient' | 'orbit' | 'orbiter' | 'transfer' | 'ending' | 'hidden';
export type SceneMood = 'normal' | 'crisis' | 'legacy' | 'fragment' | 'last_signal' | 'silence';
export interface SceneProps {
  view: SceneView; mood: SceneMood; orbit?: OrbitChoice;
  addons: { wings: 0 | 1 | 2; radar: boolean; dish: 'none' | 'small' | 'large'; tanks: boolean };
  highlight: string | null; progress: number; // 0..1 pour la séquence de transfert
  /** Vue éclatée (Atelier) : une pièce par composant installé. `partFocus` = pièce mise en avant depuis l'interface. */
  exploded: boolean; parts: ScenePart[]; partFocus: string | null;
}
export interface ScenePart { id: string; slot: string; subsystem: string; label: string }
/** Pièce survolée dans la vue éclatée, avec sa position à l'écran (pour la fiche flottante). */
export interface PartHover { id: string; x: number; y: number }
const DEFAULT: SceneProps = { view: 'ambient', mood: 'normal', addons: { wings: 1, radar: false, dish: 'small', tanks: true }, highlight: null, progress: 0, exploded: false, parts: [], partFocus: null };
let props: SceneProps = DEFAULT; let hovered = false; let partHover: PartHover | null = null;
const subs = new Set<() => void>();
export const sceneStore = {
  get: () => props, isHovered: () => hovered,
  set(p: Partial<SceneProps>) { props = { ...props, ...p }; subs.forEach((f) => f()); },
  reset() { props = DEFAULT; subs.forEach((f) => f()); },
  setHovered(h: boolean) { if (h !== hovered) { hovered = h; subs.forEach((f) => f()); } },
  getPartHover: () => partHover,
  setPartHover(h: PartHover | null) {
    const same = h === partHover || (h && partHover && h.id === partHover.id && Math.abs(h.x - partHover.x) < 2 && Math.abs(h.y - partHover.y) < 2);
    if (!same) { partHover = h; subs.forEach((f) => f()); }
  },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
};
/** Horloge de mission commune à la 3D et au panneau GMAT : 1 s réelle = 60 s simulées. */
export const TIME_SCALE = 60;
const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
export const missionSeconds = () => ((performance.now() - t0) / 1000) * TIME_SCALE;
export const EPOCH = new Date('2026-11-15T12:00:00Z');
