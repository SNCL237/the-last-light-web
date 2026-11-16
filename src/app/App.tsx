import { Fragment, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { getLang, subscribeLang } from '../i18n';
import { ROUTES } from '../domain/mission';
import { BriefingView } from '../features/briefing/BriefingView';
import { CreditsView } from '../features/credits/CreditsView';
import { CrisisView } from '../features/crisis/CrisisView';
import { EndingView } from '../features/ending/EndingView';
import { LaunchView } from '../features/launch/LaunchView';
import { MenuView } from '../features/menu/MenuView';
import { ModeView } from '../features/mode/ModeView';
import { OpsView } from '../features/ops/OpsView';
import { ProfileView } from '../features/profile/ProfileView';
import { PrologueView } from '../features/prologue/PrologueView';
import { WorkshopView } from '../features/workshop/WorkshopView';
import { OptionsView } from '../features/options/OptionsView';
import { ReportsView } from '../features/reports/ReportsView';
import { RecruitView } from '../features/recruit/RecruitView';
import { SceneCanvas } from '../scene/SceneCanvas';
import { sceneStore } from '../scene/sceneStore';
import { applyPrefs } from '../ui/Shell';
import { createContainer } from './container';
import { t, tf } from '../i18n';

const container = createContainer();
const read = () => window.location.hash.slice(1) || '/';
function useRoute(): string {
  const [route, setRoute] = useState(read);
  useEffect(() => { const f = () => { sceneStore.reset(); setRoute(read()); window.scrollTo(0, 0); }; window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return route;
}
/** Instancie un ViewModel neuf à chaque visite (clé = route complète). */
function Fresh<T>({ make, render }: { make: () => T; render: (vm: T) => ReactNode }) { const [vm] = useState(make); return <>{render(vm)}</>; }

/** F-02 : garde de route. Une page de campagne non atteinte redirige vers la dernière page valide, avec explication. */
function useGuard(path: string): { ok: boolean; notice?: string } {
  const idx = ROUTES.indexOf(path as typeof ROUTES[number]);
  const [res, setRes] = useState<{ ok: boolean; notice?: string }>({ ok: idx < 0 });
  useEffect(() => {
    if (idx < 0) { setRes({ ok: true }); return; }
    let live = true; setRes({ ok: false });
    void container.guard(idx).then((g) => { if (!live) return; if (g.ok) setRes({ ok: true }); else { setRes({ ok: false, notice: g.notice }); container.nav.go(g.redirect); } });
    return () => { live = false; };
  }, [path, idx]);
  return res;
}

/** Témoin de connexion (menu) : rend visible le mode et vérifie le serveur. */
function ServerStatus() {
  const url = container.apiUrl; const [st, setSt] = useState<'local' | 'test' | 'ok' | 'ko'>(url ? 'test' : 'local');
  useEffect(() => {
    console.info(url ? `[THE LAST LIGHT] Mode connecté : ${url}` : '[THE LAST LIGHT] Mode local (VITE_API_URL absent)');
    if (!url) return;
    fetch(`${url}/health`).then((r) => setSt(r.ok ? 'ok' : 'ko')).catch(() => setSt('ko'));
  }, [url]);
  const txt = { local: t('Mode local, sans serveur : créez un fichier .env avec VITE_API_URL, puis relancez npm run dev'), test: `${t('Connexion à')} ${url}…`, ok: `${t('Serveur connecté ·')} ${url}`, ko: tf('Serveur injoignable · {u}. Test : ouvrez {u}/health. S\'il répond, ajoutez {o} à CORS_ORIGINS puis redémarrez le serveur.', { u: url ?? '', o: window.location.origin }) }[st];
  return <p className={`srv-status srv-status--${st}`} role="status">{txt}</p>;
}

function Resume() {
  useEffect(() => { void container.resumeRoute().then((r) => container.nav.go(r)); }, []);
  return <main className="loading2"><p role="status" className="mono">{t("Reprise de la mission…")}</p></main>;
}

export function App() {
  const lang = useSyncExternalStore(subscribeLang, getLang);
  const route = useRoute(); const [path, query] = route.split('?'); const q = new URLSearchParams(query ?? '');
  const guard = useGuard(path); const [notice, setNotice] = useState<string>();
  useEffect(() => { applyPrefs(); }, []);
  useEffect(() => { if (guard.notice) setNotice(guard.notice); }, [guard.notice]);
  useEffect(() => { if (!notice) return; const t = window.setTimeout(() => setNotice(undefined), 6000); return () => window.clearTimeout(t); }, [notice]);
  const c = container; let page: ReactNode;
  if (!guard.ok) page = <main className="loading2"><p role="status" className="mono">{t("Vérification de la progression…")}</p></main>;
  else switch (path) {
    case '/campagne/reprendre': page = <Resume />; break;
    case '/': page = <Fresh key={route} make={c.createMenuViewModel} render={(vm) => <MenuView vm={vm} />} />; break;
    case '/mode': page = <Fresh key={route} make={c.createModeViewModel} render={(vm) => <ModeView vm={vm} />} />; break;
    case '/campagne/recrue': page = <Fresh key={route} make={() => c.createRecruit(q.get('retour') ?? undefined)} render={(vm) => <RecruitView vm={vm} />} />; break;
    case '/options': page = <Fresh key={route} make={c.createOptions} render={(vm) => <OptionsView vm={vm} />} />; break;
    case '/rapports': page = <Fresh key={route} make={c.createReports} render={(vm) => <ReportsView vm={vm} />} />; break;
    case '/credits': page = <Fresh key={route} make={c.createCreditsViewModel} render={(vm) => <CreditsView vm={vm} />} />; break;
    case '/campagne/prologue': page = <Fresh key={route} make={c.createPrologueViewModel} render={(vm) => <PrologueView vm={vm} />} />; break;
    case '/campagne/briefing': page = <Fresh key={route} make={c.createBriefingViewModel} render={(vm) => <BriefingView vm={vm} />} />; break;
    case '/campagne/acte-1/profil': page = <Fresh key={route} make={c.createProfileViewModel} render={(vm) => <ProfileView vm={vm} />} />; break;
    case '/campagne/acte-2/atelier': page = <Fresh key={route} make={() => c.createWorkshop('design', q.get('focus') ?? undefined)} render={(vm) => <WorkshopView vm={vm} />} />; break;
    case '/campagne/acte-2/prevalidation': page = <Fresh key={route} make={() => c.createWorkshop('validation')} render={(vm) => <WorkshopView vm={vm} />} />; break;
    case '/campagne/acte-3/revue': page = <Fresh key={route} make={() => c.createLaunch('review')} render={(vm) => <LaunchView vm={vm} step={t("review")} />} />; break;
    case '/campagne/acte-3/lancement': page = <Fresh key={route} make={() => c.createLaunch('sequence')} render={(vm) => <LaunchView vm={vm} step={t("sequence")} />} />; break;
    case '/campagne/acte-4/controle': page = <Fresh key={route} make={() => c.createOps('control')} render={(vm) => <OpsView vm={vm} />} />; break;
    case '/campagne/acte-4/planificateur': page = <Fresh key={route} make={() => c.createOps('planner')} render={(vm) => <OpsView vm={vm} />} />; break;
    case '/campagne/acte-4/bilan': page = <Fresh key={route} make={() => c.createOps('summary')} render={(vm) => <OpsView vm={vm} />} />; break;
    case '/campagne/acte-5/alerte': page = <Fresh key={route} make={() => c.createCrisis('alert')} render={(vm) => <CrisisView vm={vm} />} />; break;
    case '/campagne/acte-5/diagnostic': page = <Fresh key={route} make={() => c.createCrisis('diagnostic')} render={(vm) => <CrisisView vm={vm} />} />; break;
    case '/campagne/acte-5/arbitrage': page = <Fresh key={route} make={() => c.createCrisis('arbitration')} render={(vm) => <CrisisView vm={vm} />} />; break;
    case '/campagne/acte-5/resolution': page = <Fresh key={route} make={() => c.createCrisis('resolution')} render={(vm) => <CrisisView vm={vm} />} />; break;
    case '/campagne/acte-6/rapport': page = <Fresh key={route} make={() => c.createEnding('report')} render={(vm) => <EndingView vm={vm} />} />; break;
    case '/campagne/acte-6/fin': page = <Fresh key={route} make={() => c.createEnding('ending')} render={(vm) => <EndingView vm={vm} />} />; break;
    case '/campagne/acte-6/final': page = <Fresh key={route} make={() => c.createEnding('final')} render={(vm) => <EndingView vm={vm} />} />; break;
    default: page = <main className="loading2"><div className="glass modal"><h1 className="modal-t">{t("Page introuvable")}</h1><p className="mono">{route}</p><a className="btn2 btn2--primary" href="#/">{t("Retour au menu")}</a></div></main>;
  }
  return <><SceneCanvas /><Fragment key={lang}>{path === '/' && <ServerStatus />}{notice && <div className="toast" role="status">{notice}</div>}{page}</Fragment></>;
}
