/**
 * La recrue jouée (GDD : « le joueur incarne un nouveau membre de l'équipe » ; Maya n'est pas l'avatar).
 * Rôles nommés par fonction (Architecture §13.2) ; Maya, Daniel, Noah et Amara restent des conseillers.
 */
export type RoleId = 'strategist' | 'engineer' | 'science' | 'ops';
export type EmblemId = 'crescent' | 'orbit' | 'star' | 'pole' | 'signal' | 'ring';
export interface Recruit { name: string; role: RoleId; emblem: EmblemId; createdAt: string }
export interface RoleInfo {
  id: RoleId; label: string; advisor: string; advisorRole: string; icon: string;
  duties: string[]; owns: string[]; lens: string[]; pitch: string;
}

export const ROLES: RoleInfo[] = [
  { id: 'strategist', label: 'Stratège de mission', advisor: 'Daniel Hayes', advisorRole: 'Directeur de mission', icon: 'target',
    pitch: 'Vous tenez le cap : budget, risque accepté, lanceur et orbite, décision finale.',
    duties: ['Budget et niveau de risque accepté', 'Choix du lanceur et de l’orbite', 'Validation finale et départage des désaccords'], owns: ['Budget', 'Temps'], lens: ['Ressources', 'Décisions'] },
  { id: 'engineer', label: 'Ingénieur orbiteur', advisor: 'Maya Moreau', advisorRole: 'Ingénieure système', icon: 'structure',
    pitch: 'Vous faites tenir l’orbiteur : structure, énergie, contrôle, propulsion et diagnostic.',
    duties: ['Structure, énergie, contrôle et propulsion', 'Prévalidation de la configuration', 'Diagnostic technique pendant la crise'], owns: ['Masse', 'Puissance', 'Fiabilité'], lens: ['Technique', 'Fiabilité'] },
  { id: 'science', label: 'Responsable science', advisor: 'Noah Williams', advisorRole: 'Responsable scientifique', icon: 'payload',
    pitch: 'Vous défendez la question de la mission : objectifs, instruments et observations.',
    duties: ['Objectifs scientifiques', 'Choix des instruments', 'Planification des observations'], owns: ['Données scientifiques', 'Instruments'], lens: ['Science'] },
  { id: 'ops', label: 'Opérations & communications', advisor: 'Amara Okafor', advisorRole: 'Opérations de vol et communications', icon: 'comms',
    pitch: 'Vous gardez le lien : fenêtres de contact, cycles, stockage et transmissions.',
    duties: ['Communications et fenêtres de contact', 'Cycles d’opérations', 'Stockage et transmission des données'], owns: ['Communications', 'Stockage', 'Carburant'], lens: ['Données'] },
];
export const roleInfo = (id: RoleId | undefined) => ROLES.find((r) => r.id === id);

/** Conseil du conseiller associé, pour chaque acte (I à VI). */
export const ROLE_TIPS: Record<RoleId, string[]> = {
  strategist: ['Fixez peu d’objectifs, mais tenus : chacun coûte en budget.', 'Gardez une réserve : le lanceur n’est pas encore payé.', 'Choisissez le lanceur sur la marge de masse, pas sur le seul prix.',
    'Un cycle prudent vaut mieux qu’une batterie vide.', 'La crise se décide aussi par le délai : ne laissez pas le temps trancher à votre place.', 'Relisez les décisions déterminantes : c’est votre bilan.'],
  engineer: ['Pensez déjà à l’énergie : chaque instrument devra être alimenté dans l’ombre.', 'Couvrez le pire cas : des demandes simultanées pendant l’éclipse.', 'Vérifiez le Δv et la batterie pour l’orbite choisie.',
    'Une production solaire qui baisse est un indice, pas un détail.', 'Le diagnostic d’abord : production, batterie, consommation par sous-système.', 'Les marges expliquent la fin, plus que la chance.'],
  science: ['Choisissez l’objectif principal qui répond à la question de LUNAR-01 : la glace.', 'Associez chaque objectif à un instrument, sinon il est perdu.', 'Une orbite qui ne survole pas les pôles rend vos objectifs inatteignables.',
    'La science s’accumule cycle après cycle : observez quand l’énergie le permet.', 'Mesurez ce que coûte chaque instrument coupé.', 'Comparez la science obtenue à vos objectifs : c’est votre part du rapport.'],
  ops: ['Une découverte non transmise n’existe pas : gardez le lien en tête.', 'Le débit doit suivre les données produites, sinon la mémoire déborde.', 'Comptez les fenêtres de contact de l’orbite choisie.',
    'Transmettez régulièrement : une fenêtre manquée remplit la mémoire.', 'Réduire les transmissions sauve de l’énergie, mais retarde les données.', 'Générées, transmises, perdues : votre chaîne de bout en bout.'],
};

export const EMBLEMS: { id: EmblemId; label: string }[] = [
  { id: 'crescent', label: 'Croissant' }, { id: 'orbit', label: 'Orbite' }, { id: 'star', label: 'Étoile' },
  { id: 'pole', label: 'Pôle Sud' }, { id: 'signal', label: 'Signal' }, { id: 'ring', label: 'Anneau' },
];

/** Indicatif : 2 à 24 caractères, lettres (accents compris), chiffres, espace, tiret, apostrophe, point. */
export function nameError(name: string): string | null {
  const n = name.trim();
  if (n.length < 2) return 'Au moins 2 caractères.';
  if (n.length > 24) return '24 caractères au maximum.';
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '’.-]*$/u.test(n)) return 'Lettres, chiffres, espaces, tirets et apostrophes seulement.';
  return null;
}

const key = (campaignId: string) => `tll.recruit.${campaignId}`;
export function loadRecruit(campaignId: string | undefined): Recruit | null {
  if (!campaignId) return null;
  try { const r = JSON.parse(localStorage.getItem(key(campaignId)) ?? 'null') as Recruit | null; return r && roleInfo(r.role) ? r : null; } catch { return null; }
}
export function saveRecruit(campaignId: string, r: Recruit): void {
  try { localStorage.setItem(key(campaignId), JSON.stringify(r)); localStorage.setItem('tll.recruit.last', JSON.stringify(r)); } catch { /* conservé pour la visite */ }
}
/** Dernière recrue créée : proposée par défaut pour une nouvelle campagne. */
export function lastRecruit(): Recruit | null { try { return JSON.parse(localStorage.getItem('tll.recruit.last') ?? 'null'); } catch { return null; } }

/** Recrue de la campagne en cours, partagée par les écrans (barre du haut, fiche de rôle). */
let current: Recruit | null = null; const subs = new Set<() => void>();
export const recruitStore = {
  get: () => current,
  load(campaignId: string | undefined) { current = loadRecruit(campaignId); subs.forEach((f) => f()); },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
};
