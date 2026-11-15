import type { Scene } from '../domain/narrative';
import type { ScriptRepository } from '../domain/ports';

/** Textes = propositions de rédaction (livrable 01), non définitifs. */
const PROLOGUE: Scene[] = [
  { id: 'P0-S01', title: 'Signal perdu', mood: 'signal', caption: 'Écran sombre. Souffle radio, télémétrie fragmentée.',
    event: { code: 'EVT-PRO-001', trace: 'signal_seen' },
    lines: [
      { speaker: 'LUNAR-01', kind: 'radio', text: 'LUNAR-01… télémétrie instable… alimentation…' },
      { kind: 'note', text: '[Le signal se coupe.]' },
    ] },
  { id: 'P0-S02', title: 'Archive', mood: 'archive', caption: "Images d'archive incomplètes de la mission précédente.",
    event: { code: 'EVT-PRO-002', trace: 'elias_archive_intro' },
    lines: [
      { speaker: 'Archive', kind: 'card', text: 'Prof. Elias Moreau — archives de mission' },
      { kind: 'note', text: "[Un fragment sonore s'interrompt.]" },
    ] },
  { id: 'P0-S03', title: 'Recrutement', mood: 'recruit', caption: 'Invitation à rejoindre le programme successeur.',
    lines: [
      { speaker: 'Programme successeur · 2042', kind: 'message', text: 'La mission qui vient doit aller plus loin. Nous avons besoin de votre jugement.' },
    ] },
];

export class StaticScriptRepository implements ScriptRepository {
  async getPrologue(): Promise<Scene[]> { return PROLOGUE; }
}
