import { useEffect, useState } from 'react';
import { useViewModel } from '../../core/useViewModel';
import type { Prefs } from '../../domain/preferences';
import { Icon } from '../../ui/Icon';
import { ConfirmModal } from '../../ui/kit';
import { OptionsViewModel } from './OptionsViewModel';

function Choice<T extends string | number>({ name, value, options, onChange }: { name: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return <div className="seg seg--in" role="radiogroup" aria-label={name}>{options.map(([v, l]) => <button key={String(v)} role="radio" aria-checked={value === v} className={`seg-i${value === v ? ' is-on' : ''}`} onClick={() => onChange(v)}>{l}</button>)}</div>;
}
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div className="opt-row"><div><strong>{label}</strong>{hint && <p className="muted">{hint}</p>}</div><div className="opt-ctl">{children}</div></div>;
}
function Toggle({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <label className="switch" htmlFor={id}><input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span aria-hidden="true" /><span className="sr">{label}</span></label>;
}

export function OptionsView({ vm }: { vm: OptionsViewModel }) {
  const s = useViewModel(vm); const p = s.prefs; const set = vm.set;
  const [srv, setSrv] = useState<'test' | 'ok' | 'ko'>('test');
  useEffect(() => { if (vm.apiUrl) fetch(`${vm.apiUrl}/health`).then((r) => setSrv(r.ok ? 'ok' : 'ko')).catch(() => setSrv('ko')); }, [vm]);
  return <main className="page">
    <header className="page-top"><a href="#/" className="word">THE LAST LIGHT<span>Options</span></a><a className="btn2 btn2--ghost btn2--sm" href="#/"><Icon name="x" size={13} /> Retour au menu</a></header>
    <div className="page-body">
      <div className="page-head"><h1>Options</h1><p className="muted">Les réglages s&apos;appliquent immédiatement et restent enregistrés dans ce navigateur.</p></div>
      {s.message && <p className="page-msg" role="status"><Icon name="check" size={13} /> {s.message}</p>}
      {s.reloadNeeded && <p className="page-msg page-msg--warn" role="status"><Icon name="alert" size={13} /> Le changement de rendu s&apos;applique au rechargement. <button className="btn2 btn2--primary btn2--sm" onClick={vm.reload}>Recharger</button></p>}
      <div className="opt-grid">
        <section className="glass"><header className="glass-h"><h2><Icon name="orbit" size={14} />Affichage</h2></header>
          <Row label="Rendu de la scène" hint="Le repli 2D remplace la 3D par des schémas, pour les appareils modestes."><Choice name="Rendu" value={p.render} options={[['3d', '3D'], ['2d', 'Repli 2D']]} onChange={(v) => set('render', v)} /></Row>
          <Row label="Qualité 3D" hint="« Auto » baisse la résolution si l'appareil peine."><Choice name="Qualité" value={p.quality} options={[['auto', 'Auto'], ['high', 'Haute'], ['low', 'Économe']]} onChange={(v) => set('quality', v)} /></Row>
          <Row label="Panneau orbital (GMAT)" hint="Éléments képlériens et vecteur d'état en direct."><Toggle id="o-gmat" checked={p.gmat} onChange={(v) => set('gmat', v)} label="Panneau orbital" /></Row>
        </section>
        <section className="glass"><header className="glass-h"><h2><Icon name="help" size={14} />Accessibilité</h2></header>
          <Row label="Contraste renforcé"><Toggle id="o-contrast" checked={p.contrast} onChange={(v) => set('contrast', v)} label="Contraste renforcé" /></Row>
          <Row label="Réduire la transparence" hint="Panneaux opaques au lieu du verre dépoli."><Toggle id="o-solid" checked={p.solid} onChange={(v) => set('solid', v)} label="Réduire la transparence" /></Row>
          <Row label="Animations" hint="« Système » suit le réglage de votre appareil."><Choice name="Animations" value={p.motion} options={[['system', 'Système'], ['reduce', 'Réduites'], ['full', 'Complètes']]} onChange={(v) => set('motion', v)} /></Row>
          <Row label="Taille de l'interface"><Choice name="Taille" value={p.uiScale} options={[[90, '90 %'], [100, '100 %'], [115, '115 %'], [130, '130 %']]} onChange={(v) => set('uiScale', v as Prefs['uiScale'])} /></Row>
          <Row label="Aides de l'atelier" hint="Fenêtre d'explication à la première visite de chaque sous-système."><Toggle id="o-help" checked={p.help} onChange={(v) => set('help', v)} label="Aides de l'atelier" /></Row>
        </section>
        <section className="glass"><header className="glass-h"><h2><Icon name="power" size={14} />Performance</h2></header>
          <Row label="Images par seconde" hint="30 images/s économise la batterie des portables."><Choice name="Images par seconde" value={p.fpsCap} options={[[60, '60 i/s'], [30, '30 i/s']]} onChange={(v) => set('fpsCap', v as Prefs['fpsCap'])} /></Row>
        </section>
        <section className="glass"><header className="glass-h"><h2><Icon name="comms" size={14} />Langue et audio</h2></header>
          <Row label="Langue"><select className="field" value={p.lang} onChange={() => set('lang', 'fr')} aria-label="Langue"><option value="fr">Français</option><option value="en" disabled>English (à venir)</option></select></Row>
          <Row label="Audio" hint="Le jeu ne contient pas encore de son : aucun réglage à faire."><span className="muted">Non disponible</span></Row>
        </section>
        <section className="glass opt-wide"><header className="glass-h"><h2><Icon name="storage" size={14} />Données</h2></header>
          <Row label="Mode de jeu" hint={vm.apiUrl ? 'Les valeurs officielles (bilans, simulation, score) viennent du serveur.' : 'Démonstration sans serveur : tout est calculé dans le navigateur.'}>
            <span className={`srv-pill srv-pill--${vm.apiUrl ? srv : 'local'}`}>{vm.apiUrl ? (srv === 'ok' ? `Connecté · ${vm.apiUrl}` : srv === 'ko' ? `Serveur injoignable · ${vm.apiUrl}` : 'Vérification…') : 'Mode local'}</span></Row>
          {vm.apiUrl && <Row label="Session invitée" hint="Abandonne le jeton actuel : vos missions serveur ne seront plus accessibles depuis ce navigateur."><button className="btn2 btn2--ghost btn2--sm" onClick={vm.newSession}>Nouvelle session</button></Row>}
          <Row label="Progression locale" hint="Missions, rapports et points de reprise enregistrés dans ce navigateur. Les réglages sont conservés."><button className="btn2 btn2--danger btn2--sm" onClick={vm.askClear}>Effacer la progression</button></Row>
        </section>
      </div>
      <div className="page-foot"><button className="btn2 btn2--ghost" onClick={vm.reset}>Rétablir par défaut</button><a className="btn2 btn2--primary" href="#/">Terminé</a></div>
    </div>
    {s.confirmClear && <ConfirmModal title="Effacer la progression locale ?" irreversible confirmLabel="Effacer" onCancel={vm.cancelClear} onConfirm={vm.clear}>
      <p>Les missions en cours, les rapports et les points de reprise enregistrés dans ce navigateur seront supprimés.</p>{vm.apiUrl && <p>Les missions stockées sur le serveur ne sont pas supprimées.</p>}</ConfirmModal>}
  </main>;
}
