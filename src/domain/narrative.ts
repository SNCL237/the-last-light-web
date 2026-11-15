export type LineKind = 'radio' | 'card' | 'message' | 'note';
export interface Line { speaker?: string; kind: LineKind; text: string; }
export type Mood = 'signal' | 'archive' | 'recruit';
export interface GameEvent { code: string; trace: string; data?: Record<string, unknown>; }
/** Une scène du parcours narratif (ex. P0-S01). `caption` = description textuelle des sons/images. */
export interface Scene { id: string; title: string; mood: Mood; caption: string; lines: Line[]; event?: GameEvent; }
