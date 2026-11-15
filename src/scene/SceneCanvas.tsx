import { useEffect, useRef, useState } from 'react';
import { loadPrefs, reducedMotion } from '../domain/preferences';

/** Hôte de la scène (S-02) : 3D si WebGL et préférence le permettent, sinon repli 2D (classe sur <html>). */
export function SceneCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'3d' | '2d'>(() => {
    if (loadPrefs().render === '2d') return '2d';
    try { const c = document.createElement('canvas'); return c.getContext('webgl2') || c.getContext('webgl') ? '3d' : '2d'; } catch { return '2d'; }
  });
  useEffect(() => {
    document.documentElement.dataset.render = mode;
    if (mode !== '3d' || !ref.current) return;
    let stop: (() => void) | undefined; let cancelled = false;
    const reduced = reducedMotion();
    import('./engine').then(({ startEngine }) => { if (!cancelled && ref.current) stop = startEngine(ref.current, reduced); })
      .catch(() => setMode('2d'));
    return () => { cancelled = true; stop?.(); };
  }, [mode]);
  return mode === '3d' ? <canvas ref={ref} className="scene3d" aria-hidden="true" /> : null;
}
