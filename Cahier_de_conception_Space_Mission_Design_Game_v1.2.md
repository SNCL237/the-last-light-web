# Cahier de conception : Space Mission Design Game

*Architecture par domaines métier indépendants (projet THE LAST LIGHT, charte « Orbita »)*

Institut Universitaire Saint Jean · Saint Jean Ingénieur, branche ISI

Cadre : challenge hackathon · Référentiel : note de service N° 2025-003/ISJ/DA/ISI

Équipe projet : à compléter (noms des membres et rôles)

Version 1.2 · 14 novembre 2026 (fixe la pile technique : **NestJS** pour le backend, **React et Three.js** pour le frontend ; la v1.1 mettait la v1.0 en conformité avec le cahier d’analyse v1.2 : domaines métier indépendants)

## 1. Introduction

Ce cahier de conception fait suite au cahier d’analyse v1.2. Là où l’analyse décrivait ce que le système doit faire et le découpait en dix domaines métier, la conception décrit comment chaque domaine est construit et comment les domaines communiquent.

**Modifications de la v1.2 (pile technique)**

- **Backend : NestJS** (Node.js, TypeScript strict, adaptateur Express par défaut) à la place de Fastify. **Un module NestJS par domaine**, assemblé uniquement dans la racine de composition `apps/server`.
- **Frontend : React avec Three.js** (React + TypeScript + Vite, Tailwind CSS, scène 3D Three.js avec repli SVG / Canvas sans 3D).
- Nouvelle section **4.2.3 « Décisions de pile technique »** : conventions NestJS, conventions React et Three.js, points à valider.
- Sections 2.2, 3, 4.2.1, 4.2.2, 5.1, 5.3, 5.4 et 7 mises à jour. Les contrats, les algorithmes, le modèle de classes, le thème et les maquettes **ne changent pas**.
- Le choix de NestJS ne remet pas en cause l’indépendance des domaines : les règles métier et les moteurs restent des paquets sans dépendance au framework (voir 4.2.3).

**Modifications par rapport à la v1.0**

- Architecture en **monolithe modulaire** : un paquet de code, un schéma de base de données et un module NestJS (contrôleurs d’API, services, dépôts) par domaine.
- **Contrats typés** entre domaines (C1 à C9), seul moyen d’échange autorisé.
- Modules M1 à M11 redistribués dans les dix domaines ; ajout du moteur de campagne (progression, déblocage) et du moteur de contenu narratif.
- Algorithmes rattachés à leur domaine ; nouveaux algorithmes : crise énergétique, déblocage, validation d’import de scénario.
- Alignement sur l’analyse : score sur **1000** (au lieu de 100), sept actes, quatre fins, orbiteur (au lieu de satellite), scène 3D retenue (Three.js).

## 2. Présentation du projet

### 2.1 Objectifs du système

- **O1.** Concevoir une mission complète (objectifs, orbiteur, instruments, orbite, lanceur) en solo ou en équipe de 4 avec rôles.
- **O2.** Rendre visibles en temps réel six ressources : masse, puissance, budget, données, communications, temps.
- **O3.** Simuler la mission de façon déterministe, produire un score et un rapport qui expliquent les causes.
- **O4.** Rester léger (navigateur, faible bande passante) et pédagogique.
- **O5 (nouveau).** Garantir l’indépendance des domaines : chacun se développe, se teste et évolue sans casser les autres.

La simulation est un module pur partagé, exécuté côté client pour l’aperçu instantané et côté serveur pour le résultat officiel (anti-triche).

### 2.2 Interfaces du système

Interfaces avec l’environnement extérieur (et non écrans). Chaque domaine expose sa propre API sous `/api/<domaine>`, portée par les contrôleurs NestJS de son module.

| Réf. | Partenaire | Protocole | Usage |
| --- | --- | --- | --- |
| I1 | Navigateur du joueur (application React) | HTTPS / REST (JSON), documentation OpenAPI | Une API par domaine (contrôleurs NestJS) : comptes, catalogue, scénarios, conception, campagne, résultats |
| I2 | Navigateur du joueur (application React) | WebSocket (Socket.IO, passerelles NestJS) | Équipe (EQU), votes, progression de la simulation (SIM) |
| I3 | Base de données | SQL (TCP) | Persistance, un schéma par domaine |
| I4 | Fournisseur d’authentification (optionnel) | OAuth 2.0 | Connexion par compte tiers (IDE) |
| I5 | Sources ouvertes NASA / ESA | Fichiers JSON ou CSV importés au build | Calibrage du catalogue (CAT), aucun appel en jeu |
| I6 | Service e-mail (optionnel) | SMTP | Invitation d’équipe (EQU) |

### 2.3 Contraintes générales de conception

- **Délai.** Hackathon : périmètre priorisé (indispensable, important, bonus), livraison par domaine.
- **Connectivité limitée.** Pages légères (objectif inférieur à 1 Mo hors images et modèles 3D), scène 3D allégée avec version dégradée sans 3D, aucune dépendance externe en jeu.
- **Protection des données.** Minimisation (pseudo et e-mail), mots de passe hachés, principes du RGPD.
- **Intégrité du classement.** Tout score classé est recalculé côté serveur.
- **Données réalistes mais simplifiées.** Ordres de grandeur cohérents avec le réel (RG12).
- **Accessibilité.** Contraste suffisant, clavier, textes traduisibles (fr, en).
- **Frontières de domaine (nouveau).** Les règles d’import entre paquets sont vérifiées automatiquement en intégration continue.

## 3. Documents de référence

- Énoncé du challenge « Space Mission Design Game » et onglet Resources.
- Game Design Document « THE LAST LIGHT » v1.0.
- Note de service N° 2025-003/ISJ/DA/ISI : structure des livrables ISI.
- Cahier des charges technique du projet.
- Cahier d’analyse v1.2 (découpage en domaines, contrats C1 à C9, règles RI1 à RI7).
- Fichier `Agent.md` (contraintes de réalisation du backend NestJS).
- Documentation officielle de NestJS, React, Vite, Tailwind CSS et Three.js.
- Données publiques NASA et ESA (lanceurs, orbites, instruments).
- Normes citées en 4.3 : ISO/IEC 12207, IEEE 730, IEEE 1059, IEEE 1028, ISO 27005.

## 4. Normes, standards et outils

### 4.1 Méthodes de conception

| Élément | Choix | Justification |
| --- | --- | --- |
| Démarche | Scrum allégé (sprints de quelques heures, backlog priorisé), **une équipe de sprint par domaine ou groupe de domaines** | Délai très court ; travail en parallèle |
| Modélisation | UML (cas d’utilisation, classes, séquence, composants, déploiement) et **carte des contextes** (DDD) | Exigé par les livrables ISI ; lisible par tous |

### 4.2 Environnement et outils de développement

#### 4.2.1 Matériels et outils

| Couche | Choix | Justification |
| --- | --- | --- |
| Front-end | **React** + TypeScript (mode `strict`) + Vite | Composants réutilisables, typage, build rapide |
| Style | Tailwind CSS | Cohérence du thème |
| Visualisation | **Three.js** (Lune, orbiteur, trajectoire) intégré dans des composants React, avec repli SVG / Canvas sans 3D | Exigence BF27 ; version dégradée pour connexions faibles |
| Back-end | **NestJS** (Node.js, TypeScript `strict`, adaptateur Express par défaut), **un module NestJS par domaine** | Même langage que le front ; structure modulaire native ; injection de dépendances adaptée aux ports du cahier |
| Configuration | `@nestjs/config`, variables d’environnement validées par Zod | Démarrage refusé si la configuration est invalide |
| Événements | `@nestjs/event-emitter` (bus en mémoire du contrat C9) | Bus remplaçable plus tard sans toucher aux domaines |
| Documentation d’API | `@nestjs/swagger` (OpenAPI) | API documentée à partir du code |
| Validation | Zod (schémas des contrats et des requêtes) via un `ZodValidationPipe` maison | Un seul langage de schéma, partagé avec le front |
| Authentification | `@nestjs/jwt` et guards ; mots de passe hachés (argon2 ou bcrypt) ; mode invité et profil local | Voir IDE ; minimisation des données |
| Temps réel | Socket.IO via `@nestjs/websockets` et `@nestjs/platform-socket.io` | Salles d’équipe, progression |
| Base de données | PostgreSQL, **un schéma par domaine** (SQLite en développement) | Isolation des données (RI1) |
| Persistance | TypeORM, un schéma par domaine (**hypothèse à valider**, voir 4.2.3) | Entités et migrations par domaine |
| Contrats | Paquet `@smdg/contracts` (types TypeScript + schémas Zod) | Un seul endroit pour C1 à C9 |
| Noyau physique | Paquet `@smdg/physics` (fonctions pures) | Formules orbitales partagées par CON et SIM |
| Moteurs | `@smdg/simulation` et `@smdg/evaluation` (purs, sans réseau ni base, **sans dépendance à NestJS ni à React**) | Exécutables client (React) et serveur (NestJS), testables seuls |
| Données | JSON versionnés (catalogue, scénarios) chargés en base | Extensibilité sans toucher au code |
| Tests | Vitest (domaines, contrats, moteurs) avec `@nestjs/testing` et `supertest` côté backend ; Playwright (parcours du front) | Moteurs critiques ; tests e2e de l’`AppModule` |
| Qualité | ESLint, Prettier, dependency-cruiser | Style, frontières de domaine |
| Outils | Git/GitHub, Figma, draw.io / Mermaid, Docker, pnpm (workspaces recommandé) | Collaboration, déploiement, monorepo |

#### 4.2.2 Standards de programmation

- TypeScript strict, ESLint, Prettier.
- Moteurs en fonctions pures : pas d’effet de bord, pas d’accès réseau ; aléatoire uniquement via un générateur à graine (mulberry32).
- Nommage : camelCase (variables), PascalCase (types), unités dans les noms (massKg, powerW, dataMbps).
- Commits conventionnels, revue de code obligatoire avant fusion.
- **Règles de frontière** : un paquet de domaine importe uniquement `@smdg/kernel`, `@smdg/contracts` et, pour CON et SIM, `@smdg/physics`. Tout import d’un autre domaine échoue en CI. Seul CAM dépend des contrats d’autres domaines pour les orchestrer.
- **Règles propres à NestJS** (détaillées en 4.2.3) : aucun import de `@nestjs/*` dans `domain/`, dans les moteurs, ni dans `kernel`, `contracts`, `physics` ; aucun module de domaine n’importe la classe de module d’un autre domaine ; `forwardRef` et dépendances circulaires interdits.
- **Règles propres au front** : aucune règle métier dans les composants React ; le front appelle les paquets purs pour l’aperçu et l’API pour le résultat officiel.

#### 4.2.3 Décisions de pile technique

Cette section fixe les choix de réalisation. Ils ne modifient ni le découpage en domaines, ni les contrats, ni les algorithmes.

**A. Backend : NestJS**

| Sujet | Décision |
| --- | --- |
| Framework | NestJS en TypeScript `strict` ; **un module NestJS par domaine** : `IdentiteModule`, `CatalogueModule`, `ScenariosModule`, `ConceptionModule`, `SimulationModule`, `EvaluationModule`, `CampagneModule`, `EquipeModule`, `PedagogieModule`, `ClassementModule` |
| Structure d’un domaine | `domain/` (règles métier pures, **aucun import NestJS**), `application/` (cas d’utilisation, services NestJS minces qui appellent des fonctions pures), `infrastructure/` (dépôts, fichiers), `api/` (contrôleurs, passerelles WebSocket, abonnements aux événements), plus `<domaine>.module.ts` |
| Paquets purs | `kernel`, `contracts`, `physics` et les moteurs `simulation` et `evaluation` n’importent **jamais** `@nestjs/*` : ils sont compilés en ESM et en CJS, car le front React les réutilise pour l’aperçu |
| Racine de composition | `apps/server/src/app.module.ts` est le **seul** endroit qui connaît tous les modules |
| Ports et jetons | Chaque domaine expose ses capacités par une interface et un jeton d’injection (`Symbol`) déclarés dans `@smdg/contracts` : `CONCEPTION_PORT`, `SIMULATION_PORT`, `EVALUATION_PORT`, `EVENT_BUS`. Le module du domaine fournit et exporte son implémentation sous ce jeton |
| Campagne | CAM reçoit ses dépendances par **module dynamique** : `CampagneModule.register({ imports: [ScenariosModule, ConceptionModule, SimulationModule, EvaluationModule, IdentiteModule] })`, appelé dans `AppModule`. CAM injecte uniquement des jetons (`@Inject(CONCEPTION_PORT)`) et n’importe jamais le code des autres domaines |
| Événements (C9) | Port `EVENT_BUS` implémenté dans `apps/server` avec `@nestjs/event-emitter` (abonnements par `@OnEvent`) ; charges utiles typées et validées par Zod ; bus remplaçable |
| Contrôleurs | Minces : validation d’entrée (pipe Zod), appel d’un cas d’utilisation, réponse issue des contrats ; aucune règle métier |
| Temps réel | Classes `@WebSocketGateway` dans `api/` (EQU et SIM), authentifiées par le même guard JWT que l’API REST |
| Transverse | Dans `apps/server` et non dans les domaines : `ConfigModule`, filtre d’exceptions global (`{ code, params, statut }`), guards JWT et rôles, `ZodValidationPipe`, journalisation, génération OpenAPI |
| Persistance | Une configuration de connexion par domaine pointant vers son schéma ; **interdit** de déclarer une relation entre entités de domaines différents ; migrations par domaine |
| Injection | `@Inject(JETON)` explicite pour les ports |

**B. Frontend : React avec Three.js**

| Sujet | Décision |
| --- | --- |
| Framework et build | React + TypeScript `strict`, construit avec Vite ; styles Tailwind CSS ; thème « Orbita » (6.3) porté par des jetons de style de la couche de présentation |
| Rôle de la couche | Présentation uniquement : elle lit les vues des domaines et appelle les paquets purs pour l’aperçu instantané ; le résultat **officiel** est toujours celui du serveur |
| Communication | REST JSON sous `/api/<domaine>` (jeton JWT dans l’en-tête d’autorisation) ; client Socket.IO pour l’équipe et la progression de la simulation ; les réponses sont validées avec les schémas Zod de `@smdg/contracts` |
| Three.js | Scène 3D (Lune, orbiteur, trajectoire) encapsulée dans des composants React : cycle de vie propre (création, boucle de rendu, **libération** des géométries, textures et rendus au démontage), boucle de rendu suspendue quand l’onglet est masqué |
| Poids de la page | La scène 3D est chargée **à la demande** (découpage de code) pour tenir l’objectif de moins de 1 Mo hors images et modèles 3D (2.3) ; textures et modèles compressés ; imports ciblés de Three.js pour limiter le poids |
| Repli sans 3D | Détection de WebGL ; en cas d’absence ou de choix du joueur, vue **SVG / Canvas** de l’orbite ; toute la campagne reste jouable sans 3D (BF27) |
| Source des données 3D | La **vue de mission** exposée par le backend (paramètres orbitaux, positions échantillonnées, chronologie) ; aucune trajectoire n’est recalculée dans le composant 3D |
| Accessibilité et langues | Contrastes du thème conformes, navigation clavier, textes traduisibles (fr, en) |
| Tests | Playwright pour les parcours ; tests d’interface pour les jauges et les seuils 90 % et 100 % |

**C. Points à valider**

| Réf. | Point | Hypothèse retenue |
| --- | --- | --- |
| PT1 | Couche de persistance avec NestJS : TypeORM (schéma par entité) ; alternatives Prisma, Drizzle, Kysely | TypeORM, à valider **avant** l’étape 2 du plan d’implémentation |
| PT2 | Lanceur de tests : Vitest avec le plugin SWC (`unplugin-swc`) pour les métadonnées de décorateurs ; Jest reste le choix par défaut de NestJS | Vitest avec `unplugin-swc` |
| PT3 | Intégration de Three.js dans React : utilisation directe de Three.js dans des composants, ou surcouche React dédiée | Utilisation directe de Three.js (moins de dépendances) ; à confirmer |
| PT4 | Bibliothèques du front non fixées : routage, gestion d’état, internationalisation | À choisir avant l’étape 6 ; aucune dépendance ajoutée sans accord |
| PT5 | Compatibilité des paquets purs en double format (ESM pour le front, CJS pour NestJS) | Compilation ESM et CJS ; test de parité client / serveur en intégration |

### 4.3 Plan de qualité

Basé sur ISO/IEC 12207 :

- **Assurance qualité (IEEE 730)** : checklist de revue et critères d’acceptation par fonctionnalité et par domaine.
- **Vérification et validation (IEEE 1059)** : tests unitaires par domaine, **tests de contrat** (le producteur respecte le schéma, chaque consommateur sait le lire), tests d’intégration de l’API, parcours de bout en bout.
- **Revues (IEEE 1028)** : revue de code par un pair, revue de sprint, revue des frontières (dependency-cruiser).
- **Gestion des configurations** : Git, branches par fonctionnalité, versions de catalogue, de scénario et de contrat.
- **Gestion des risques (ISO 27005)** : triche, fuite de données, indisponibilité du temps réel, **dérive des contrats** (contre-mesure : version de contrat et tests de contrat).

## 5. Conception générale

### 5.1 Architecture par domaines

Structure du dépôt (monorepo) :

```
packages/
  kernel/        identifiants, unités, types communs minimaux
  contracts/     contrats C1 à C9 (types + schémas)
  physics/       période, éclipse, contact sol, Tsiolkovski (fonctions pures)
  domains/
    identite/  catalogue/  scenarios/  conception/  simulation/
    evaluation/  campagne/  equipe/  pedagogie/  classement/
apps/
  server/        NestJS : AppModule, racine de composition qui assemble un module par domaine
  web/           React + Vite + Three.js (couche de présentation)
```

Chaque domaine a quatre dossiers : `domain/` (règles métier pures), `application/` (cas d’utilisation, services NestJS minces), `infrastructure/` (base de données, fichiers), `api/` (contrôleurs REST, passerelles WebSocket, abonnements aux événements), plus un fichier `<domaine>.module.ts` à la racine du paquet. Les règles métier (`domain/`) et les moteurs ne dépendent d’aucun framework : NestJS n’apparaît que dans `application/`, `infrastructure/`, `api/` et le fichier de module.

### 5.2 Identification des modules par domaine

| Domaine | Paquet | Modules (v1.0) repris | Contenu |
| --- | --- | --- | --- |
| IDE | `identite` | M1 | Inscription, connexion, JWT, profil local, mode invité, langue |
| CAT | `catalogue` | M2 (catalogue), M11 (admin) | Composants, instruments, orbites, lanceurs, stations ; versions ; import |
| SCE | `scenarios` | M2 (scénarios), M11 (admin), **nouveau** moteur de contenu | Paquets de scénarios, actes, archives, fins, conditions ; import validé ; versionnage |
| CON | `conception` | M3, M4 (bilans) | Atelier : objectifs, orbiteur, instruments, lanceur, orbite ; bilans ; compatibilité ; configuration figée |
| SIM | `simulation` | M5 | Phases, opérations, énergie, ombre, stockage, transmissions, événements, crise |
| EVA | `evaluation` | M6 | Score sur 1000, fin A à D, rapport et causes |
| CAM | `campagne` | M9 (sauvegarde), **nouveau M12** | Moteur de campagne (actes), orchestration, progression, déblocage, journal des décisions, sauvegarde versionnée |
| EQU | `equipe` | M7 | Salles, rôles, propositions, votes (V2) |
| PED | `pedagogie` | M8 | Glossaire, tutoriel, info-bulles, rendu des codes d’explication fr/en |
| CLA | `classement` | M9 (partage), M10 | Classement, partage et comparaison (V3) |

### 5.3 Communication entre domaines

- **Appels synchrones** par interfaces TypeScript (ports) injectées par jeton (`@Inject(CONCEPTION_PORT)`, etc.). Seul CAM appelle SCE, CON, SIM et EVA, pour orchestrer. Les autres domaines n’appellent jamais CAM.
- **Événements** (contrat C9) publiés sur un bus en mémoire typé (`EVENT_BUS`, implémenté avec `@nestjs/event-emitter`) ; extractible plus tard vers une file de messages sans changer les domaines.
- **Données partagées** : uniquement des identifiants et des copies immuables versionnées (ConfigurationFigée, PaquetScénario). Aucun domaine ne lit le schéma d’un autre.

| Domaine | Dépendances autorisées |
| --- | --- |
| IDE, CAT, SIM, EVA, PED | aucune |
| SCE | CAT (validation des identifiants à l’import) |
| CON | CAT en lecture (C1) ; reçoit le paquet de scénario (objectifs, catalogue autorisé) de CAM, sans appeler SCE |
| EQU | CON (estimation d’impact, application d’une décision), IDE |
| CLA | événement BilanPublié (EVA), IDE |
| CAM | SCE, CON, SIM, EVA, IDE |

Le graphe est sans cycle (RI4). La figure du diagramme de composants est à régénérer à partir de ce tableau.

### 5.4 Diagramme de déploiement

- **Poste ou mobile du joueur** : navigateur, application React (SPA) avec scène Three.js chargée à la demande.
- **Hébergement statique (CDN)** : fichiers du build Vite et modèles 3D compressés.
- **Serveur applicatif (Docker)** : un conteneur Node.js unique exécutant l’application NestJS (un module par domaine : API REST, passerelles Socket.IO) et les moteurs.
- **Serveur de données** : PostgreSQL avec dix schémas (`ide`, `cat`, `sce`, `con`, `sim`, `eva`, `cam`, `equ`, `ped`, `cla`). **Aucune clé étrangère ni jointure entre schémas** : les références sont des identifiants et des versions (RI2).

## 6. Conception détaillée

### 6.1 Contrats et classes de conception

Tous les attributs sont typés. Contrats principaux (`@smdg/contracts`) :

```ts
type Id = string; // UUID
interface CodeExplication { code: string; params: Record<string, number | string>; }

interface ConfigurationFigee {              // C3 : CON -> SIM
  configurationId: Id; version: number;
  scenarioId: Id; versionScenario: string; versionCatalogue: string;
  orbiteur: { masseSecheKg: number; carburantKg: number; puissanceProduiteW: number;
    puissanceConsommeeW: number; capaciteBatterieWh: number; coutMUSD: number;
    elements: ElementFige[]; instruments: InstrumentFige[] };
  orbite: { type: OrbiteType; altitudeKm: number; inclinaisonDeg: number; fractionEclipse: number };
  lanceur: { id: Id; capaciteKg: number; fiabilite: number };
  objectifs: { principal: Id; secondaires: Id[] };
  margeDv: number; difficulte: 'decouverte' | 'ingenieur' | 'expert';
}

interface ResultatSimulation {              // C4 : SIM -> EVA
  simulationId: Id; graine: number; dureeSimuleeJours: number;
  issue: 'nominale' | 'ecourtee' | 'perdue';
  serie: PointJournalier[];                 // jour, puissanceW, batterieWh, tamponGbit, science
  evenements: EvenementApplique[]; decisionsCrise: DecisionCriseApp[];
  sousSystemes: Record<Id, EtatSousSysteme>;
  scienceCumulee: number; scienceMax: number;
  donneesPerduesGbit: number; carburantRestantKg: number;
}

interface BilanMission {                    // C5 : EVA -> CAM, CLA, PED
  missionRef: Id; scoreTotal: number;       // sur 1000
  scores: { science: number; technique: number; ressources: number; fiabilite: number; collab: number };
  fin: 'A' | 'B' | 'C' | 'D'; causes: CodeExplication[];
  decisionsCles: Id[]; recommandations: CodeExplication[];
}
```

Le contrat C2 (PaquetScénario) contient : `cible`, `budgetMaxMUSD`, `objectifs[]`, `catalogueAutorise: Id[]`, `actes[7]`, `definitionsEvenements[]`, `fins[4]` avec `regles`, `conditionsDeblocage[]` et `version`. Les contrats C1, C6 à C9 suivent le même principe.

Classes principales par domaine (signatures) :

| Domaine | Classe et signatures |
| --- | --- |
| IDE | `Utilisateur { id: Id; pseudo: string; email: string; langue: 'fr' \| 'en'; sAuthentifier(email: string, mdp: string): Session }` |
| CAT | `Catalogue { lire(version: string): ReferentielCatalogue; importer(fichier: File): RapportImport }` |
| SCE | `Scenario { id: Id; ordre: number; version: string; valider(): RapportValidation; publier(): PaquetScenario }` |
| CON | `ConfigurationMission { id: Id; missionId: Id; statut: Statut; ajouterElement(e: ElementInstalle): Bilan[]; retirerElement(id: Id): Bilan[]; choisirLancement(lanceurId: Id, orbiteId: Id): RapportVerification; valider(): RapportVerification; figer(): ConfigurationFigee }` |
| SIM | `demarrer(c: ConfigurationFigee, graine: number): EtatSimulation` ; `avancer(e: EtatSimulation, cmds: Commande[], jours: number): EtatSimulation` ; `decider(e: EtatSimulation, choix: ChoixCrise): EtatSimulation` ; `terminer(e: EtatSimulation): ResultatSimulation` |
| EVA | `evaluer(r: ResultatSimulation, regles: ReglesFin, collab?: number): BilanMission` ; `RapportMission { generer(b: BilanMission): Rapport; exporter(format: 'pdf' \| 'json'): File }` |
| CAM | `Mission { creer(scenarioId: Id, userId: Id): Mission; lancer(): void; sauvegarder(): Sauvegarde; reprendre(id: Id): Mission; cloturer(b: BilanMission): void }` ; `ProgressionScenario { evaluerConditions(c: ConditionDeblocage[]): Id[]; mettreAJour(b: BilanMission): void }` |
| EQU | `Equipe { inviter(email: string): void; attribuerRole(m: Id, r: Role): void }` ; `Proposition { cloturer(): Statut }` ; `Membre { proposer(d: Delta): Proposition; voter(p: Id, choix: Choix): Vote }` |
| PED | `MessageExplicatif { rendre(c: CodeExplication, langue: 'fr' \| 'en'): string }` |
| CLA | `Classement { actualiser(b: BilanMission): void; afficher(portee: Portee): Rang[] }` |

Le diagramme de classes de conception est à produire par domaine (dix figures), les liens entre domaines étant des identifiants.

### 6.2 Algorithmes

Les valeurs numériques sont des paramètres du catalogue ; les formules sont fixes.

**A1. Bilans de ressources en temps réel (CON)**

```
masseSeche      = Σ masse(éléments) + Σ masse(instruments)
carburant       = masseSeche × (exp(Δv × (1 + margeDv) / (Isp × g0)) − 1)   // Tsiolkovski
masseTotale     = masseSeche + carburant
puissanceCons   = Σ puissance(c) × dutyCycle(c)
puissanceProd   = nbPanneaux × puissanceParPanneau × (1 − dégradationAn × duréeAns)
coût            = Σ coût(éléments) + coût(lanceur) + coûtOpsAn × duréeAns
débitGénéré     = Σ débit(instrument) × tempsObservationParJour      // Gbit/jour
alerte(bilan)   = consommé / capacité ≥ seuil                        // 90 % orange, 100 % rouge
```

**A2. Compatibilité lanceur et orbite (CON)**

```
fonction verifierCompatibilite(masseTotale, orbite, lanceur):
  si orbite.type ∉ lanceur.capaciteKg : retourner (ECHEC, code "ORBITE_INACCESSIBLE")
  cap = lanceur.capaciteKg[orbite.type]
  si masseTotale > cap : retourner (ECHEC, code "MASSE_DEPASSE", params {écart},
       suggestions : réduire la masse | autre orbite | autre lanceur)
  si masseTotale > 0.9 × cap : retourner (ALERTE, code "MARGE_FAIBLE")
  retourner OK
```

**A3. Orbite, éclipse et batterie (`@smdg/physics`, utilisé par CON et SIM)**

```
a = R_terre + altitude                    // R_terre = 6371 km (rayon lunaire pour l’orbite lunaire)
T = 2π × √(a³ / μ)                        // μ du corps central
tEclipse = fractionEclipse(orbite) × T
capaciteBatterieMin = puissanceCons × tEclipse / (3600 × profondeurDécharge × η)
```

**A4. Communications et données (`@smdg/physics`)**

```
ε = 10° ; λ = acos( R × cos(ε) / a ) − ε ; tContactMax = T × λ / π
tContactMoyen = 0.6 × tContactMax
volumeDescendant/jour = débitLiaison × tContactMoyen × passagesParJour × (1 − surcoût)
si volumeDescendant < volumeGénéré : mémoire saturée, données perdues = écart
```

**A5. Fiabilité et durée de vie (SIM)**

```
R(t) = Π exp(−t / MTBF_i)
duréeVie = min(duréeCible, dégradationPanneaux, autonomieCarburant, toléranceRadiation)
```

**A6. Simulation déterministe (SIM), mise à jour : énergie, ombre, stockage, transmissions, crise**

```
fonction simuler(config: ConfigurationFigee, graine):
  rng = mulberry32(graine) ; journal = []
  // Phase 1 : lancement
  si rng() > config.lanceur.fiabilité : retourner issue "perdue"
  // Phase 2 : insertion en orbite, pannes initiales des composants critiques
  // Phase 3 : opérations, pas de 1 jour
  pour jour de 1 à duréeVie :
    prod   = puissanceProd(jour)
    ombre  = A3.tEclipse(jour)
    si batterie(jour) < besoinOmbre : sousSystèmes passés en mode dégradé
    si rng() < probaÉvénement(difficulté, indices accumulés) :
      e = tirerÉvénement(rng)                // définitions fournies par le paquet de scénario
      appliquer(e) ; journal.ajouter(e)
    données = collecte(instruments actifs, prod)
    transmises = min(données + tampon, A4.volumeDescendant)
    tampon += données − transmises ; si tampon > capacitéStockage : perte
    science += valeurScientifique × (transmises / données)
    si anomalieÉnergétique(état) : publier AnomalieDétectée ; attendre décision (A9)
  // Phase 4 : fin de vie
  retourner ResultatSimulation
```

**A7. Score sur 1000 et détermination de la fin (EVA)**

```
science    = 300 × scienceCumulée / scienceMax            // objectif principal pondéré 60 %, secondaires 40 %
technique  = 250 × moyenne(disponibilité des sous-systèmes, marges respectées)
ressources = 200 × (0.5 × (1 − budgetUtilisé / budgetMax) + 0.5 × (1 − donnéesPerdues / donnéesGénérées))
fiabilité  = 150 × R(duréeVie) × (1 − pénalité(risque accru choisi))
collab     = 100 × tauxParticipation × (1 − conflits)     // en solo : 100 points redistribués
                                                            // proportionnellement sur les 4 autres
scoreTotal = science + technique + ressources + fiabilité + collab
fin        = première règle satisfaite parmi A, B, C, D selon regles(scénario)
             // exemple à calibrer : A = objectifs atteints et score ≥ seuilA ; D = mission perdue
causes     = pour chaque bilan critique (> 90 %) ou événement impactant : CodeExplication
```

**A8. Vote d’équipe (EQU)**

```
fonction cloturerProposition(p):
  pour, contre = compter(p.votes)
  si votants < quorum (⌈n/2⌉) et non échu : attendre
  si pour > contre : envoyer DécisionÉquipe à CON ; statut = ACCEPTÉE
  sinon si pour == contre : décision du directeur de mission
  sinon : statut = REFUSÉE
  journal.ajouter(p)
```

**A9. Gestion de la crise (SIM)**

```
fonction decider(état, choix):
  selon choix :
    désactiver instrument i : puissanceCons −= puissance(i) ; science −= valeur(i) × joursRestants
    réduire transmissions   : tampon augmente ; risque de saturation
    suspendre observations  : science stoppée, batterie préservée
    basse consommation      : sous-systèmes non critiques hors ligne
    poursuivre              : risqueAccru = vrai (pénalité en A7)
  recalculer ressources et objectifs ; consigner DécisionCrise
```

**A10. Déblocage des scénarios (CAM)**

```
fonction evaluerDeblocage(progression, scénarios):
  pour s dans scénarios où statut(s) == VERROUILLÉ :
    si ∀ c ∈ s.conditions : estRemplie(c, progression) : statut(s) = DISPONIBLE
estRemplie(c, p) = selon c.type :
  prérequis → p[c.scenarioPrerequis].statut == TERMINÉ
  fin       → rang(p.finObtenue) ≤ rang(c.finMinimale)         // A < B < C < D
  score     → p.meilleurScore ≥ c.scoreMinimal
```

**A11. Validation d’un import de scénario (SCE)**

```
vérifier schéma et version ; exactement 7 actes et 4 fins ;
chaque fin atteignable par au moins un résultat possible ;
chaque identifiant du catalogueAutorisé existe dans CAT (version indiquée) ;
conditions de déblocage : scénarios référencés existants, sans cycle ;
retourner la liste d’erreurs ; publication refusée si non vide
```

### 6.3 Thème de l’application

Nom provisoire : « Orbita ». Le thème est conservé pour toutes les interfaces ; ses jetons de style appartiennent à la couche de présentation, pas aux domaines.

| Rôle | Couleur |
| --- | --- |
| Fond principal / cartes | #0B1026 / #141B3A |
| Accent principal (cyan) / secondaire (ambre) | #22D3EE / #F59E0B |
| Succès (vert) / alerte ≥ 90 % (orange) / erreur ≥ 100 % (rouge) | #34D399 / #FB923C / #F87171 |
| Texte principal / secondaire | #E5E7EB / #94A3B8 |

Typographie : titres en Space Grotesk, texte en Inter, valeurs numériques en police à chasse fixe. Composants : boutons à coins arrondis (8 px), jauges vertes puis orange puis rouge selon le seuil, info-bulles « ? » (alimentées par PED), pastilles de rôle par couleur.

### 6.4 Maquettes des principales interfaces

Les quatre maquettes de la v1.0 restent valables ; elles sont rattachées aux domaines qui les alimentent.

| Maquette | Domaines qui l’alimentent |
| --- | --- |
| 1 · Atelier de conception | CON (bilans, validation), CAT (catalogue en lecture), PED (conseils) |
| 2 · Salle d’équipe (V2) | EQU (rôles, votes), CON (impact estimé), IDE |
| 3 · Simulation et rapport | SIM (chronologie, événements), EVA (score, causes), PED, CAM (fin et suite) |
| 4 · Accueil et choix du scénario | CAM (statuts, progression), SCE (cartes de scénarios), IDE |

À maquetter pour couvrir l’analyse : briefing (acte 0), planification et lancement (acte III), contrôle de mission (acte IV), écran de crise (acte V), scène 3D de l’orbite.

## 7. Conclusion

Ce cahier fixe l’architecture par domaines (monolithe modulaire **NestJS**, un paquet, un module NestJS et un schéma de base par domaine ; frontend **React et Three.js**), les contrats typés entre domaines, les règles de frontière contrôlées en intégration continue, le modèle de classes, les algorithmes rattachés à leur domaine, le thème « Orbita » et les maquettes.

**Plan d’implémentation par domaine** (les étapes 2 à 4 se mènent en parallèle une fois les contrats gelés)

| Étape | Contenu |
| --- | --- |
| 1 | Noyau : `kernel`, `contracts` (dont jetons de ports), `physics`, squelette `apps/server` NestJS, avec tests ; gel des contrats C1 à C9 |
| 2 | CAT et SCE : données JSON du catalogue et du scénario lunaire, import validé |
| 3 | CON : atelier et jauges en temps réel |
| 4 | SIM et EVA : moteur déterministe, crise, score sur 1000, rapport |
| 5 | CAM, PED, IDE : campagne, progression, déblocage, sauvegarde, glossaire, profil local |
| 6 | Présentation (React, Three.js) : scène 3D avec repli sans 3D, écrans de briefing, lancement, contrôle, crise, rapport |
| 7 | V2 : EQU (équipe, rôles, votes) |
| 8 | V3 : CLA, bac à sable, scénarios additionnels |
