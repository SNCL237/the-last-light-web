import type { BriefingContent } from '../domain/briefing';
import type { BriefingRepository } from '../domain/ports';

/** Textes = propositions de rédaction. Les trois postures sont à valider par le game design. */
const CONTENT: BriefingContent = {
  context: [
    "2042. Un programme international fictif d'exploration lunaire prépare une nouvelle mission vers les régions polaires de la Lune.",
    "En 2036, LUNAR-01 a perdu le contact. Le signal s'est interrompu avant toute explication complète.",
    'Vous rejoignez l\'équipe du programme successeur : c\'est vous qui prendrez les décisions de mission.',
  ],
  objectives: [
    "Concevoir une mission lunaire et décider de ce qui mérite d'être sauvé.",
    "Définir vos priorités scientifiques, assembler l'orbiteur, choisir lanceur et orbite, puis piloter la mission.",
  ],
  constraints: [
    'Masse, puissance, énergie, budget, données, communications, temps, carburant et fiabilité sont suivis tout au long de la mission.',
    'Chaque choix a une conséquence : aucune configuration n\'est parfaite.',
    "Après le lancement, il n'est plus possible de revenir à l'atelier.",
  ],
  characters: [
    { id: 'maya', name: 'Dr. Maya Moreau', role: 'Ingénieure système', priority: 'Comprendre le passé', voice: 'Précise, retenue', initials: 'MM' },
    { id: 'daniel', name: 'Daniel Hayes', role: 'Directeur de mission', priority: 'Tenir la mission', voice: 'Pragmatique, mesuré', initials: 'DH' },
    { id: 'noah', name: 'Dr. Noah Williams', role: 'Responsable scientifique', priority: 'Maximiser la science', voice: 'Curieux, ambitieux', initials: 'NW' },
    { id: 'amara', name: 'Amara Okafor', role: 'Opérations de vol et communications', priority: 'Préserver les opérations', voice: 'Directe, prudente', initials: 'AO' },
  ],
  postures: [
    { id: 'prudent', label: 'Prudente', summary: 'Garder des marges avant tout.',
      reaction: { speaker: 'Amara Okafor', text: 'Une approche qui protège les systèmes et les données. Gardons cet état d\'esprit.' },
      question: 'Qu\'est-ce qui doit nous rendre prudents ?',
      answer: { speaker: 'Dr. Maya Moreau', text: "Le signal de LUNAR-01 s'est interrompu avant toute explication complète. Nous n'avons pas encore toute l'histoire." } },
    { id: 'balanced', label: 'Équilibrée', summary: 'Chercher le meilleur compromis.',
      reaction: { speaker: 'Daniel Hayes', text: 'Tenir une mission, c\'est arbitrer. Nous le ferons ensemble.' },
      question: 'Que sait-on de LUNAR-01 ?',
      answer: { speaker: 'Daniel Hayes', text: 'Le contact a été perdu en 2036. Le reste, vous le découvrirez au fil de la conception.' } },
    { id: 'ambitious', label: 'Ambitieuse', summary: 'Viser le maximum de science.',
      reaction: { speaker: 'Dr. Noah Williams', text: 'Voilà un état d\'esprit que je comprends. Il faudra en assumer le coût.' },
      question: 'LUNAR-01 aurait-il pu faire mieux ?',
      answer: { speaker: 'Dr. Noah Williams', text: "Peut-être. C'est aussi ce que cette mission doit nous aider à comprendre." } },
  ],
};
export class StaticBriefingRepository implements BriefingRepository {
  async getBriefing(): Promise<BriefingContent> { return CONTENT; }
}
