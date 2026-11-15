import { BrowserCapabilities } from '../data/BrowserCapabilities';
import { HttpNarrativeStateRepository, LocalNarrativeStateRepository } from '../data/NarrativeStateRepositories';
import { StaticBriefingRepository } from '../data/StaticBriefingRepository';
import { BriefingViewModel } from '../features/briefing/BriefingViewModel';
import { StaticAssetManifestRepository } from '../data/StaticAssetManifestRepository';
import { CreditsViewModel } from '../features/credits/CreditsViewModel';
import { HttpEventRecorder, LocalEventRecorder } from '../data/EventRecorders';
import { StaticScriptRepository } from '../data/StaticScriptRepository';
import { PrologueViewModel } from '../features/prologue/PrologueViewModel';
import { HashNavigator } from '../data/HashNavigator';
import { HttpCampaignRepository } from '../data/HttpCampaignRepository';
import { LocalCampaignRepository } from '../data/LocalCampaignRepository';
import type { CampaignRepository } from '../domain/ports';
import { MenuViewModel } from '../features/menu/MenuViewModel';
import { StaticProfileCatalogRepository } from '../data/StaticProfileCatalogRepository';
import { HttpScientificProfileRepository, LocalScientificProfileRepository } from '../data/ScientificProfileRepositories';
import { ProfileViewModel } from '../features/profile/ProfileViewModel';
import { HttpMissionRepository, LocalMissionRepository } from '../data/MissionRepositories';
import { HttpReportArchive, LocalReportArchive } from '../data/ReportArchives';
import { WorkshopViewModel } from '../features/workshop/WorkshopViewModel';
import { LaunchViewModel } from '../features/launch/LaunchViewModel';
import { OpsViewModel, type OpsStep } from '../features/ops/OpsViewModel';
import { CrisisViewModel, type CrisisStep } from '../features/crisis/CrisisViewModel';
import { EndingViewModel, type EndingStep } from '../features/ending/EndingViewModel';
import { ROUTES } from '../domain/mission';
import { ApiClient } from '../data/backend/api';
import { ServerGateway } from '../data/backend/ServerGateway';
import { ServerCampaignRepository, ServerScientificProfileRepository } from '../data/backend/ServerRepositories';
import { OptionsViewModel } from '../features/options/OptionsViewModel';
import { ReportsViewModel } from '../features/reports/ReportsViewModel';
import { ModeSelectionViewModel } from '../features/mode/ModeSelectionViewModel';

/** Seul endroit qui choisit les implémentations : brancher le backend = changer ici (ou via .env). */
export function createContainer() {
  const env = import.meta.env;
  const useHttp = !!env.VITE_API_URL && env.VITE_USE_MOCK !== '1';
  const gateway = useHttp ? new ServerGateway(new ApiClient(env.VITE_API_URL as string)) : undefined;
  const campaigns: CampaignRepository = gateway
    ? new ServerCampaignRepository(gateway)
    : new LocalCampaignRepository(env.VITE_MOCK_SEED === '1' ? { id: 'demo-1', currentAct: 3, mode: 'guided', updatedAt: new Date() } : undefined);
  const nav = new HashNavigator();
  const caps = new BrowserCapabilities();
  const scripts = new StaticScriptRepository();
  const briefing = new StaticBriefingRepository();
  // Posture et événements EVT : aucun équivalent côté serveur → conservés localement (voir AUDIT).
  const narrative = new LocalNarrativeStateRepository();
  const manifest = new StaticAssetManifestRepository();
  const events = new LocalEventRecorder();
  const profileCatalog = new StaticProfileCatalogRepository();
  const profiles = gateway ? new ServerScientificProfileRepository(gateway) : new LocalScientificProfileRepository();
  // État d'interface local dans les deux modes ; en mode connecté il porte l'instantané serveur (autorité).
  const missions = new LocalMissionRepository();
  const reports = new LocalReportArchive();
  const deps = { campaigns, missions, profiles, events, nav, server: gateway };
  return {
    /** URL de l'API en mode connecté, sinon undefined (mode local). */
    apiUrl: gateway ? (env.VITE_API_URL as string) : undefined,
    nav,
    /** Garde des routes de campagne (index dans ROUTES) : redirige vers la dernière page atteinte. */
    async guard(idx: number): Promise<{ ok: true } | { ok: false; redirect: string; notice: string }> {
      const c = await campaigns.getLatest().catch(() => null);
      if (!c) return { ok: false, redirect: '/', notice: 'Aucune campagne en cours : commencez une nouvelle mission.' };
      const m = await missions.load(c.id).catch(() => null); const reached = m?.reached ?? 0;
      if (idx <= reached) return { ok: true };
      return { ok: false, redirect: ROUTES[reached], notice: 'Cette étape n\u2019est pas encore débloquée : retour à votre dernière étape valide.' };
    },
    /** F-10 : reprise à la dernière page atteinte ; sinon au début de l'acte enregistré. */
    async resumeRoute(): Promise<string> {
      const c = await campaigns.getLatest().catch(() => null); if (!c) return '/';
      const m = await missions.load(c.id).catch(() => null); if (m) return ROUTES[m.reached];
      if (await profiles.load(c.id).catch(() => null)) return ROUTES[0];
      return ({ 0: '/campagne/prologue', 1: '/campagne/acte-1/profil' } as Record<number, string>)[c.currentAct] ?? '/campagne/prologue';
    },
    createOptions: () => new OptionsViewModel(nav, gateway ? (env.VITE_API_URL as string) : undefined),
    createReports: () => new ReportsViewModel(reports, gateway),
    createWorkshop: (step: 'design' | 'validation', focus?: string) => new WorkshopViewModel(deps, step, focus),
    createLaunch: (step: 'review' | 'sequence') => new LaunchViewModel(deps, step),
    createOps: (step: OpsStep) => new OpsViewModel(deps, step),
    createCrisis: (step: CrisisStep) => new CrisisViewModel(deps, step),
    createEnding: (step: EndingStep) => new EndingViewModel(deps, reports, step),
    createProfileViewModel: () => new ProfileViewModel(profileCatalog, profiles, campaigns, events, nav),
    createMenuViewModel: () => new MenuViewModel(campaigns, caps, nav),
    createCreditsViewModel: () => new CreditsViewModel(manifest, nav, !!env.DEV),
    createBriefingViewModel: () => new BriefingViewModel(briefing, narrative, campaigns, events, nav),
    createModeViewModel: () => new ModeSelectionViewModel(campaigns, nav),
    createPrologueViewModel: () => new PrologueViewModel(scripts, campaigns, events, nav),
  };
}
