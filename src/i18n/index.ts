import { EN } from './en';

/**
 * Traduction FR → EN-US. Le texte français source sert de clé : un texte absent du dictionnaire
 * reste en français (lacune visible plutôt que texte vide). Langue lue dans les préférences (P04).
 */
export type Lang = 'fr' | 'en';
const KEY = 'tll.prefs';
let lang: Lang = (() => { try { return (JSON.parse(localStorage.getItem(KEY) ?? '{}').lang === 'en' ? 'en' : 'fr'); } catch { return 'fr'; } })();
const subs = new Set<() => void>();
export const getLang = (): Lang => lang;
export const locale = () => (lang === 'en' ? 'en-US' : 'fr-FR');
export function setLang(l: Lang) { if (l === lang) return; lang = l; document.documentElement.lang = l === 'en' ? 'en-US' : 'fr'; subs.forEach((f) => f()); }
export function subscribeLang(f: () => void) { subs.add(f); return () => { subs.delete(f); }; }

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
/** Traduit un texte français. Les espaces de début et de fin sont conservés (fragments JSX). */
export function t<T>(fr: T): T {
  if (lang === 'fr' || typeof fr !== 'string' || !fr) return fr;
  const k = norm(fr); if (!k) return fr;
  const en = EN[k]; if (en === undefined) return fr;
  const lead = /^\s/.test(fr) ? ' ' : ''; const trail = /\s$/.test(fr) ? ' ' : '';
  return (lead + en + trail) as unknown as T;
}
/** Texte avec variables : tf('Bonjour {nom}', { nom }) ; la clé du dictionnaire garde les accolades. */
export function tf(fr: string, vars: Record<string, string | number>): string {
  const tpl = t(fr); return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? `{${k}}` : String(vars[k])));
}
/** Table de libellés de module traduite à la lecture (suit la langue courante). */
export function tmap<T extends object>(o: T): T { return new Proxy(o, { get: (x, k) => { const v = Reflect.get(x, k); return typeof v === 'string' ? t(v) : v; } }); }
(globalThis as unknown as { __tllSetLang?: typeof setLang }).__tllSetLang = setLang;
/** Variante contextuelle : même texte français, traduction différente selon le contexte (ex. « Annuler » = Undo dans l'atelier). */
export function tc(ctx: string, fr: string): string { if (lang === 'fr') return fr; return EN[`${ctx}|${norm(fr)}`] ?? t(fr); }
