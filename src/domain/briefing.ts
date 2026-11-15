export type StanceId = 'prudent' | 'balanced' | 'ambitious';
export type BriefingTab = 'context' | 'characters' | 'objectives' | 'constraints';
export const TAB_ORDER: BriefingTab[] = ['context', 'characters', 'objectives', 'constraints'];
export const TAB_LABELS: Record<BriefingTab, string> = {
  context: 'Contexte', characters: 'Personnages', objectives: 'Objectifs', constraints: 'Contraintes',
};
export interface Remark { speaker: string; text: string; }
export interface Character { id: string; name: string; role: string; priority: string; voice: string; initials: string; }
/** La posture change la réaction et la question, jamais la faisabilité technique. */
export interface Posture { id: StanceId; label: string; summary: string; reaction: Remark; question: string; answer: Remark; }
export interface BriefingContent {
  context: string[]; objectives: string[]; constraints: string[]; characters: Character[]; postures: Posture[];
}
