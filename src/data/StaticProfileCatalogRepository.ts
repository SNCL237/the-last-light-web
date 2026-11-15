import type { ProfileCatalogRepository } from '../domain/ports';
import type { ProfileCatalog } from '../domain/profile';

/**
 * Contenu de l'Acte I (Parcours interactif, Acte I §2–5).
 * Masse / puissance : références LRO (LROC, LEND, Diviner, Mini-RF) [S] à recouper avec la page NASA.
 * Données (Go/jour) et coût (M€) : valeurs de gameplay ILLUSTRATIVES, à équilibrer côté backend.
 */
const CATALOG: ProfileCatalog = {
  polarBriefing: [
    'Zone d’étude : la région polaire sud de la Lune, où des cratères restent dans l’ombre permanente.',
    'Ces zones froides pourraient piéger de la glace d’eau. LUNAR-01 devait le vérifier ; ses données n’ont jamais été transmises.',
    'Une mission ne peut pas tout faire : chaque objectif ajouté augmente la masse, l’énergie, les données et le coût.',
  ],
  debate: [
    { speaker: 'Maya', text: '« Nous avons une fenêtre pour faire quelque chose d’important. Mais nous devons savoir ce que nous voulons vraiment mesurer. »' },
    { speaker: 'Noah', text: '« Si nous réduisons trop notre ambition, nous risquons de revenir avec des images magnifiques et aucune réponse. »' },
    { speaker: 'Amara', text: '« Une découverte qui reste dans un ordinateur à 380 000 kilomètres ne sert à personne. »' },
  ],
  objectives: [
    { id: 'mapping', label: 'Cartographie polaire', question: 'À quoi ressemble précisément la région étudiée ?', value: 'Contexte géographique et sélection de sites.', instruments: ['camera'] },
    { id: 'ice', label: 'Recherche de glace d’eau', question: 'Existe-t-il des indices d’hydrogène ou de glace ?', value: 'Potentiel scientifique et ressources futures.', instruments: ['neutron'] },
    { id: 'thermal', label: 'Analyse thermique', question: 'Comment les températures varient-elles dans les zones ciblées ?', value: 'Compréhension des environnements extrêmes.', instruments: ['thermal'] },
    { id: 'composition', label: 'Composition de surface', question: 'Quelles propriétés de surface peuvent être caractérisées ?', value: 'Contexte géologique et interprétation des observations.', instruments: ['camera', 'thermal'] },
  ],
  instruments: [
    { id: 'camera', name: 'Caméra haute résolution', reference: 'LROC', role: 'Cartographie et observation de la surface', massKg: 19.2, powerW: 24, dataGbPerDay: 40, costM: 18 },
    { id: 'neutron', name: 'Spectromètre neutronique', reference: 'LEND', role: 'Indices indirects d’hydrogène', massKg: 25.8, powerW: 11.6, dataGbPerDay: 2, costM: 14 },
    { id: 'thermal', name: 'Imageur thermique', reference: 'Diviner', role: 'Températures et propriétés thermiques', massKg: 11, powerW: 24.7, dataGbPerDay: 6, costM: 12 },
    { id: 'radar', name: 'Radar (instrument d’Elias)', reference: 'Mini-RF', role: 'Glace et rugosité sous la surface', massKg: 13.8, powerW: 7, dataGbPerDay: 25, costM: 16 },
  ],
  eliasInstrument: 'radar',
  eliasObjective: 'ice',
  eliasIntro: [
    { speaker: 'Noah', text: '« Elias avait conçu ce radar pour confirmer la glace là où le spectromètre ne voit qu’un indice. Je propose de le garder. »' },
    { speaker: 'Maya', text: '« Il compte pour moi aussi. Mais une mission qui doit rester maîtrisable ne peut pas porter une charge sans justification. »' },
  ],
  tradeoffs: [
    { decision: 'keep', label: 'Conserver l’instrument',
      gain: 'La recherche de glace devient prioritaire ; confirmation possible sous la surface.',
      loss: 'Contraintes prévisionnelles plus élevées : masse, énergie, données et coût.',
      reaction: { speaker: 'Maya', text: '« Merci. Mais il faudra le justifier techniquement à l’atelier. » — Noah soutient la décision.' } },
    { decision: 'drop', label: 'Écarter l’instrument',
      gain: 'Mission plus simple, marge de conception préservée.',
      loss: 'Pas de mesure radar ; la glace n’est approchée que par indices indirects.',
      reaction: { speaker: 'Maya', text: '« C’est une décision rationnelle. Je la respecte. » Le sujet reste sensible, sans reproche.' } },
    { decision: 'defer', label: 'Reporter la décision',
      gain: 'L’option reste ouverte jusqu’à la conception.',
      loss: 'Les compromis devront être faits plus tard, avec moins de marge.',
      reaction: { speaker: 'Daniel', text: '« L’indécision a aussi un coût. Nous trancherons à l’atelier, mais pas indéfiniment. »' } },
  ],
  secondaryConstraint: 'Chaque objectif secondaire ajoute ses instruments et réduit les marges de l’Acte II.',
};

export class StaticProfileCatalogRepository implements ProfileCatalogRepository {
  async getCatalog(): Promise<ProfileCatalog> { return CATALOG; }
}
