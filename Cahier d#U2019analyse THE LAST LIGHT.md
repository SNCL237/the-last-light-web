# Cahier d’analyse : THE LAST LIGHT

*Simulation spatiale à scénarios déblocables, organisée en domaines métier indépendants*

Institut Universitaire Saint Jean · Saint Jean Ingénieur, branche ISI

Cadre : challenge hackathon « Space Mission Design Game » · Référentiel : note de service N° 2025-003/ISJ/DA/ISI ; Game Design Document « THE LAST LIGHT » v1.0

Équipe projet : à compléter (noms des membres et rôles)

Version 1.2 · 14 novembre 2026 (la v1.1 intégrait le GDD et les scénarios déblocables ; la v1.2 découpe le projet en domaines métier indépendants)

## 1. Introduction

Ce document est le cahier d’analyse du projet THE LAST LIGHT. Il suit la structure définie par la note de service N° 2025-003/ISJ/DA/ISI pour les livrables de la branche ISI.

Le projet répond au challenge « Space Mission Design Game » : créer un jeu interactif de conception, de gestion et de simulation d’une mission spatiale complète, où chaque décision d’ingénierie a une conséquence sur la masse, la puissance, le budget, les données, les communications et la durée de vie. Le GDD retient une mission robotique vers les régions polaires de la Lune, portée par une campagne narrative en sept actes, jouée en solo dans le navigateur avec une scène 3D, et conçue pour évoluer vers la coopération à quatre. La v1.1 ajoutait des scénarios débloqués progressivement.

**Apport de la v1.2.** Le système est découpé en **dix domaines métier indépendants** (section 2.3). Chaque domaine a son vocabulaire, ses données, ses règles et ses cas d’utilisation, et ne communique avec les autres que par des contrats publiés. Les besoins, règles, cas d’utilisation, classes et séquences sont donc rattachés à un domaine (sections 3 à 5). Les besoins BF1 à BF36, les règles RG1 à RG12 et le contenu du GDD sont conservés ; BF37 est ajouté pour l’identité du joueur.

## 2. Présentation du projet

### 2.1 Présentation générale du projet

**Problème.** Les étudiants apprennent la conception de mission spatiale de façon théorique. Les outils existants traitent un seul aspect (mécanique orbitale, fusées ou satellite) sans montrer comment les décisions interagissent dans un système complet.

**Solution : THE LAST LIGHT.** En 2042, après la perte de la mission lunaire LUNAR-01, une nouvelle équipe prépare une mission robotique vers les régions polaires de la Lune. Le joueur définit les objectifs scientifiques, choisit les instruments, conçoit l’orbiteur, choisit un lanceur et une orbite, puis pilote les opérations jusqu’à une crise énergétique où il décide de ce qui mérite d’être sauvé.

**Promesse centrale.** Chaque choix technique a une conséquence. Chaque compromis peut sauver une partie de la mission, mais aussi en condamner une autre.

| Élément | Choix du GDD |
| --- | --- |
| Genre | Simulation spatiale stratégique avec narration à embranchements |
| Plateforme | Navigateur web avec environnement 3D |
| Joueurs | 1 joueur pour le MVP ; jusqu’à 4 en V2 (architecture prévue dès le départ) |
| Durée d’une campagne | 45 à 75 minutes |
| Simulation | Hybride : règles physiques simplifiées, évolution des ressources, événements scénarisés |
| Priorité MVP | Concevoir, lancer, exploiter et conclure une mission complète |

| Exigence du challenge | Réponse du projet | Domaines |
| --- | --- | --- |
| Interface claire | Espaces dédiés (briefing, atelier, planification, contrôle, crise, rapport), ressources toujours visibles | CON, SIM |
| Configuration de mission | Objectifs, orbiteur, instruments, lanceur, orbite | CON |
| Gestion de ressources | Masse, puissance et énergie, budget, données, communications, temps, avec alertes | CON, SIM |
| Multijoueur jusqu’à 4 | Rôles et votes prévus dès l’architecture, mode coopératif en V2 | EQU |
| Simulation et évaluation | Simulation hybride, score sur 1000, quatre fins, rapport explicatif | SIM, EVA |
| Valeur pédagogique | Explications contextuelles, unités visibles, causes expliquées | PED |
| Rejouabilité | Embranchements, événements, plusieurs stratégies, scénarios déblocables | SCE, CAM |

**Campagne en sept actes et domaines sollicités.** Chaque acte associe un événement narratif, un défi d’ingénierie, une décision et une conséquence.

| Acte | Contenu et défi | Écran principal | Domaines |
| --- | --- | --- | --- |
| 0 · The Last Transmission | Perte de LUNAR-01, équipe, mission de remplacement, premières archives | Briefing | CAM, SCE |
| I · A Promise That Must Live | Objectif principal et un ou deux secondaires ; tension autour d’un instrument lié aux travaux d’Elias | Espace de mission | CAM, CON, SCE |
| II · Every Gram Has a Price | Conception de l’orbiteur sous budget limité (masse, énergie, données) | Atelier spatial | CON, CAT, PED |
| III · The Point of No Return | Lanceur, trajectoire, orbite, validation, risques, lancement | Planification | CON, CAM, SIM |
| IV · Alone Above the Moon | Insertion, vérifications, observations, énergie et données ; une anomalie apparaît | Contrôle de mission | SIM, CAM, PED |
| V · The Last Light | Crise énergétique : diagnostic, systèmes à désactiver, données à préserver | Crise | SIM, CAM |
| VI · What We Leave Behind | Débriefing, résultats, fin narrative, rapport ; nouvelle campagne possible | Rapport final | EVA, CAM, SCE, PED |

**Scénarios déblocables.** Le scénario lunaire est le premier d’un catalogue ordonné.

- Un scénario est un **paquet de données** : cible, objectifs, catalogue autorisé, budget, événements, actes, personnages, archives, quatre fins et conditions de déblocage.
- Pour chaque joueur, un scénario est **verrouillé, disponible, en cours ou terminé**.
- Les conditions de déblocage sont portées par le scénario à débloquer : scénario prérequis terminé, fin minimale, score minimal. Valeur par défaut : avoir terminé le scénario précédent avec une fin A, B ou C.
- Le déblocage est évalué à la clôture d’une mission, après le rapport final, puis enregistré dans la progression. Un scénario débloqué le reste.
- Rejouer reste possible ; la progression conserve la meilleure fin, le meilleur score et le nombre de tentatives.
- Un scénario s’ajoute par import validé, sans modifier le code. Exemples de scénarios futurs (illustration) : observation de la Terre, relais de télécommunications, astéroïde.

### 2.2 Contexte du projet

- **Académique.** Challenge de hackathon à délai court ; livrables ISI : cahier des charges technique, cahier d’analyse, cahier de conception. Le GDD sert de référence pour le contenu du jeu.
- **Technologique.** Application web avec rendu 3D. Le moteur de simulation reste indépendant du rendu 3D et testable sans interface. Paramètres, composants, seuils, événements et scénarios sont pilotés par des données.
- **Sociétal.** Le secteur spatial se développe en Afrique (agences nationales, nanosatellites). Un jeu accessible et narratif peut attirer les jeunes vers les filières scientifiques. La connexion limitée impose une scène 3D allégée et une version dégradée lisible.
- **Narratif.** Ton dramatique, humain et crédible. La mission est robotique : le sacrifice porte sur des instruments, des données, des objectifs ou la durée de vie de l’orbiteur, jamais sur une mort humaine en direct.
- **Organisationnel (v1.2).** Plusieurs membres travaillent en parallèle : chaque domaine peut être développé, testé et livré par une personne ou un binôme, sans attendre les autres.

### 2.3 Découpage en domaines métier indépendants

Le découpage suit les principes de la conception pilotée par le domaine (DDD) : un domaine correspond à un sujet métier cohérent, avec son propre modèle et son propre langage.

#### 2.3.1 Principes d’indépendance

| Réf. | Principe |
| --- | --- |
| RI1 | Un domaine possède ses données : seul lui peut les créer, modifier ou supprimer. |
| RI2 | Un domaine référence un autre par **identifiant et version**, jamais par un objet partagé. |
| RI3 | Les échanges passent par des **contrats publiés, versionnés et immuables** (section 2.3.3). |
| RI4 | Aucune dépendance cyclique entre domaines. Le domaine **Campagne** est le seul orchestrateur : il relie les autres ; les domaines cœur ne se connaissent pas entre eux et ne connaissent pas la Campagne (ils reçoivent un identifiant de mission opaque). |
| RI5 | Chaque domaine est testable seul, avec des contrats simulés. |
| RI6 | Chaque domaine a son vocabulaire (section 2.3.5) : un même mot peut avoir un sens différent d’un domaine à l’autre. |
| RI7 | Les domaines ne produisent que des **codes d’explication** ; le domaine Pédagogie les transforme en texte traduit. |

La scène 3D et l’interface forment une **couche de présentation** : elle lit des vues des domaines mais n’est pas un domaine métier.

#### 2.3.2 Les dix domaines

| Code | Domaine | Responsabilité | Données possédées | Nature | Version |
| --- | --- | --- | --- | --- | --- |
| IDE | Identité et profils | Compte, authentification, langue, profil | Utilisateur | Générique | MVP |
| CAT | Catalogue technique | Référentiel des composants, instruments, orbites, lanceurs, stations ; seuils ; calibrage NASA/ESA ; versions | Catalogue versionné | Support | MVP |
| SCE | Scénarios et narration | Définition des scénarios : actes, personnages, archives, événements, fins, conditions de déblocage ; import et validation | Paquets de scénarios | Support | MVP |
| CON | Conception de mission | Objectifs, orbiteur, instruments, lanceur, orbite ; bilans ; compatibilité ; validation | Configurations de mission | **Cœur** | MVP |
| SIM | Simulation et opérations | Lancement, opérations, énergie, ombre, stockage, transmissions, événements, crise | Simulations et journaux | **Cœur** | MVP |
| EVA | Évaluation et rapport | Score sur 1000, détermination de la fin, rapport explicatif | Résultats et rapports | **Cœur** | MVP |
| CAM | Campagne et progression | Déroulé des actes, orchestration, historique des décisions, sauvegarde, progression, déblocage | Missions, sauvegardes, progression | **Cœur** | MVP |
| EQU | Collaboration d’équipe | Équipes, rôles, propositions, votes | Équipes et votes | Support | V2 |
| PED | Pédagogie et aide | Glossaire, tutoriel, info-bulles, messages explicatifs fr/en | Textes d’aide | Support | MVP |
| CLA | Classement et partage | Classement, partage et comparaison de missions | Classements, missions partagées | Générique | V3 |

#### 2.3.3 Contrats d’échange entre domaines

| Contrat | Producteur | Consommateurs | Contenu |
| --- | --- | --- | --- |
| C1 · RéférentielCatalogue | CAT | CON, SCE | Éléments du catalogue pour une version donnée (lecture seule) |
| C2 · PaquetScénario | SCE | CAM, CON, EVA | Cible, budget, objectifs, catalogue autorisé, actes, événements, fins et règles, conditions de déblocage, version |
| C3 · ConfigurationFigée | CON | CAM, SIM | Copie immuable de l’orbiteur, de l’orbite, du lanceur, des objectifs, de la marge et de la difficulté, avec les bilans |
| C4 · RésultatSimulation | SIM | CAM, EVA | Séries temporelles, événements, états des sous-systèmes, décisions de crise, science cumulée, données perdues |
| C5 · BilanMission | EVA | CAM, CLA, PED | Fin, score détaillé, causes (codes), décisions clés, recommandations |
| C6 · DécisionÉquipe | EQU | CON | Commande « appliquer ce changement » après un vote accepté |
| C7 · CodeExplication | tous | PED | Code et paramètres ; PED fournit le texte |
| C8 · IdentitéUtilisateur | IDE | tous | Identifiant et langue (seule donnée partagée) |
| C9 · ÉvénementsDomaine | tous | CAM, PED, CLA | MissionCréée, ConceptionValidée, MissionLancée, AnomalieDétectée, CriseDécidée, SimulationTerminée, BilanPublié, ScénarioDébloqué |

#### 2.3.4 Orchestration d’une mission

Le domaine CAM déroule la campagne acte par acte. Il lit le paquet de scénario (SCE), demande à CON de valider puis figer la configuration, transmet cette configuration à SIM, transmet le résultat de simulation et les règles de fin à EVA, puis met à jour la progression et évalue le déblocage. CON, SIM et EVA ne partagent que la forme des contrats : on peut remplacer ou tester l’un sans toucher aux autres.

#### 2.3.5 Langage propre à chaque domaine

| Terme | Sens selon le domaine |
| --- | --- |
| Mission | CAM : une partie jouée (acte courant, graine, sauvegardes). CON : désignée seulement par un identifiant. |
| Configuration | CON : conception modifiable. SIM : copie figée, en lecture seule. |
| Ressource | CON : bilan prévisionnel (limite, consommé). SIM : état évolutif au fil des jours. |
| Fin | SCE : définition (code, conditions). EVA : fin obtenue avec ses motifs. |
| Décision | CAM : entrée du journal. SIM : choix de crise appliqué. EQU : proposition votée. |
| Objectif | SCE : objectif proposé. CON : objectif choisi (principal ou secondaire). |

## 3. Cas d’utilisation du système

### 3.1 Les besoins

#### 3.1.1 Besoins fonctionnels

Priorités du GDD : MVP (version initiale), V2 (coopération), V3 (évolutions). « Présentation » désigne la couche d’interface et de scène 3D.

| Réf. | Besoin | Domaine | Priorité |
| --- | --- | --- | --- |
| BF1 | Menu principal : nouvelle mission, continuer, options, crédits | CAM | MVP |
| BF2 | Catalogue ordonné des scénarios avec statut et, si verrouillé, condition de déblocage restante | CAM (lit SCE) | MVP |
| BF3 | Évaluer les conditions de déblocage à la clôture et débloquer le scénario suivant | CAM | MVP |
| BF4 | Conserver la progression : scénarios débloqués, meilleurs scores, fins, tentatives | CAM | MVP |
| BF5 | Ajouter, ordonner et configurer des scénarios et leurs conditions sans modifier le code | SCE | MVP / V3 |
| BF6 | Sauvegarder et reprendre une mission (état et historique des décisions) | CAM | MVP |
| BF7 | Relancer un scénario avec une autre stratégie | CAM | MVP |
| BF8 | Présenter le briefing (acte 0) : contexte, équipe, personnages, contraintes | CAM (contenu SCE) | MVP |
| BF9 | Enchaîner les actes 0 à VI : événement narratif, défi, décision, simulation, retour, conséquence | CAM | MVP |
| BF10 | Dialogues et archives qui réagissent aux décisions techniques | CAM (contenu SCE) | MVP |
| BF11 | Déterminer l’une des quatre fins (A à D) | EVA | MVP |
| BF12 | Choisir un objectif principal et un ou deux secondaires ; instruments recommandés, plan d’observation et critères en dépendent | CON | MVP |
| BF13 | Composer l’orbiteur : structure, énergie, batteries, communications, ordinateur de bord, attitude, propulsion, charge utile | CON | MVP |
| BF14 | Sélectionner des instruments (masse, coût, consommation, performance, fiabilité, données) | CON (données CAT) | MVP |
| BF15 | Choisir un lanceur et une orbite avec explication des compromis | CON (données CAT) | MVP |
| BF16 | Vérifier la compatibilité masse, orbite, lanceur ; distinguer erreurs bloquantes et avertissements | CON | MVP |
| BF17 | Afficher en temps réel les ressources, le carburant et la fiabilité, avec alertes | CON (conception), SIM (opérations) | MVP |
| BF18 | Planifier les observations scientifiques | SIM | MVP |
| BF19 | Suivre production et consommation d’énergie, ombre, batterie | SIM | MVP |
| BF20 | Surveiller le stockage des données et programmer les transmissions | SIM | MVP |
| BF21 | Suivre l’état des sous-systèmes (opérationnel, dégradé, critique, hors ligne) | SIM | MVP |
| BF22 | Effectuer des manœuvres dans les limites des réserves | SIM | MVP |
| BF23 | Déclencher des événements aléatoires et scénarisés, dont un événement critique d’énergie annoncé par des indices | SIM (définitions SCE) | MVP |
| BF24 | Gérer la crise : diagnostic puis décision (désactiver un instrument, réduire les transmissions, suspendre, basse consommation, poursuivre avec risque accru) | SIM | MVP |
| BF25 | Score sur 1000 : science 300, technique 250, ressources 200, fiabilité 150, collaboration 100 (neutralisée ou redistribuée en solo) | EVA | MVP |
| BF26 | Rapport final : résultats, performances, décisions clés, fin, causes, historique | EVA | MVP |
| BF27 | Scène web 3D de la Lune, de l’orbiteur et de sa trajectoire ; orbiteur visible dans l’atelier | Présentation | MVP |
| BF28 | Accès permanent aux ressources et à l’état des systèmes pendant les opérations | Présentation | MVP |
| BF29 | Expliquer unités et relations de cause à effet (info-bulles, glossaire, tutoriel) | PED | MVP |
| BF30 | Ambiance sonore liée à l’état de la mission, désactivable | Présentation | MVP (option) |
| BF31 | Équipe jusqu’à 4 avec rôles : directeur de mission, ingénieur système, responsable scientifique, opérations de vol | EQU | V2 |
| BF32 | Proposer, discuter et voter ; validation du directeur pour les décisions importantes | EQU | V2 |
| BF33 | Journal des décisions avec justifications (historique en solo) | CAM (solo), EQU (équipe) | MVP / V2 |
| BF34 | Comparer et partager des missions ; classement | CLA | V3 |
| BF35 | Mode bac à sable et modèles physiques plus avancés | CON, SIM | V3 |
| BF36 | Gérer le catalogue, les seuils et les événements | CAT (catalogue, seuils), SCE (événements) | MVP |
| BF37 | S’authentifier, gérer son profil et sa langue (compte ou profil local) | IDE | MVP |

#### 3.1.2 Besoins non fonctionnels

| Critère | Exigence | Domaines |
| --- | --- | --- |
| Utilisabilité | Interface compréhensible par un débutant ; contraintes visibles avant toute décision irréversible | CON, PED |
| Performance 3D | Scène fluide, lisible ; version dégradée sans 3D pour appareils ou connexions faibles | Présentation |
| Indépendance du moteur | Moteur de simulation indépendant du rendu 3D, testable sans interface | SIM |
| Reproductibilité | Mêmes entrées et décisions, mêmes résultats (graine fixée) | SIM, EVA |
| Configurabilité | Paramètres, composants, seuils, événements et scénarios pilotés par des données | CAT, SCE |
| Extensibilité des scénarios | Import validé (format, cohérence), sans modifier le code | SCE |
| Versionnage | Scénarios et catalogue versionnés ; une sauvegarde référence les versions jouées | SCE, CAT, CAM |
| **Indépendance des domaines** | Données propres, références par identifiant, aucun cycle, échanges par contrats (RI1 à RI7) | tous |
| **Testabilité par domaine** | Chaque domaine se teste seul avec des contrats simulés ; tests de contrat entre producteur et consommateurs | tous |
| Évolutivité vers la coopération | Rôles et votes prévus dès le MVP, livrés en V2 | EQU, CON |
| Fiabilité de la sauvegarde | Reprise avec état et historique | CAM |
| Portabilité | Navigateur web, affichage adaptatif | Présentation |
| Sécurité | Authentification simple, données personnelles protégées, scores validés côté serveur si classement | IDE, CLA |
| Pédagogie | Chaque résultat est accompagné d’une explication simple | PED |
| Internationalisation | Français et anglais | PED |
| Maintenabilité | Architecture modulaire et code documenté | tous |

#### 3.1.3 Règles de gestion

| Réf. | Domaine | Règle |
| --- | --- | --- |
| RG1 | CON | Les conditions de faisabilité (compatibilité masse, orbite, lanceur, budget, énergie minimale) sont des règles dures : elles bloquent le lancement. Le score ne compense jamais une impossibilité physique. |
| RG2 | CON | Le système distingue erreurs bloquantes et avertissements. |
| RG3 | SIM, EVA | Mêmes entrées et mêmes décisions produisent les mêmes résultats. |
| RG4 | EVA | Les fins A à D dépendent des résultats de simulation et des décisions clés, pas d’un simple choix de dialogue final. |
| RG5 | SCE, SIM | Mission robotique : aucun personnage ne meurt en direct ; les sacrifices portent sur instruments, données, objectifs ou durée de vie. |
| RG6 | SIM, SCE | Un événement critique est préparé par des indices techniques, des alertes ou des décisions antérieures. |
| RG7 | CON | Le joueur choisit un objectif principal et un ou deux secondaires. |
| RG8 | EVA | Score total de 1000 points : science 300, technique 250, ressources 200, fiabilité 150, collaboration 100 (neutralisée ou redistribuée en solo). |
| RG9 | CAM | Seul le premier scénario est disponible au départ ; un scénario débloqué le reste. |
| RG10 | CAM | Les conditions de déblocage sont évaluées à la clôture d’une mission, sur le résultat (fin, score) et la progression. |
| RG11 | CAM | Une sauvegarde conserve l’état, l’historique des décisions et la version du scénario. |
| RG12 | CAT | Les valeurs du catalogue sont des paramètres de gameplay à calibrer, non des spécifications réelles. |

### 3.2 Les acteurs et leurs rôles

| Acteur | Rôle |
| --- | --- |
| Joueur | Joue les scénarios en solo : choisit un scénario, conçoit la mission, pilote, décide pendant la crise. |
| Membre d’équipe (V2) | Coopère avec trois autres au maximum. Rôles : directeur de mission (arbitrage, budget, validation), ingénieur système (masse, énergie, compatibilité), responsable scientifique (objectifs, instruments), opérations de vol (surveillance, communications, anomalies). |
| Hôte d’équipe (V2) | Crée l’équipe, invite les autres, attribue les rôles. |
| Administrateur / concepteur de contenu | Gère le catalogue, les événements et les scénarios (import, ordre, conditions). |
| Moteur de simulation | Acteur système (domaine SIM) : calcule ressources et événements. L’évaluation (EVA) détermine la fin et le score ; la campagne (CAM) évalue le déblocage. |
| Sources ouvertes NASA / ESA (externe) | Données de référence pour calibrer le catalogue, hors temps de jeu. |
| Service d’authentification externe (optionnel) | Connexion par compte tiers. |

Les personnages du scénario lunaire (Maya Moreau, Daniel Hayes, Noah Williams, Amara Okafor et, dans les archives, Elias Moreau) sont du contenu narratif du domaine SCE, pas des acteurs.

### 3.3 Cas d’utilisation par domaine

Le diagramme de cas d’utilisation est regroupé en dix paquets, un par domaine (figure à régénérer). Une relation « sollicite » indique qu’un cas appelle un contrat d’un autre domaine.

| Domaine | Cas d’utilisation | Acteurs | Sollicite |
| --- | --- | --- | --- |
| IDE | S’authentifier / gérer son profil | Joueur |  |
| CAT | Gérer le catalogue | Administrateur |  |
| SCE | Ajouter / configurer un scénario | Administrateur | CAT |
| CAM | Consulter les scénarios et la progression ; Démarrer un scénario ; Consulter briefing, dialogues, archives ; Lancer la mission ; Sauvegarder / reprendre ; Rejouer ; Débloquer le scénario suivant | Joueur, moteur | SCE, CON, SIM, EVA |
| CON | Définir les objectifs ; Concevoir l’orbiteur (inclut Surveiller les ressources) ; Sélectionner les instruments ; Choisir lanceur et orbite (inclut Vérifier la compatibilité) | Joueur | CAT, SCE |
| SIM | Piloter les opérations ; Gérer la crise | Joueur, moteur |  |
| EVA | Consulter le rapport final et la fin | Joueur |  |
| PED | Consulter tutoriel et glossaire | Joueur |  |
| EQU (V2) | Créer équipe et attribuer rôles ; Proposer et voter une décision | Hôte, membre | CON |
| CLA (V3) | Comparer / partager une mission ; consulter le classement | Joueur | EVA |

### 3.4 Description textuelle des cas d’utilisation principaux

| Cas d’utilisation | Domaine | Scénario principal | Scénario alternatif |
| --- | --- | --- | --- |
| Démarrer un scénario | CAM | Le joueur ouvre le menu et consulte les scénarios avec leur statut (SCE + progression). Il en sélectionne un disponible, lit le briefing de l’acte 0, confirme. CAM crée la mission ; CON crée une configuration vide. | Scénario verrouillé : refus avec la condition restante. Mission en cours : proposition de reprise. |
| Concevoir l’orbiteur | CON | Le joueur choisit structure, énergie, communications, ordinateur, attitude, propulsion, instruments (éléments fournis par CAT). À chaque ajout, CON recalcule les bilans et renvoie jauges et codes d’explication. Le joueur valide. | Ressource dépassée : erreur ou avertissement expliqué (« la consommation dépasse la production : ajoutez un panneau ou retirez un instrument »). Une erreur bloquante empêche la validation. |
| Choisir lanceur et orbite, puis lancer | CON puis CAM | CON vérifie la compatibilité masse, orbite, lanceur. Le joueur examine coût et risques et confirme. CAM récupère la configuration figée, la transmet à SIM, qui simule lancement et insertion. | Masse trop grande ou orbite inaccessible : lancement bloqué, pistes chiffrées (réduire la masse, changer d’orbite ou de lanceur). |
| Piloter les opérations | SIM | À chaque période, le joueur planifie les observations et programme les transmissions. SIM simule énergie, ombre, stockage, communications et renvoie ressources, états et résultats. Des indices annoncent les anomalies. | Anomalie énergétique confirmée : passage à la crise. Sous-système dégradé, critique ou hors ligne : capacités adaptées. |
| Gérer la crise | SIM | SIM présente l’alerte ; le joueur diagnostique puis choisit une des cinq options ; SIM recalcule ressources et objectifs et prépare la conclusion. | Pas de décision dans le temps imparti : risque accru appliqué et consigné. |
| Consulter le rapport final et la fin | EVA | EVA calcule score, fin et rapport à partir du résultat de simulation et des règles de fin du scénario ; le joueur lit fin, score, causes, décisions déterminantes, pistes. | Fin D : le rapport insiste sur les leçons techniques et propose de rejouer. |
| Débloquer le scénario suivant | CAM | CAM met à jour la progression, évalue les conditions des scénarios verrouillés (publiées par SCE) et rend disponibles ceux dont les conditions sont remplies ; le joueur est informé. | Conditions non remplies (ex. fin D) : conditions restantes affichées, rejouer proposé. |
| Sauvegarder et reprendre | CAM | Sauvegarde manuelle ou en fin d’acte ; « Continuer » restaure l’état, les ressources et l’historique. | Version du scénario changée : version d’origine indiquée et règle de compatibilité appliquée ; sinon proposition de rejouer. |
| Ajouter et configurer un scénario | SCE | L’administrateur importe la définition ; SCE valide format et cohérence (éléments de catalogue connus via CAT), affiche un aperçu, fixe ordre et conditions, publie. | Définition invalide (acte manquant, fin inatteignable, élément inconnu) : liste d’erreurs, publication refusée. |
| Proposer et voter une décision (V2) | EQU | Un membre propose un changement ; CON estime l’impact ; les autres votent ; la majorité s’applique, le directeur tranche en cas d’égalité. EQU envoie la décision à CON. | Rejet ou délai expiré : trace au journal, conception inchangée. |

## 4. Diagrammes de classes

Les diagrammes d’analyse sont simplifiés : attributs sans types ; méthodes listées dans les tableaux et typées dans le cahier de conception. Il y a **un diagramme de classes par domaine** (figures à régénérer). Entre domaines, une relation n’est qu’un **identifiant référencé** (tableau 4.2).

### 4.1 Identification des entités, attributs et méthodes par domaine

**IDE · Identité et profils**

| Entité | Attributs | Méthodes |
| --- | --- | --- |
| Utilisateur | id, pseudo, email, langue | sAuthentifier(), mettreAJourProfil() |

**CAT · Catalogue technique**

| Entité | Attributs | Méthodes |
| --- | --- | --- |
| VersionCatalogue | id, numero, date | publier() |
| Composant | id, categorie, nom, masse, puissance, cout, fiabilite, niveau | – |
| Instrument | id, nom, masse, puissance, cout, debitDonnees, valeurScientifique, fiabilite | – |
| Orbite | id, type, altitude, inclinaison, periode, couverture, tempsContactSol, fractionOmbre | calculerCouverture(), calculerOmbre() |
| Lanceur | id, nom, classe, capacite, cout, fiabilite | – |
| StationSol | id, nom, debit | – |

**SCE · Scénarios et narration**

| Entité | Attributs | Méthodes |
| --- | --- | --- |
| Scenario | id, titre, ordre, corpsCible, budgetMax, dureeCible, version, actif | valider(), publier(), genererExigences() |
| ConditionDeblocage | id, type, scenarioPrerequis, finMinimale, scoreMinimal | – |
| ObjectifScientifique | id, titre, questionScientifique, role | – |
| Acte | id, numero, titre, type, description | – |
| EvenementNarratif | id, declencheur, texte, consequence | – |
| DefinitionEvenement | id, type, origine, probabilite, impact, indice | – |
| Personnage | id, nom, role, motivation | – |
| Archive | id, titre, contenu, conditionAcces | – |
| FinDefinie | code, titre, regles, conclusion | – |

**CON · Conception de mission**

| Entité | Attributs | Méthodes |
| --- | --- | --- |
| ConfigurationMission | id, missionId, statut, objectifPrincipal, objectifsSecondaires, marge, difficulte | configurer(), verifier(), valider(), figer() |
| Orbiteur | id, nom, masseTotale, puissanceConsommee, puissanceProduite, capaciteBatterie, carburant, cout | ajouterComposant(), retirerComposant(), calculerBilans() |
| ElementInstalle | idCatalogue, categorie, masse, puissance, cout, fiabilite | – |
| ChoixLancement | lanceurId, orbiteId | verifierCompatibilite() |
| Bilan | type, capacite, consomme, seuilAlerte | mettreAJour(), estEnAlerte() |
| RapportVerification | erreurs, avertissements, suggestions | – |

**SIM · Simulation et opérations**

| Entité | Attributs | Méthodes |
| --- | --- | --- |
| Simulation | id, configurationId, graine, dureeSimulee, phase, statut | executer(), appliquerEvenement(), appliquerDecision() |
| SousSysteme | id, nom, etat (opérationnel, dégradé, critique, hors ligne) | changerEtat() |
| EtatRessource | type, capacite, consomme, seuilAlerte | mettreAJour(), estEnAlerte() |
| ObservationPlanifiee | id, debut, duree, cible | planifier(), annuler() |
| Transmission | id, debut, volume, priorite | programmer() |
| Evenement | id, type, origine, probabilite, impact, indice | declencher() |
| DecisionCrise | id, choix, date | appliquer() |

**EVA · Évaluation et rapport**

| Entité | Attributs | Méthodes |
| --- | --- | --- |
| Resultat | id, simulationId, scoreScience, scoreTechnique, scoreRessources, scoreFiabilite, scoreCollab, scoreTotal | calculerScore(), determinerFin() |
| FinObtenue | code, motifs | – |
| RapportMission | id, resume, causes, decisionsCles, recommandations | generer(), exporter() |

**CAM · Campagne et progression**

| Entité | Attributs | Méthodes |
| --- | --- | --- |
| Mission | id, nom, mode, statut, acteCourant, graine, dateCreation, scenarioId, versionScenario | creer(), lancer(), sauvegarder(), reprendre(), cloturer() |
| Decision | id, acte, libelle, effets, date | enregistrer() |
| Sauvegarde | id, date, etat, versionScenario | creer(), restaurer() |
| ProgressionScenario | id, utilisateurId, scenarioId, statut, meilleurScore, finObtenue, nbTentatives, dateDeblocage | debloquer(), mettreAJour(bilan), evaluerConditions() |

**EQU · Collaboration d’équipe (V2)**

| Entité | Attributs | Méthodes |
| --- | --- | --- |
| Equipe | id, nom, codeInvitation, tailleMax | inviter(), attribuerRole(), quitter() |
| Membre | id, utilisateurId, role | proposer(), voter() |
| Proposition | id, description, impactEstime, statut | soumettre(), cloturer() |
| Vote | id, choix, date | enregistrer() |

**PED · Pédagogie et aide**

| Entité | Attributs | Méthodes |
| --- | --- | --- |
| EntreeGlossaire | id, terme, definition, langue | rechercher() |
| MessageExplicatif | code, gabarit, langue | rendre(parametres) |
| EtapeTutoriel | id, ordre, contenu | – |

**CLA · Classement et partage (V3)**

| Entité | Attributs | Méthodes |
| --- | --- | --- |
| Classement | id, periode, portee | actualiser(), afficher() |
| MissionPartagee | id, lien, auteurId, configurationId | partager(), comparer() |

### 4.2 Références entre domaines

| Entité (domaine) | Référence | Vers (domaine) |
| --- | --- | --- |
| Mission (CAM) | scenarioId + versionScenario | Scenario (SCE) |
| ProgressionScenario (CAM) | utilisateurId, scenarioId | Utilisateur (IDE), Scenario (SCE) |
| ConfigurationMission (CON) | missionId (opaque) | Mission (CAM) |
| ElementInstalle, ChoixLancement (CON) | idCatalogue, lanceurId, orbiteId | Catalogue (CAT) |
| Simulation (SIM) | configurationId | ConfigurationFigée (CON) |
| Resultat (EVA) | simulationId | Simulation (SIM) |
| Membre (EQU) | utilisateurId | Utilisateur (IDE) |
| MissionPartagee (CLA) | configurationId, auteurId | CON, IDE |

### 4.3 Diagramme d’objets

État du système pour un joueur qui conçoit l’orbiteur (acte II) du premier scénario, le second étant verrouillé.

| Objet | Domaine | Valeurs |
| --- | --- | --- |
| u1 : Utilisateur | IDE | pseudo = pilote42, langue = français |
| sc1 : Scenario | SCE | THE LAST LIGHT, ordre = 1, corpsCible = Lune (régions polaires), budgetMax = 100 M$ |
| sc2 : Scenario / cd2 : ConditionDeblocage | SCE | ordre = 2 (à définir) ; prérequis sc1, fin minimale C |
| pg1, pg2 : ProgressionScenario | CAM | sc1 en cours, 1 tentative, aucun score ; sc2 verrouillé |
| ms1 : Mission | CAM | scénario sc1, en conception, acte II |
| cf1 : ConfigurationMission | CON | missionId = ms1 ; obj1 = recherche de glace d’eau (principal), obj2 = cartographie polaire (secondaire) |
| orb1 : Orbiteur | CON | masse 310 kg, production 110 W, consommation 96 W, coût 78 M$ |
| ins1, ins2 : ElementInstalle | CON | spectromètre neutronique (14 kg, 22 W) ; caméra haute résolution (18 kg, 30 W, 40 Mbps) |
| lan1 / orbt1 : ChoixLancement | CON | lanceur moyen (420 kg vers l’orbite polaire, 30 M$) ; orbite polaire 100 km, fraction d’ombre 0,35 |
| res1 : Bilan | CON | puissance 96 W sur 110 W (87 %, alerte à 90 %) |
| dec1 : Decision | CAM | acte II : retenir le spectromètre neutronique (instrument lié aux travaux d’Elias) |

Les valeurs sont des paramètres illustratifs. Ajouter un radar (+25 W) porterait la consommation à 121 W pour 110 W produits : CON signalerait une erreur bloquante. sc2 passera à « disponible » quand sc1 sera terminé avec une fin A, B ou C.

## 5. Diagrammes de séquence système

Chaque diagramme garde deux lignes de vie (Joueur, Système). Le tableau précise, derrière le système, les domaines traversés (figures à régénérer).

| Séquence | Messages et domaines traversés |
| --- | --- |
| 5.1 Démarrer un scénario | listerScénarios() → CAM lit SCE et sa progression → liste avec statuts · sélectionnerScénario(s) · \[verrouillé\] refus et condition restante · \[disponible\] briefing (contenu SCE) · confirmerDémarrage() → CAM crée la mission, événement MissionCréée → CON crée la configuration |
| 5.2 Objectifs et conception | choisirObjectifs() → CON (objectifs du paquet SCE) · boucle ajouterComposant() → CON lit CAT, recalcule, renvoie jauges et codes → PED rend les messages · \[erreur ou avertissement\] message expliqué · validerConception() → CON publie ConceptionValidée → CAM débloque l’archive (SCE) |
| 5.3 Lanceur, orbite, lancement | choisirLanceur(), choisirOrbite() → CON vérifie · \[incompatible\] erreur et pistes · \[compatible\] coût et risques · lancerMission() → CAM obtient la ConfigurationFigée (CON), la passe à SIM · SIM simule lancement et insertion · MissionLancée · dialogue narratif (SCE) |
| 5.4 Opérations | boucle planifierObservations(), programmerTransmissions() → SIM · SIM simule énergie, ombre, stockage, communications · ressources, états, résultats · \[indice\] alerte · AnomalieDétectée → CAM bascule vers la crise |
| 5.5 Crise, fin, déblocage | alerte et diagnostic (SIM) · décider(option) → SIM recalcule · SimulationTerminée → CAM transmet RésultatSimulation et règles de fin à EVA · EVA publie le BilanMission · CAM met à jour la progression et évalue les conditions (SCE) · \[remplies\] ScénarioDébloqué · \[non remplies\] conditions restantes et option rejouer · CLA reçoit le score (V3) |
| 5.6 Ajouter un scénario | importerScénario(définition) → SCE valide format et cohérence (ids vérifiés auprès de CAT) · \[invalide\] liste d’erreurs · \[valide\] aperçu, ordre et conditions, publier() · CAM voit le scénario verrouillé ou disponible |
| 5.7 Proposer et voter (V2) | proposerChangement() → EQU demande l’impact estimé à CON sans l’appliquer · notification · voter() · décompte · \[majorité\] DécisionÉquipe envoyée à CON, journal mis à jour · \[rejet ou expiration\] proposition clôturée |

## 6. Conclusion

Ce cahier a adapté le projet au GDD « THE LAST LIGHT » (campagne en sept actes, mission lunaire robotique, simulation hybride, score sur 1000, quatre fins, scène 3D, sauvegarde et reprise), défini les scénarios déblocables et, en v1.2, **organisé le système en dix domaines métier indépendants** reliés par neuf contrats.

**Priorités de livraison par domaine**

| Version | Domaines et contenu |
| --- | --- |
| MVP | IDE (profil), CAT, SCE (scénario lunaire et import), CON, SIM (dont crise), EVA (quatre fins, rapport), CAM (campagne, sauvegarde, progression, déblocage), PED ; scène 3D |
| V2 | EQU : coopération à quatre avec rôles et votes ; incidents supplémentaires ; comparaison de missions |
| V3 | CLA ; scénarios additionnels ; bac à sable ; modèles physiques avancés |

**Points à confirmer**

| Point | Hypothèse retenue |
| --- | --- |
| Condition de déblocage par défaut | Terminer le scénario précédent avec une fin A, B ou C (la fin D ne débloque pas, le scénario reste rejouable). |
| Scénarios livrés pour le MVP | Un seul scénario complet ; mécanisme de déblocage testé avec un second scénario court. |
| Récompenses de déblocage | Optionnelles : nouveaux instruments ou lanceurs. |
| Conservation de la progression | Compte ou profil local, à trancher en conception. |
| Coopération dans le hackathon | Placée en V2 par le GDD ; architecture prévue dans tous les cas. |
| Granularité du découpage (v1.2) | Dix domaines dans un seul déploiement (monolithe modulaire) ; IDE et CLA peuvent fusionner en un domaine « Compte » si le délai l’exige. |
| Formules orbitales communes (v1.2) | CON et SIM utilisent les mêmes fonctions de calcul (période, éclipse, contact) : noyau physique partagé, sans état, à confirmer en conception. |
| Règles des fins A à D (v1.2) | Portées par chaque scénario (SCE) et appliquées par EVA ; seuils exacts à reprendre du GDD. |

Le cahier de conception v1.1 reprend ce découpage : modules et paquets par domaine, contrats typés, base de données séparée par domaine, algorithmes rattachés à leur domaine.
