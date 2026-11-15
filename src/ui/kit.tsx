import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export const fmt = (n: number, d = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: 0 });

export function Panel({ title, icon, children, className = '', actions, id }: { title?: ReactNode; icon?: string; children: ReactNode; className?: string; actions?: ReactNode; id?: string }) {
  return <section className={`glass ${className}`} id={id} aria-label={typeof title === 'string' ? title : undefined}>
    {title && <header className="glass-h"><h2>{icon && <Icon name={icon} size={14} />}{title}</h2>{actions}</header>}{children}</section>;
}

/** C-01 : valeur, unité, seuil ; état porté par icône + libellé + couleur. */
export type Level = 'ok' | 'low' | 'crit';
export function Gauge({ label, value, unit, ratio, level = 'ok', icon, hint }: { label: string; value: string; unit?: string; ratio?: number; level?: Level; icon?: string; hint?: string }) {
  const lv = { ok: '', low: 'Faible', crit: 'Critique' }[level];
  const bars = 24; const on = ratio === undefined ? 0 : Math.round(Math.max(0, Math.min(1, ratio)) * bars);
  return <div className={`gauge gauge--${level}`} title={hint}>
    <div className="gauge-top"><span className="gauge-l">{icon && <Icon name={icon} size={13} />}{label}</span>{lv && <span className="gauge-state"><Icon name="alert" size={12} />{lv}</span>}</div>
    <strong className="gauge-v">{value}{unit && <small> {unit}</small>}</strong>
    {ratio !== undefined && <div className="ticks" aria-hidden="true">{Array.from({ length: bars }, (_, i) => <i key={i} className={i < on ? 'on' : ''} />)}</div>}
  </div>;
}
export const levelOf = (ratio: number, low = 0.8, crit = 1): Level => (ratio >= crit ? 'crit' : ratio >= low ? 'low' : 'ok');

/** C-02 */
export type SysState = 'ok' | 'degraded' | 'critical' | 'off';
const SYS = { ok: ['Opérationnel', 'check'], degraded: ['Dégradé', 'alert'], critical: ['Critique', 'alert'], off: ['Hors ligne', 'x'] } as const;
export function SystemBadge({ state, trend }: { state: SysState; trend?: 'up' | 'down' | 'flat' }) {
  return <span className={`badge badge--${state}`}><Icon name={SYS[state][1]} size={12} />{SYS[state][0]}{trend && <span aria-label={`tendance ${trend === 'up' ? 'hausse' : trend === 'down' ? 'baisse' : 'stable'}`}> {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}</span>}</span>;
}

/** C-03 */
export function AlertBanner({ kind, title, children, action }: { kind: 'info' | 'warn' | 'crit' | 'block'; title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className={`banner banner--${kind}`} role={kind === 'info' ? 'status' : 'alert'}>
    <Icon name={kind === 'info' ? 'help' : 'alert'} size={18} /><div><strong>{title}</strong>{children && <div className="banner-b">{children}</div>}</div>{action}</div>;
}

/** C-12 : action principale, indisponible avec raison visible. */
export function ActionButton({ children, onClick, disabled, reason, busy, id, kind = 'primary' }: { children: ReactNode; onClick: () => void; disabled?: boolean; reason?: string; busy?: boolean; id?: string; kind?: 'primary' | 'ghost' | 'danger' }) {
  const rid = id ? `${id}-why` : undefined; const off = disabled || busy;
  return <span className="action">{reason && off && <span id={rid} className="action-why" role="status">{reason}</span>}
    <button id={id} className={`btn2 btn2--${kind}`} aria-disabled={off || undefined} aria-describedby={rid} onClick={off ? undefined : onClick}>{busy ? 'En cours…' : children}</button></span>;
}

export function KV({ rows }: { rows: [string, ReactNode, string?][] }) {
  return <dl className="kv2">{rows.map(([k, v, ic]) => <div key={k}><dt>{ic && <span className="kv-ic"><Icon name={ic} size={13} /></span>}{k}</dt><dd>{v}</dd></div>)}</dl>;
}

/** Barres fines (référence « MAIN SYSTEM ») */
export function Bars({ values, max, highlight, label }: { values: number[]; max?: number; highlight?: number; label: string }) {
  const m = max ?? Math.max(1, ...values.map(Math.abs));
  return <svg className="bars" viewBox={`0 0 ${values.length * 6} 60`} preserveAspectRatio="none" role="img" aria-label={label}>
    <line x1="0" x2={values.length * 6} y1="30" y2="30" className="axis" />
    {values.map((v, i) => { const h = (Math.abs(v) / m) * 28; return <rect key={i} x={i * 6 + 1} width="3" y={v >= 0 ? 30 - h : 30} height={Math.max(0.5, h)} className={i === highlight ? 'hl' : v < 0 ? 'neg' : ''} />; })}
  </svg>;
}

/** C-16 : courbes ; `dashedFrom` = début de la prévision. */
export interface Series { name: string; values: number[]; cls?: string; dashedFrom?: number; }
export function TrendChart({ series, threshold, label, unit, xLabels }: { series: Series[]; threshold?: { value: number; label: string }; label: string; unit?: string; xLabels?: string[] }) {
  const all = series.flatMap((s) => s.values).concat(threshold ? [threshold.value] : []);
  const max = Math.max(1, ...all) * 1.08; const n = Math.max(2, ...series.map((s) => s.values.length)); const W = 300, H = 110;
  const X = (i: number) => (i / (n - 1)) * W; const Y = (v: number) => H - (v / max) * H;
  const path = (vs: number[], o = 0) => vs.map((v, i) => `${i ? 'L' : 'M'}${X(i + o).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  return <figure className="trend"><svg viewBox={`0 -6 ${W} ${H + 12}`} role="img" aria-label={`${label}${unit ? ` (${unit})` : ''}`}>
    {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="grid" />)}
    {threshold && <><line x1="0" x2={W} y1={Y(threshold.value)} y2={Y(threshold.value)} className="thr" /><text x={W - 2} y={Y(threshold.value) - 3} textAnchor="end" className="thr-t">{threshold.label}</text></>}
    {series.map((s) => { const d = s.dashedFrom; return <g key={s.name} className={`ser ${s.cls ?? ''}`}>
      <path d={path(d === undefined ? s.values : s.values.slice(0, d + 1))} />
      {d !== undefined && <path d={path(s.values.slice(d), d)} className="fc" />}
      {s.values.length > 0 && <circle cx={X(s.values.length - 1)} cy={Y(s.values[s.values.length - 1])} r="2.5" />}</g>; })}
  </svg>
    <figcaption>{series.map((s) => <span key={s.name} className={`lg ${s.cls ?? ''}`}>{s.name}{s.dashedFrom !== undefined ? ' (pointillés : prévision)' : ''}</span>)}{xLabels && <span className="hint2">{xLabels[0]} → {xLabels[xLabels.length - 1]}</span>}</figcaption></figure>;
}

/** Radar du profil de performance (référence « Ship Performance »). */
export function RadarChart({ axes }: { axes: { label: string; value: number }[] }) {
  const n = axes.length; const R = 80; const pt = (i: number, r: number) => [Math.sin((i / n) * Math.PI * 2) * r, -Math.cos((i / n) * Math.PI * 2) * r];
  const poly = (f: (i: number) => number) => axes.map((_, i) => pt(i, f(i)).join(',')).join(' ');
  return <svg className="radar" viewBox="-175 -108 350 212" role="img" aria-label={`Profil : ${axes.map((a) => `${a.label} ${Math.round(a.value * 100)} %`).join(', ')}`}>
    {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={poly(() => R * f)} className="radar-grid" />)}
    {axes.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1="0" y1="0" x2={x} y2={y} className="radar-grid" />; })}
    <polygon points={poly((i) => R * axes[i].value)} className="radar-val" />
    {axes.map((a, i) => { const [x, y] = pt(i, R * a.value); const [lx, ly] = pt(i, R + 16); return <g key={a.label}><circle cx={x} cy={y} r="3" className="radar-dot" />
      <text x={lx} y={ly} textAnchor={Math.abs(lx) < 8 ? 'middle' : lx > 0 ? 'start' : 'end'} dominantBaseline="middle" className="radar-t">{a.label} {Math.round(a.value * 100)}</text></g>; })}
  </svg>;
}

/** C-11 : confirmation ; focus par défaut sur « Annuler » ; double confirmation si irréversible. */
export function ConfirmModal({ title, children, confirmLabel, onConfirm, onCancel, irreversible, busy, extra }: { title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void; irreversible?: boolean; busy?: boolean; extra?: ReactNode }) {
  const cancel = useRef<HTMLButtonElement>(null); const [armed, setArmed] = useState(!irreversible);
  useEffect(() => { cancel.current?.focus(); const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onCancel]);
  // Portail : un parent avec backdrop-filter recadrerait le voile « fixe ».
  return createPortal(<div className="veil2" role="presentation"><div className={`glass modal${irreversible ? ' modal--irr' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-t">
    <h2 id="modal-t" className="modal-t">{irreversible && <Icon name="alert" size={18} />}{title}</h2><div className="modal-b">{children}</div>{extra}
    {irreversible && <label className="chk"><input type="checkbox" checked={armed} onChange={(e) => setArmed(e.target.checked)} /> Je comprends que cette action est irréversible.</label>}
    <div className="modal-a"><button ref={cancel} className="btn2 btn2--ghost" onClick={onCancel}>Annuler</button>
      <ActionButton onClick={onConfirm} disabled={!armed} reason={!armed ? 'Cochez la confirmation.' : undefined} busy={busy} kind={irreversible ? 'danger' : 'primary'}>{confirmLabel}</ActionButton></div></div></div>, document.body);
}

/** C-20 */
export function TradeoffTable({ rows, saveLabel = 'Je sauve', loseLabel = 'Je perds' }: { rows: { key: string; label: ReactNode; save: string; lose: string; on?: boolean }[]; saveLabel?: string; loseLabel?: string }) {
  return <table className="tbl"><thead><tr><th scope="col">Option</th><th scope="col">{saveLabel}</th><th scope="col">{loseLabel}</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.key} className={r.on ? 'is-on' : ''}><th scope="row">{r.label}</th><td>{r.save}</td><td>{r.lose}</td></tr>)}</tbody></table>;
}

/** C-07 */
export function Consequence({ rows }: { rows: { label: string; before: string; after: string; worse?: boolean }[] }) {
  return <table className="tbl conseq"><thead><tr><th scope="col">Ressource</th><th scope="col">Avant</th><th scope="col">Après</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.label}><th scope="row">{r.label}</th><td>{r.before}</td><td className={r.worse ? 'worse' : 'better'}>{r.after} {r.before !== r.after && <span className="sr">{r.worse ? '(dégradation)' : '(amélioration)'}</span>}{r.before !== r.after && (r.worse ? ' ▼' : ' ▲')}</td></tr>)}</tbody></table>;
}

/** C-08 (simplifié) */
export function Lines({ lines }: { lines: { speaker: string; text: string }[] }) {
  return <div className="lines">{lines.map((l, i) => <p key={i} className="line2"><span className="who">{l.speaker}</span>{l.text}</p>)}</div>;
}

export function SaveIndicator({ status }: { status: 'ok' | 'saving' | 'error' }) {
  return <span className={`save save--${status}`} role="status"><Icon name={status === 'error' ? 'alert' : 'save'} size={14} />{status === 'ok' ? 'Sauvegardé' : status === 'saving' ? 'Sauvegarde…' : 'Échec de sauvegarde'}</span>;
}

/** Fenêtre d'information (aide d'étape) : focus sur « Compris », Échap pour fermer. */
export function InfoModal({ title, children, onClose, footer }: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode }) {
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => { ok.current?.focus(); const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return createPortal(<div className="veil2" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="glass modal modal--info" role="dialog" aria-modal="true" aria-labelledby="info-t">
    <h2 id="info-t" className="modal-t">{title}</h2><div className="modal-b">{children}</div>
    <div className="modal-a">{footer}<button ref={ok} className="btn2 btn2--primary" onClick={onClose}>Compris</button></div></div></div>, document.body);
}
