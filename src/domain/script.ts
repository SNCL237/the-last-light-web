import type { EndingId, FinalState } from './mission';

/** Textes narratifs des Actes II–VI (Parcours interactif). Contenu statique, à déplacer vers le CMS / i18n. */
type L = { speaker: string; text: string };
export const ELIAS_ARCHIVE: L = { speaker: 'Archive E. Moreau', text: '« Les calculs nominaux passent. Ce qui m’inquiète, c’est ce qui se passe lorsque deux systèmes demandent de l’énergie au même moment. Nous avons conçu pour le meilleur scénario, pas pour la mission réelle. »' };
export const ELIAS_UNFINISHED: L[] = [
  { speaker: 'Enregistrement — E. Moreau', text: '« Concevoir un système, ce n’est pas le faire fonctionner un jour de beau temps. C’est accepter la responsabilité de ce qui arrive quand… »' },
  { speaker: 'Maya', text: 'L’enregistrement s’arrête là. « Je ne sais toujours pas s’il a pu faire corriger ce qu’il avait vu. »' },
];
export const ELIAS_FINAL: L[] = [
  { speaker: 'E. Moreau — message complet', text: '« J’ai signalé les marges. On m’a répondu que les calculs passaient. Ils passaient. Mais une mission ne vit pas dans les calculs nominaux : elle vit dans les compromis que l’on accepte en le sachant. Il n’y a pas de solution parfaite, seulement des choix assumés. »' },
  { speaker: 'Maya', text: '« Ce n’était pas une faute, ni la sienne ni celle de Daniel. C’était une marge. Et cette fois, c’est nous qui avons choisi. »' },
];
export const CRISIS_VOICES: L[] = [
  { speaker: 'Noah', text: '« Chaque observation coupée, c’est une question qui reste sans réponse. »' },
  { speaker: 'Amara', text: '« Une donnée non transmise n’est pas une donnée sauvée. Nous devons préserver le lien et le système. »' },
  { speaker: 'Daniel', text: '« Nous avons encore un choix. Il faut simplement accepter ce qu’il coûte. »' },
  { speaker: 'Maya', text: '« Je ne veux pas refaire LUNAR-01. Mais je ne veux pas non plus tout éteindre par peur. »' },
];
export const RESOLUTION_MAYA: Record<FinalState, string> = {
  stable: '« Elle tient. Elle tient vraiment. »',
  degraded: '« Ce n’est pas la mission que nous avions dessinée. Mais elle parle encore. »',
  loss: '« Nous savions ce que nous risquions. Ce qui est arrivé à Terre compte. »',
};
export const ENDINGS: Record<EndingId, { title: string; result: string; impression: string; lines: L[]; conclusion: string }> = {
  legacy: { title: 'The Legacy Lives On', result: 'La mission atteint ses objectifs majeurs et récupère les données essentielles avec une performance technique solide.', impression: 'L’équipe transforme l’échec passé en réussite et ouvre une nouvelle voie scientifique.',
    lines: [{ speaker: 'Maya', text: '« Il aurait été fier. Pas de moi : de ce que nous avons appris. »' }, { speaker: 'Noah', text: '« Les données sont propres. On va publier pendant des années. »' }, { speaker: 'Amara', text: '« Lien nominal jusqu’au bout. Rien n’est resté là-haut. »' }, { speaker: 'Daniel', text: '« Cette fois, les marges étaient là où il fallait. »' }],
    conclusion: 'Une marge bien placée vaut mieux qu’un instrument de plus.' },
  fragment: { title: 'A Fragment of Hope', result: 'La mission réussit partiellement et ramène des données utiles, mais certains objectifs sont abandonnés.', impression: 'La perte est réelle, mais le travail n’a pas été vain.',
    lines: [{ speaker: 'Maya', text: '« Ce n’est pas tout. Mais c’est vrai, et c’est à nous. »' }, { speaker: 'Noah', text: '« Il manque des réponses. Les questions, elles, sont mieux posées. »' }, { speaker: 'Amara', text: '« Nous avons ramené ce que nous pouvions transmettre. »' }, { speaker: 'Daniel', text: '« Un résultat partiel reste un résultat. »' }],
    conclusion: 'Chaque objectif ajouté a un prix ; certains ne se paient qu’en orbite.' },
  last_signal: { title: 'The Last Signal', result: 'Une partie des capacités a été sacrifiée, ou la mission écourtée, pour préserver les données essentielles.', impression: 'Le dernier signal porte une décision consciente : sauver ce qui peut encore l’être.',
    lines: [{ speaker: 'Maya', text: '« Nous avons choisi ce que nous perdions. Lui n’a pas eu ce choix. »' }, { speaker: 'Noah', text: '« L’essentiel est arrivé. Je l’aurais voulu complet, pas perdu. »' }, { speaker: 'Amara', text: '« Le dernier paquet est arrivé. Le lien a tenu jusque-là. »' }, { speaker: 'Daniel', text: '« Assumer un sacrifice, c’est aussi diriger une mission. »' }],
    conclusion: 'Préserver le lien et l’essentiel peut valoir plus que tout garder.' },
  silence: { title: 'The Silence of Space', result: 'La mission est perdue ou les données essentielles ne sont pas récupérées.', impression: 'Le silence devient un avertissement pour les missions futures ; les leçons techniques restent.',
    lines: [{ speaker: 'Maya', text: '« Le même silence. Mais cette fois, nous savons pourquoi. »' }, { speaker: 'Noah', text: '« Ce qui n’est pas arrivé à Terre n’existe pas pour la science. »' }, { speaker: 'Amara', text: '« Le lien était trop étroit pour ce que nous produisions. »' }, { speaker: 'Daniel', text: '« Les leçons, elles, sont transmises. C’est déjà quelque chose. »' }],
    conclusion: 'Une donnée non transmise n’est pas une donnée sauvée.' },
};

/** Fenêtres d'introduction des sous-systèmes (Atelier, Acte II) : ce que c'est, pourquoi c'est important. */
export const SUBSYSTEM_INTROS: Record<string, { title: string; what: string; why: string; real: string; tip: string }> = {
  structure: { title: 'Structure : le squelette de l’orbiteur',
    what: 'Le bus porte tous les équipements, encaisse les vibrations et les accélérations du lancement, et sert de base au contrôle thermique.',
    why: 'Chaque kilogramme de structure se paie deux fois : en capacité du lanceur et en carburant pour freiner devant la Lune. Une structure légère libère de la masse pour la science, mais coûte plus cher.',
    real: 'LRO pesait environ 1 900 kg au lancement, dont près de la moitié en ergols.',
    tip: 'Commencez ici : sans structure, aucun autre sous-système ne peut être monté.' },
  power: { title: 'Énergie : produire au soleil, survivre dans l’ombre',
    what: 'Les panneaux solaires produisent l’électricité ; la batterie la stocke pour la traversée de l’ombre lunaire.',
    why: 'À 100 km d’altitude, l’orbiteur peut passer environ 47 minutes sur 118 dans l’ombre. La production moyenne sur l’orbite doit couvrir la consommation, et la batterie doit tenir l’éclipse sans se décharger trop profondément.',
    real: 'LRO disposait d’un panneau orientable d’environ 1,8 kW et d’une batterie lithium-ion.',
    tip: 'C’est ici que la note d’Elias prend tout son sens : prévoyez le cas où plusieurs systèmes consomment en même temps.' },
  comms: { title: 'Communications : une donnée non transmise n’est pas sauvée',
    what: 'Émetteurs et antennes relient l’orbiteur aux stations au sol pendant les fenêtres de contact.',
    why: 'Le volume quotidien transmis vaut le débit multiplié par le temps de contact. Si les instruments produisent davantage, la mémoire se remplit et des données sont perdues.',
    real: 'LRO transmettait ses données scientifiques en bande Ka à 100 Mbit/s vers la station de White Sands, et sa télémesure en bande S.',
    tip: 'Comparez la jauge « Données » à la capacité de transmission avant d’ajouter un instrument.' },
  control: { title: 'Contrôle : pointer juste, garder les données',
    what: 'Le contrôle d’attitude oriente l’orbiteur ; l’ordinateur de bord pilote les opérations et stocke les mesures entre deux contacts.',
    why: 'Un instrument mal pointé ne mesure rien d’utile, et une antenne mal pointée ne transmet rien. La mémoire de bord est le tampon entre la production de données et les fenêtres de contact.',
    real: 'LRO utilisait des roues de réaction et des viseurs stellaires pour viser la surface avec précision.',
    tip: 'Autour de la Lune, les magnétocoupleurs sont inutiles : il n’y a pas de champ magnétique global sur lequel s’appuyer.' },
  payload: { title: 'Charge utile : les instruments qui répondent aux questions',
    what: 'Les instruments scientifiques mesurent ce que vos objectifs demandent : hydrogène, températures, relief, rugosité.',
    why: 'C’est la raison d’être de la mission, et le premier poste de dépense en masse, en énergie et en données. Un objectif sans instrument adapté ne peut pas être atteint.',
    real: 'Les masses et puissances du catalogue sont celles des instruments de LRO : LROC, LEND, Diviner, Mini-RF.',
    tip: 'Chaque instrument est associé à vos objectifs : ajoutez d’abord ceux de l’objectif principal.' },
  propulsion: { title: 'Propulsion : freiner devant la Lune, puis tenir l’orbite',
    what: 'Le moteur et ses ergols fournissent le Δv nécessaire à l’insertion en orbite lunaire, puis aux corrections régulières de l’orbite.',
    why: 'Sans Δv suffisant, l’orbiteur passe devant la Lune sans s’y arrêter, ou son orbite se dégrade. La masse d’ergols croît exponentiellement avec le Δv demandé (équation de Tsiolkovski).',
    real: 'LRO s’est inséré en orbite lunaire le 23 juin 2009, cinq jours après son lancement.',
    tip: 'Une orbite basse demande plus de corrections : la propulsion se choisit avec l’orbite en tête.' },
};
