import { useEffect, useRef } from 'react';
import { useViewModel } from '../../core/useViewModel';
import { PrologueViewModel, historyOf, isLastLine } from './PrologueViewModel';
import { t } from '../../i18n';

export function PrologueView({ vm }: { vm: PrologueViewModel }) {
  const s = useViewModel(vm);
  const advRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { void vm.init(); }, [vm]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') vm.escape(); };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  }, [vm]);
  useEffect(() => { if (!s.paused && !s.historyOpen) advRef.current?.focus(); }, [s.status, s.sceneIndex, s.lineIndex, s.paused, s.historyOpen]);

  if (s.status !== 'ready') return (
    <main className="screen"><div className="scene" aria-hidden="true" />
      {s.status === 'loading' ? <p role="status" className="hint">{t("Chargement…")}</p> : (
        <div role="alert" className="alert"><span>⚠ {t(s.error)}</span>
          <button className="btn btn--small" onClick={vm.retry}>{t("Réessayer")}</button>
          <button className="btn btn--small" onClick={vm.quitToMenu}>{t("Menu")}</button></div>)}
    </main>);

  const scene = s.scenes[s.sceneIndex];
  const line = scene.lines[s.lineIndex];
  return (
    <main className="screen prologue">
      <div className="scene" aria-hidden="true" data-mood={scene.mood} />
      <header className="topline">
        <span className="hint">{t("Prologue · scène")} {s.sceneIndex + 1}/{s.scenes.length} — {t(scene.title)}</span>
        <div className="row">
          <button className="btn btn--small" onClick={vm.toggleHistory}>{t("Historique")}</button>
          <button className="btn btn--small" onClick={vm.skipScene}>{t("Passer la scène")}</button>
          <button className="btn btn--small" onClick={vm.togglePause}>{t("Pause")}</button>
        </div>
      </header>

      <p className="caption" role="status">{t(scene.caption)}</p>
      <div className="panel line-box">
        {line.speaker && <h1 className="panel-title">{t(line.speaker)}</h1>}
        <p className={`line line--${line.kind}`}>{t(line.text)}</p>
        <button ref={advRef} className="btn btn--primary btn--small" onClick={vm.advance}>
          {isLastLine(s) ? t('Rejoindre l’équipe') : t('Continuer')}
        </button>
      </div>

      {s.historyOpen && (
        <div className="veil"><div className="panel dialog" role="dialog" aria-modal="true" aria-labelledby="h-title">
          <h2 id="h-title" className="panel-title">{t("Historique")}</h2>
          <ul className="history">{historyOf(s).map((l, i) => <li key={i}>{l.speaker && <strong>{t(l.speaker)} : </strong>}{t(l.text)}</li>)}</ul>
          <button autoFocus className="btn btn--small" onClick={vm.toggleHistory}>{t("Fermer")}</button>
        </div></div>)}
      {s.paused && (
        <div className="veil"><div className="panel dialog" role="dialog" aria-modal="true" aria-labelledby="p-title">
          <h2 id="p-title" className="panel-title">{t("Pause")}</h2>
          <div className="row"><button autoFocus className="btn btn--primary btn--small" onClick={vm.togglePause}>{t("Reprendre")}</button>
            <button className="btn btn--small" onClick={vm.quitToMenu}>{t("Quitter vers le menu")}</button></div>
        </div></div>)}
    </main>
  );
}
