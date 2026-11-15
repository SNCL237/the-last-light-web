export type Act = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Prologue
export type GameMode = 'guided' | 'standard' | 'expert';
export type RenderMode = '3d' | '3d-light' | '2d';

export interface CampaignSummary {
  id: string;
  currentAct: Act;
  mode: GameMode;
  updatedAt: Date;
}

export const ACT_LABELS: Record<Act, string> = {
  0: 'Prologue', 1: 'Acte I', 2: 'Acte II', 3: 'Acte III', 4: 'Acte IV', 5: 'Acte V', 6: 'Acte VI',
};
export const MODE_LABELS: Record<GameMode, string> = { guided: 'Guidé', standard: 'Standard', expert: 'Expert' };
export const ACT_ROUTES: Record<Act, string> = {
  0: '/campagne/prologue', 1: '/campagne/acte-1/profil', 2: '/campagne/acte-2/atelier',
  3: '/campagne/acte-3/lancement', 4: '/campagne/acte-4/controle', 5: '/campagne/acte-5/crise',
  6: '/campagne/acte-6/rapport',
};

/** Le mode change l'aide (et, à calibrer, les marges), jamais les règles de la simulation. */
export const MODE_INFO: Record<GameMode, { label: string; summary: string; changes: string[] }> = {
  guided: { label: 'Guidé', summary: "Pour découvrir l'ingénierie de mission pas à pas.",
    changes: ["Bulles d'aide à chaque étape", 'Configurations recommandées', 'Explications renforcées sur les unités et les causes'] },
  standard: { label: 'Standard', summary: "Un équilibre entre autonomie et aide.",
    changes: ["Aide contextuelle à la demande", 'Glossaire et infobulles disponibles'] },
  expert: { label: 'Expert', summary: 'Pour les joueurs qui maîtrisent les compromis.',
    changes: ['Aide désactivée par défaut', 'Marges de conception plus serrées (à calibrer)'] },
};
