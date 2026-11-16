import { t } from '../../i18n';
import { Store } from '../../core/Store';
import { ROUTES, type MissionRoute, type MissionState } from '../../domain/mission';
import type { GameEvent } from '../../domain/narrative';
import { readPointer } from '../../data/backend/ServerRepositories';
import { recruitStore } from '../../domain/recruit';
import type { ServerGateway } from '../../data/backend/ServerGateway';
import { ApiError } from '../../data/backend/api';
import { RepositoryError, type CampaignRepository, type EventRecorder, type MissionRepository, type Navigator, type ScientificProfileRepository } from '../../domain/ports';

export interface MissionDeps { campaigns: CampaignRepository; missions: MissionRepository; profiles: ScientificProfileRepository; events: EventRecorder; nav: Navigator;
  /** Présent en mode connecté : le serveur fait autorité sur les valeurs officielles. */
  server?: ServerGateway; }
export type SaveStatus = 'ok' | 'saving' | 'error';
export interface BaseState { status: 'loading' | 'ready' | 'error'; mission?: MissionState; save: SaveStatus; error?: string; busy: boolean; }

export function newMission(profile: MissionState['profile']): MissionState {
  return { version: 1, reached: 0, profile, config: [], configVersion: 1, acceptances: [], validated: false, archiveRead: false, peakHandled: false,
    ops: { cycle: 0, batteryWh: 0, storageGb: 0, produced: 0, transmitted: 0, lost: 0, byInstrument: {}, history: [], mode: 'manual' }, checkpoints: [] };
}

/** Base commune des ViewModels de campagne : chargement, sauvegarde (SaveIndicator), événements best-effort, progression. */
export abstract class MissionViewModel<X> extends Store<BaseState & X> {
  protected campaignId?: string; private started = false;
  constructor(protected d: MissionDeps, extra: X) { super({ status: 'loading', save: 'ok', busy: false, ...extra } as BaseState & X); }

  init = async (): Promise<void> => {
    if (this.started) return; this.started = true;
    try {
      const c = await this.d.campaigns.getLatest();
      if (!c) { this.d.nav.go('/'); return; }
      this.campaignId = c.id; recruitStore.load(c.id);
      let m = await this.d.missions.load(c.id);
      if (!m) {
        const p = await this.d.profiles.load(c.id);
        m = newMission(p ?? { primary: 'ice', secondaries: [], elias: 'defer' });
        await this.d.missions.save(c.id, m);
      }
      if (this.d.server) {
        await this.d.server.loadCatalogue();
        if (!m.server) { const ptr = readPointer(); if (ptr && ptr.snapshot.missionId === c.id) { m = { ...m, server: ptr.snapshot }; await this.d.missions.save(c.id, m); } }
      }
      this.setState({ status: 'ready', mission: m } as Partial<BaseState & X>);
      this.onReady(m);
    } catch (e) { this.setState({ status: 'error', error: e instanceof ApiError ? e.message : t('Impossible de charger la mission.') } as Partial<BaseState & X>); }
  };
  /** Mode connecté actif pour cette mission. */
  protected get srv(): ServerGateway | undefined { return this.d.server && this.getState().mission?.server ? this.d.server : undefined; }
  protected fail(e: unknown, fallback = 'Erreur serveur') { this.setState({ busy: false, error: e instanceof Error ? e.message : fallback } as Partial<BaseState & X>); }
  retry = (): Promise<void> => { this.started = false; this.setState({ status: 'loading', error: undefined } as Partial<BaseState & X>); return this.init(); };
  protected onReady(_m: MissionState): void { /* surcharge facultative */ }
  protected get m(): MissionState { return this.getState().mission as MissionState; }

  /** Mise à jour optimiste + sauvegarde ; l'historique local n'est jamais perdu en cas d'échec. */
  protected async commit(next: MissionState): Promise<boolean> {
    this.setState({ mission: next, save: 'saving' } as Partial<BaseState & X>);
    try { if (this.campaignId) await this.d.missions.save(this.campaignId, next); this.setState({ save: 'ok' } as Partial<BaseState & X>); return true; }
    catch (e) { this.setState({ save: 'error', error: e instanceof RepositoryError ? e.message : 'Sauvegarde impossible' } as Partial<BaseState & X>); return false; }
  }
  protected record(e: GameEvent): void { if (this.campaignId) this.d.events.record(this.campaignId, { ...e, at: new Date() }).catch(() => undefined); }
  /** Avance la progression puis navigue. */
  protected async goTo(route: MissionRoute, patch: Partial<MissionState> = {}): Promise<void> {
    const reached = Math.max(this.m.reached, ROUTES.indexOf(route));
    if (await this.commit({ ...this.m, ...patch, reached })) this.d.nav.go(route);
  }
  go = (route: string): void => this.d.nav.go(route);
}
