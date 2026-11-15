import type { CampaignSummary, GameMode, RenderMode } from './campaign';
import type { AssetEntry } from './assets';
import type { BriefingContent, StanceId } from './briefing';
import type { GameEvent, Scene } from './narrative';

export class RepositoryError extends Error {
  constructor(message: string, readonly cause?: unknown) { super(message); }
}
/** Port vers la persistance / le backend. Le ViewModel ne connaît que cette interface. */
export interface CampaignRepository {
  /** Dernière sauvegarde exploitable, ou null s'il n'y en a pas. */
  getLatest(): Promise<CampaignSummary | null>;
  /** Crée une campagne (remplace la sauvegarde courante) avec le mode choisi. */
  create(mode: GameMode): Promise<CampaignSummary>;
}
export interface CapabilitiesProvider { detect(): RenderMode; }
export interface Navigator { go(route: string): void; }
/** Source du script narratif (statique aujourd'hui, backend/CMS demain). */
export interface ScriptRepository { getPrologue(): Promise<Scene[]>; }
/** Journal des événements de campagne (catalogue EVT-…). Best-effort : un échec ne bloque jamais le joueur. */
export interface EventRecorder { record(campaignId: string, event: GameEvent & { at: Date }): Promise<void>; }
/** Manifeste des visuels (source, licence, crédit). */
export interface AssetManifestRepository { getAll(): Promise<AssetEntry[]>; }
export interface BriefingRepository { getBriefing(): Promise<BriefingContent>; }
/** Variables narratives persistantes (ici : posture initiale). */
export interface NarrativeStateRepository { setInitialStance(campaignId: string, stance: StanceId | 'skipped'): Promise<void>; }
/** Contenu de l'Acte I (statique aujourd'hui ; GET /catalog/objectives et /catalog/instruments demain). */
export interface ProfileCatalogRepository { getCatalog(): Promise<import('./profile').ProfileCatalog>; }
/** Écrit le profil scientifique confirmé (PUT /campaigns/{id}/profile). */
export interface ScientificProfileRepository {
  save(campaignId: string, profile: import('./profile').ScientificProfile): Promise<void>;
  load(campaignId: string): Promise<Pick<import('./profile').ScientificProfile, 'primary' | 'secondaries' | 'elias'> | null>;
}
/** État de mission des Actes II–VI (GET/PUT /campaigns/{id}/mission — hypothèse à aligner). */
export interface MissionRepository {
  load(campaignId: string): Promise<import('./mission').MissionState | null>;
  save(campaignId: string, s: import('./mission').MissionState): Promise<void>;
}
export interface ReportSummary { id: string; at: string; ending: string; score: number; categories: Record<string, number>; primary: string; launcher?: string; orbit?: string;
  /** Échelle du score (100 en local, 1000 côté serveur) et maximum de chaque catégorie. */
  scale?: number; maxima?: Record<string, number>; source?: 'local' | 'serveur'; finalState?: string; }
/** Rapports figés (GET /reports, POST /reports — hypothèse). */
export interface ReportArchive { list(): Promise<ReportSummary[]>; add(r: ReportSummary): Promise<void>; }
