import type { EmblemId } from '../domain/recruit';

/** Écussons de mission (créations originales, SVG) : bord orange, champ nuit, motif propre à chaque écusson. */
export function Emblem({ id, size = 64, label }: { id: EmblemId; size?: number; label?: string }) {
  const motif: Record<EmblemId, JSX.Element> = {
    crescent: <><circle cx="50" cy="50" r="20" fill="#d9dde6" /><circle cx="59" cy="44" r="18" fill="url(#em-field)" /><circle cx="70" cy="30" r="2" fill="#fff" /></>,
    orbit: <><circle cx="50" cy="52" r="13" fill="#c9ced8" /><ellipse cx="50" cy="52" rx="30" ry="11" fill="none" stroke="#7cc4ff" strokeWidth="2.5" transform="rotate(-24 50 52)" /><circle cx="76" cy="40" r="3.5" fill="#f26b1d" /></>,
    star: <><path d="M50 22 L56 43 L78 43 L60 56 L67 77 L50 64 L33 77 L40 56 L22 43 L44 43 Z" fill="#e9ecff" /><circle cx="50" cy="50" r="5" fill="#f26b1d" /></>,
    pole: <><path d="M20 62 A30 30 0 0 0 80 62 Z" fill="#c9ced8" /><circle cx="50" cy="66" r="6" fill="#28aaff" /><path d="M50 26 L50 56" stroke="#f26b1d" strokeWidth="2.5" /><path d="M50 26 L62 31 L50 36 Z" fill="#f26b1d" /></>,
    signal: <><circle cx="38" cy="62" r="4" fill="#f26b1d" /><path d="M38 50 A12 12 0 0 1 50 62" fill="none" stroke="#e9ecff" strokeWidth="3" strokeLinecap="round" /><path d="M38 40 A22 22 0 0 1 60 62" fill="none" stroke="#7cc4ff" strokeWidth="3" strokeLinecap="round" /><path d="M38 30 A32 32 0 0 1 70 62" fill="none" stroke="#b8b2ff" strokeWidth="3" strokeLinecap="round" /></>,
    ring: <><circle cx="50" cy="50" r="22" fill="none" stroke="#e9ecff" strokeWidth="3" /><circle cx="50" cy="50" r="14" fill="none" stroke="#7cc4ff" strokeWidth="2" strokeDasharray="4 3" /><circle cx="50" cy="28" r="4" fill="#f26b1d" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 100 100" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    <defs><radialGradient id="em-field" cx="40%" cy="35%"><stop offset="0" stopColor="#2a2150" /><stop offset="1" stopColor="#0b0a18" /></radialGradient></defs>
    <circle cx="50" cy="50" r="47" fill="url(#em-field)" stroke="#f26b1d" strokeWidth="4" />
    <circle cx="50" cy="50" r="40" fill="none" stroke="#b8b2ff" strokeOpacity=".35" strokeWidth="1" />
    {motif[id]}
  </svg>;
}
