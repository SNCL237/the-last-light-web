import { Store } from '../../core/Store';
import type { Line, Scene } from '../../domain/narrative';
import type { CampaignRepository, EventRecorder, Navigator, ScriptRepository } from '../../domain/ports';

export interface PrologueState {
  status: 'loading' | 'ready' | 'error';
  scenes: Scene[]; sceneIndex: number; lineIndex: number;
  historyOpen: boolean; paused: boolean; error?: string;
}
/** Lignes déjà vues ou passées (journal de dialogues). */
export function historyOf(s: PrologueState): Line[] {
  const out: Line[] = [];
  s.scenes.forEach((sc, i) => {
    if (i < s.sceneIndex) out.push(...sc.lines);
    else if (i === s.sceneIndex) out.push(...sc.lines.slice(0, s.lineIndex + 1));
  });
  return out;
}
export function isLastLine(s: PrologueState): boolean {
  const sc = s.scenes[s.sceneIndex];
  return !!sc && s.sceneIndex === s.scenes.length - 1 && s.lineIndex === sc.lines.length - 1;
}

export class PrologueViewModel extends Store<PrologueState> {
  private started = false;
  private campaignId?: string;
  private recorded = new Set<string>();

  constructor(private scripts: ScriptRepository, private campaigns: CampaignRepository,
              private events: EventRecorder, private nav: Navigator) {
    super({ status: 'loading', scenes: [], sceneIndex: 0, lineIndex: 0, historyOpen: false, paused: false });
  }

  init = async (): Promise<void> => {
    if (this.started) return; this.started = true;
    try {
      const scenes = await this.scripts.getPrologue();
      this.campaignId = (await this.campaigns.getLatest().catch(() => null))?.id;
      this.setState({ status: 'ready', scenes });
      this.enter(0);
    } catch { this.setState({ status: 'error', error: 'Impossible de charger le prologue.' }); }
  };
  retry = (): Promise<void> => { this.started = false; this.setState({ status: 'loading', error: undefined }); return this.init(); };

  private get blocked(): boolean { const s = this.getState(); return s.status !== 'ready' || s.paused || s.historyOpen; }

  advance = (): void => {
    if (this.blocked) return;
    const s = this.getState();
    if (s.lineIndex < s.scenes[s.sceneIndex].lines.length - 1) this.setState({ lineIndex: s.lineIndex + 1 });
    else this.nextScene();
  };
  skipScene = (): void => { if (!this.blocked) this.nextScene(); };

  toggleHistory = (): void => { if (!this.getState().paused) this.setState({ historyOpen: !this.getState().historyOpen }); };
  togglePause = (): void => { if (this.getState().status === 'ready') this.setState({ paused: !this.getState().paused, historyOpen: false }); };
  escape = (): void => { this.getState().historyOpen ? this.toggleHistory() : this.togglePause(); };
  quitToMenu = (): void => this.nav.go('/');

  private nextScene(): void {
    const s = this.getState();
    if (s.sceneIndex >= s.scenes.length - 1) this.nav.go('/campagne/briefing');
    else this.enter(s.sceneIndex + 1);
  }
  private enter(i: number): void {
    this.setState({ sceneIndex: i, lineIndex: 0 });
    const ev = this.getState().scenes[i].event;
    if (ev && !this.recorded.has(ev.code)) { this.recorded.add(ev.code); void this.log(ev); }
  }
  private async log(ev: { code: string; trace: string }): Promise<void> {
    if (!this.campaignId) return;
    try { await this.events.record(this.campaignId, { ...ev, at: new Date() }); } catch { /* best-effort */ }
  }
}
