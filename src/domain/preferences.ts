import { setLang } from '../i18n';

/** Préférences du joueur (P04), stockées dans le navigateur et appliquées en direct. */
export interface Prefs {
  render: '3d' | '2d'; quality: 'auto' | 'high' | 'low'; fpsCap: 60 | 30; gmat: boolean;
  contrast: boolean; solid: boolean; motion: 'system' | 'reduce' | 'full'; uiScale: 90 | 100 | 115 | 130; help: boolean; lang: 'fr' | 'en';
}
export const DEFAULT_PREFS: Prefs = { render: '3d', quality: 'auto', fpsCap: 60, gmat: true, contrast: false, solid: false, motion: 'system', uiScale: 100, help: true, lang: 'fr' };
const KEY = 'tll.prefs';
const INTRO_KEY = 'tll.intro.atelier';

export function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Prefs> | null;
    // Reprise des anciennes clés (avant P04).
    const legacy: Partial<Prefs> = { render: localStorage.getItem('tll.render') === '2d' ? '2d' : undefined, solid: localStorage.getItem('tll.solid') === '1' || undefined, contrast: localStorage.getItem('tll.contrast') === '1' || undefined };
    const p = { ...DEFAULT_PREFS, ...Object.fromEntries(Object.entries(legacy).filter(([, v]) => v !== undefined)), ...(raw ?? {}) } as Prefs;
    try { const intro = JSON.parse(localStorage.getItem(INTRO_KEY) ?? '{}'); if (intro.mute === true && raw?.help === undefined) p.help = false; } catch { /* */ }
    return p;
  } catch { return { ...DEFAULT_PREFS }; }
}
export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p)); localStorage.setItem('tll.render', p.render);
    const intro = JSON.parse(localStorage.getItem(INTRO_KEY) ?? '{}'); localStorage.setItem(INTRO_KEY, JSON.stringify({ seen: [], ...intro, mute: !p.help }));
  } catch { /* stockage indisponible : réglages valables pour cette visite seulement */ }
  applyPrefs(p);
}
/** Applique les réglages visuels au document (attributs lus par la feuille de style). */
export function applyPrefs(p: Prefs = loadPrefs()): void {
  const r = document.documentElement;
  r.dataset.contrast = p.contrast ? '1' : '0'; r.dataset.solid = p.solid ? '1' : '0'; r.dataset.motion = p.motion; r.dataset.scale = String(p.uiScale); r.dataset.gmat = p.gmat ? '1' : '0';
  r.lang = p.lang === 'en' ? 'en-US' : 'fr'; setLang(p.lang);
}
/** Animations réduites : réglage explicite, sinon préférence du système. */
export function reducedMotion(p: Prefs = loadPrefs()): boolean {
  if (p.motion === 'reduce') return true; if (p.motion === 'full') return false;
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}
export function clearLocalProgress(): void {
  try { Object.keys(localStorage).filter((k) => k.startsWith('tll.') && k !== KEY && k !== 'tll.render').forEach((k) => localStorage.removeItem(k)); } catch { /* */ }
}
