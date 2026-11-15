# THE LAST LIGHT — Plan de réalisation du frontend

*Version 1.0 · 15 novembre 2026 · Basé sur l'architecture des interfaces (sections 1 à 14), l'analyse UX et le projet `the-last-light-web` (React · TypeScript · Vite · MVVM).*

> **Lecture.** Les identifiants (`P01`, `T02`, `M04`, `C-07`…) renvoient au document *THE_LAST_LIGHT_Architecture_Interfaces.md*. Les tailles sont **indicatives** : **S** ≤ 1 jour · **M** 2–3 jours · **L** 4–6 jours · **XL** 7 jours et plus, pour un développeur. Les endpoints sont des **hypothèses à aligner** avec le backend et les contrats partagés.

---

## 1. État d'avancement

| Page | Statut | Remarques |
|---|---|---|
| **P01** Menu principal | ✅ Livré (non exécuté) | Reprise de sauvegarde, confirmation d'écrasement, détection WebGL |
| **P02** Choix du mode | ✅ Livré (non exécuté) | Création de campagne via `POST /campaigns` |
| **P06** Prologue | ✅ Livré (non exécuté) | 3 scènes, historique, pause, journalisation `EVT-PRO-001/002` |
| **P07** Briefing | ✅ Livré | Posture initiale, `EVT-PRO-003` |
| **P08** Profil scientifique | ✅ Livré, compilé, testé (Vitest) et vérifié visuellement | Premier écran en shell ; 6 tests VM |
| P00 Chargement | 🟡 Partiel | La détection des capacités est dans P01 ; pas d'écran dédié |
| **P09 → P22** | ✅ Livré (2D + 3D), parcours complet testé | Un ViewModel par acte ; moteur pur ; 4 fins atteignables |
| F-02, F-03, F-04, F-05, F-07 (local), F-10 (reprise), F-12, S-01→S-03, P04 minimal, T01/T02/T03/T06 | ✅ Première version | Voir README |
| **Reste** | ⬜ | F-06 client API typé, F-08 file d'événements, F-09 i18n, P00, P03 complet, T04, M-00→M-08, tests Playwright en CI |

**Dettes techniques déjà connues**

- ~~Projet non compilé~~ : F-01 fait (build OK, Vitest installé).
- Routage par hash minimal ; pas de gardes de route.
- Chaînes en français codées dans les vues (pas d'i18n).
- Pas de fichier de thème partagé ni de bibliothèque de composants : le CSS est global et unique.
- Aucun test automatisé.
- Les contrats d'API sont supposés, pas encore alignés avec le backend.

---

## 2. Conventions d'architecture (à respecter pour chaque page)

```
View (React, sans logique)
   └─► ViewModel (Store observable, règles d'écran, testable sans DOM)
          └─► Ports (domain/ports.ts) ◄── Adaptateurs (data/) : HTTP · local · statique
Composition : app/container.ts (seul endroit qui choisit les implémentations)
```

| Règle | Détail |
|---|---|
| **Un dossier par page** | `features/<page>/<Page>ViewModel.ts` + `<Page>View.tsx` (+ sous-composants) |
| **Pas de règle métier dans la View** | Les calculs officiels viennent du backend ; les aperçus instantanés utilisent un module de simulation pur partagé |
| **ViewModel neuf à chaque visite** | Création dans un composant de route (déjà fait pour P01/P02/P06) |
| **États explicites** | `loading / ready / error` + raison d'indisponibilité des actions |
| **Ports étroits** | Un port par besoin (catalogue, validation, lancement…) ; adaptateurs HTTP et mémoire |
| **Événements** | Chaque action importante enregistre l'événement du catalogue (`EVT-…`) en *best-effort* |
| **Accessibilité** | Clavier complet, focus visible, états jamais portés par la couleur seule |
| **Tests** | Chaque ViewModel : tests unitaires avec ports factices (Vitest) |

---

## 3. Fondations transverses (Lot 0 — à faire avant les pages suivantes)

| ID | Chantier | Contenu | Taille | Priorité |
|---|---|---|---|---|
| F-01 | **Vérification du socle** | Installation, compilation, correction, lancement manuel de P01 → P02 → P06 | S | P0 |
| F-02 | **Routeur** | Remplacer le hash par un routeur avec **gardes** (table de la section 2.1 de l'architecture : redirection vers la dernière page valide, avec explication) | M | P0 |
| F-03 | **Thème et jetons** | Fichier unique de jetons (section 14), thème par variables CSS, option « réduire la transparence » et « contraste renforcé » | S | P0 |
| F-04 | **Bibliothèque de composants** | `C-01`…`C-20` dans l'ordre de besoin : `ActionButton`, `ConfirmModal`, `AlertBanner`, `ResourceGauge`, `SystemBadge`, `ValidationReport`, `ConsequencePanel`, `KeyValueRow`, `TabBar`, `SideRail`, `TrendChart`, `DialogueBox`… | XL (étalé) | P0 |
| F-05 | **Shell de jeu** | Topbar, panneaux gauche/droit, barre basse, tiroirs mobiles, zone centrale (scène 3D ou repli 2D) | L | P0 |
| F-06 | **Client API et contrats** | Client typé (erreurs normalisées, délais, annulation), types partagés avec le backend, intercepteur d'authentification | M | P0 |
| F-07 | **Store de campagne** | État courant de la campagne (acte, mode, version de configuration) partagé entre pages, rechargé depuis le serveur | M | P0 |
| F-08 | **Journal d'événements** | `EventRecorder` généralisé : file d'attente locale, nouvelle tentative, ordre garanti | M | P1 |
| F-09 | **i18n FR/EN** | Dictionnaires, extraction des chaînes existantes, formats de dates et de nombres | M | P1 |
| F-10 | **Sauvegarde** | Sauvegarde automatique en fin d'étape, indicateur `SaveIndicator`, reprise à l'écran sauvegardé, points de reprise | M | P1 |
| F-11 | **Erreurs et états système (T07)** | Frontière d'erreur globale, hors-ligne, données corrompues, bascule repli 2D | S | P1 |
| F-12 | **Moteur de simulation partagé (aperçus)** | Module pur (masse, puissance, budget, stockage) utilisé par l'atelier et le planificateur, identique à celui du serveur | L | P1 |
| F-13 | **Qualité** | Vitest, tests de composants, Playwright (parcours), lint, CI | M | P1 |

---

## 4. Plan des pages de campagne

### 4.1 Vue d'ensemble

| ID | Page | Acte | Taille | Priorité | Dépend de |
|---|---|---|---|---|---|
| P07 | Briefing | Prologue | M | P0 | F-02, F-04 |
| P08 | Profil scientifique | I | L | P0 | F-04, F-05, catalogue |
| P09 | Atelier spatial | II | **XL** | P0 | F-05, F-12, P08 |
| P10 | Prévalidation | II | L | P0 | P09 |
| P11 | Revue de lancement | III | L | P0 | P10 |
| P12 | Séquence de lancement | III | M | P1 | P11 |
| P13 | Contrôle de mission | IV | L | P0 | P12, scène |
| P14 | Planificateur de cycle | IV | L | P0 | P13, F-12 |
| P15 | Bilan de cycle | IV | S | P0 | P14 |
| P16 | Alerte critique | V | S | P0 | P13 |
| P17 | Diagnostic | V | M | P0 | P16 |
| P18 | Arbitrage | V | L | P0 | P17 |
| P19 | Résolution | V | M | P0 | P18 |
| P20 | Rapport final | VI | L | P0 | P19 |
| P21 | Fin narrative | VI | M | P1 | P20 |
| P22 | Écran final et rejouabilité | VI | S | P1 | P21, P03 |

### 4.2 Détail des fonctionnalités par page

#### P07 — Briefing *(M)*
- [ ] Onglets : Contexte · Personnages · Objectifs · Contraintes
- [ ] Fiches des quatre membres de l'équipe avec leur priorité
- [ ] Choix de la **posture initiale** (facultatif ou « passer » explicite)
- [ ] Réaction du personnage et question supplémentaire sur LUNAR-01
- [ ] Événement `EVT-PRO-003` (posture) · sortie vers P08
- [ ] *Test clé* : aucune route de campagne n'est bloquée selon la posture (TC-003)

#### P08 — Profil scientifique *(L)*
- [ ] Briefing polaire (carte ou illustration) et débat Noah / Amara
- [ ] Sélection de **1 objectif principal + 0 à 2 secondaires** (cartes `ObjectiveCard`)
- [ ] Liste d'instruments pertinents avec masse, énergie, données et coût estimés
- [ ] Décision **instrument d'Elias** : conserver / écarter / reporter, avec `TradeoffTable`
- [ ] Contraintes supplémentaires affichées avant confirmation
- [ ] Validation : objectif principal obligatoire (TC-004)
- [ ] Événements `EVT-A1-001`, `EVT-A1-002`
- [ ] Sauvegarde du profil avec horodatage

#### P09 — Atelier spatial *(XL — chantier principal)*
- [ ] Liste des 6 sous-systèmes avec état de complétude et propriétaire
- [ ] Catalogue filtré par sous-système, fiche détaillée, **comparateur** (2–3 composants)
- [ ] Ajout / retrait / annulation / rétablissement / réinitialisation
- [ ] **Tableau de bord recalculé immédiatement** : masse, budget, puissance, stockage (+ fiabilité, énergie)
- [ ] Composants incompatibles désactivés **avec raison**
- [ ] Presets recommandés (mode Guidé) et bulles d'aide
- [ ] Orbiteur 2D d'abord (schéma), 3D ensuite (lot scène)
- [ ] Sélection possible **au clavier** sans passer par la 3D
- [ ] Événement `EVT-A2-001` à chaque modification ; note d'Elias `EVT-A2-004`
- [ ] *Tests clés* : TC-009 à TC-012

#### P10 — Prévalidation *(L)*
- [ ] Rapport : erreurs bloquantes, avertissements, marges, résumé
- [ ] **Scénario « pire cas »** (demandes d'énergie simultanées) avec courbe nominale vs pics
- [ ] Acceptation **explicite** d'un avertissement (type, gravité, valeur, version de configuration)
- [ ] Retour à l'atelier avec focalisation sur le composant fautif
- [ ] Événements `EVT-A2-002`, `EVT-A2-003` · sortie vers P11
- [ ] *Test clé* : TC-013 (trace complète)

#### P11 — Revue de lancement *(L)*
- [ ] Choix du lanceur (léger / moyen / lourd) et de l'orbite (polaire / circulaire basse / elliptique)
- [ ] Paramètres accessibles réglables ; retours en direct : couverture, période, communications, carburant, marge de masse
- [ ] Compatibilité orbiteur / lanceur / orbite ; **aucun lancement** si contrainte bloquante (raison affichée)
- [ ] Rapport de risque ; **confirmation irréversible** (modale à double confirmation)
- [ ] Création d'un **point de reprise** avant lancement
- [ ] Message inachevé d'Elias (A3-S03), non bloquant
- [ ] Événements `EVT-A3-001`, `EVT-A3-002` · TC-014, TC-015

#### P12 — Séquence de lancement *(M)*
- [ ] Compte à rebours, contrôles, séparation des étages, injection
- [ ] **Passer la séquence** toujours disponible ; alternative statique sans animation
- [ ] Verrouillage de la conception ; événement `EVT-A3-003`

#### P13 — Contrôle de mission *(L)*
- [ ] Rail des modules (Énergie, Données, Communications, Journal, Objectifs, Systèmes)
- [ ] États des sous-systèmes avec **tendances** ; graphiques énergie et stockage
- [ ] Journal court, alertes, **indices d'anomalie progressifs**
- [ ] Vues de caméra (présentation / tactique) quand la scène existe
- [ ] Événements `EVT-A4-002`, `EVT-A4-003`, `EVT-A4-004`

#### P14 — Planificateur de cycle *(L)*
- [ ] Observations, instruments actifs, durée, transmissions (frise des fenêtres)
- [ ] Modes manuel / semi-automatique / automatique, interrompu à toute alerte
- [ ] **Prévision avant exécution** (énergie, données, stockage, transmission)
- [ ] Avance rapide (n cycles) ; validation du plan
- [ ] Événement `EVT-A4-001` · TC-016, TC-017

#### P15 — Bilan de cycle *(S)*
- [ ] `ConsequencePanel` : ressources avant/après, données produites vs transmises
- [ ] Transition automatique vers P16 si seuil critique atteint

#### P16 → P19 — Crise énergétique *(S + M + L + M)*
- [ ] **P16** Alerte critique, délai avant seuil, variante d'éclairage de crise ; temps figé pendant la décision ; `EVT-A5-001`
- [ ] **P17** Diagnostic complet (tendances, batterie, stockage, fenêtre de comms, santé des composants), cohérent avec l'état serveur ; `EVT-A5-002` (TC-019)
- [ ] **P18** Options d'urgence (radar, observations, transmissions, basse consommation, continuer), **combinaisons autorisées**, `TradeoffTable` « je sauve / je perds », effets prévus, confirmation irréversible ; `EVT-A5-003` (TC-020 à TC-023)
- [ ] **P19** Effets calculés vs prévus, systèmes sacrifiés, données sauvées/perdues, état final (stable / dégradé / perte), message final d'Elias conditionnel ; `EVT-A5-004`, `EVT-A5-005` (TC-024)

#### P20 — Rapport final *(L)*
- [ ] Sections : résumé, résultats scientifiques, performances techniques, données, décisions clés, score par catégorie, conclusion, leçons
- [ ] **Radar** du profil de performance ; chronologie cause → effet
- [ ] Explication de chaque point de score ; le score ne compense jamais un blocage
- [ ] Comparaison avec un rapport antérieur ; `EVT-A6-001` · TC-031

#### P21 — Fin narrative *(M)*
- [ ] Quatre fins avec **réutilisation des mêmes assets** (variations de lumière, dommages, cadrage)
- [ ] Réactions de l'équipe selon les résultats ; `EVT-A6-002` · TC-025 à TC-028

#### P22 — Écran final et rejouabilité *(S)*
- [ ] Phrase de conclusion, score, leçons, déblocages d'archives
- [ ] Rejouer depuis un **point de reprise** (avant lancement, début de l'Acte II…), nouvelle campagne, retour menu ; `EVT-A6-003`

---

## 5. Pages hors campagne et overlays

| ID | Page / overlay | Fonctionnalités principales | Taille | Priorité |
|---|---|---|---|---|
| P00 | Chargement | Écran dédié, progression, détection des capacités, bascule automatique en repli 2D | S | P1 |
| P03 | Rapports et comparaison | Liste triable, détail, **comparaison côte à côte** de deux rapports, rejouer depuis un point | L | P1 |
| P04 | Options | Affichage, audio, accessibilité, performance, langue, données ; application en direct, « rétablir par défaut » | M | P0 |
| P05 | Crédits | Équipe, institution, sources (NASA…), licences | S | P2 |
| T01 | Pause / menu | Overlay commun (réutiliser celui du prologue, le généraliser) | S | P0 |
| T02 | Journal | Liste chronologique filtrable, valeurs avant/après | M | P1 |
| T03 | Glossaire et aide | Termes contextuels, recherche, aide pas-à-pas rejouable (mode Guidé) | M | P0 |
| T04 | Archives | Archives d'Elias : complète / fragmentée / verrouillée | M | P1 |
| T05 | Sauvegarde | Auto + manuelle, points de reprise nommés | M | P1 *(voir F-10)* |
| T06 | Modales de confirmation | Composant commun, focus par défaut sur « Annuler » | S | P0 *(voir F-04)* |
| T07 | Erreurs et états système | Voir F-11 | S | P1 |

---

## 6. Scène 3D et repli 2D

| ID | Chantier | Contenu | Taille | Priorité |
|---|---|---|---|---|
| S-01 | **Repli 2D** (en premier) | Schéma SVG de l'orbiteur et de l'orbite, mêmes panneaux ; sert tous les écrans dès le début | M | P0 |
| S-02 | `SceneHost` | Intégration Three.js, cycle de vie, redimensionnement, détection de capacités, bascule 3D complet / allégé / 2D | L | P0 |
| S-03 | **Vertical slice** | Lune, orbiteur modulaire, caméra, HUD, mise à jour visuelle d'**au moins deux** configurations de composants | XL | P0 |
| S-04 | Caméras | Présentation, tactique, rapprochée ; rotation/zoom bornés, recentrage | M | P1 |
| S-05 | Trajectoires et légende | Courbes orbitales, couverture, repères de comms, `Legend3D` | M | P1 |
| S-06 | États visuels | Sous-système actif / dégradé / critique / hors ligne | M | P1 |
| S-07 | Séquence de lancement | Animation et variante sans animation | M | P1 |
| S-08 | Fiches ancrées | `CalloutPanel` avec ligne vers la pièce 3D | M | P1 |
| S-09 | Optimisation | Budgets (triangles, textures, lumières, images/s, poids), LOD, chargement progressif | L | P1 |
| S-10 | Variantes des fins | Réutilisation des assets, éclairage et cadrage | M | P2 |

---

## 7. Multijoueur (section 13 de l'architecture)

| ID | Chantier | Contenu | Taille | Priorité |
|---|---|---|---|---|
| M-00 | **Préparation (dès le MVP)** | Couche de permissions par rôle (en solo : tous les droits), emplacement de la barre d'équipe dans le shell, modèle de données `Team`/`Member`/`Proposal`/`Vote` | M | P0 |
| M-01 | Salon d'équipe (M01) | Création, code d'invitation, liste des joueurs, état « prêt » | M | P1 |
| M-02 | Choix des rôles (M02, M03) | Cartes de rôle, répartition, fiche de rôle | M | P1 |
| M-03 | Panneau Équipe (M04) | Présence, propositions, votes, chat (messages prédéfinis d'abord), annotations | L | P1 |
| M-04 | Go / No-Go et vote de crise (M05, M06) | Unanimité / majorité, départage du Stratège | L | P1 |
| M-05 | **Hot-seat** (M09) | Écran de passage de témoin, masquage de l'écran | M | P1 *(recommandé pour la démo)* |
| M-06 | Temps réel en ligne | Client Socket.IO, salles, verrous, reconnexion (M08) | XL | P2 |
| M-07 | Rapport d'équipe (M07) | Contribution par rôle, score de coordination | M | P2 |
| M-08 | Détection des tensions | Conflits de ressources entre rôles dans le tableau de bord | M | P2 |

---

## 8. Contrats d'API à aligner avec le backend

| Page | Appel (hypothèse) | État |
|---|---|---|
| P01 | `GET /campaigns/latest` | ✅ Utilisé |
| P02 | `POST /campaigns` `{ mode }` | ✅ Utilisé |
| Transversal | `POST /campaigns/{id}/events` | ✅ Utilisé |
| P08 | `GET /catalog/objectives` · `GET /catalog/instruments?objective=` · `PUT /campaigns/{id}/profile` | ⬜ |
| P09 | `GET /catalog/components?subsystem=` · `POST /campaigns/{id}/components` (ajout/retrait) · `GET /campaigns/{id}/configuration` | ⬜ |
| P10 | `POST /campaigns/{id}/validation` · `POST /campaigns/{id}/validation/warnings/{wid}/accept` | ⬜ |
| P11 | `GET /launchers` · `GET /orbits` · `POST /campaigns/{id}/launch/validate` · `POST /campaigns/{id}/launch` | ⬜ |
| P13–P15 | `GET /campaigns/{id}/state` · `POST /campaigns/{id}/cycles/preview` · `POST /campaigns/{id}/cycles` | ⬜ |
| P16–P19 | `GET /campaigns/{id}/crisis/diagnostic` · `POST .../crisis/preview` · `POST .../crisis/decision` | ⬜ |
| P20–P22, P03 | `GET /campaigns/{id}/report` · `GET /reports` · `GET /reports/compare?a=&b=` | ⬜ |
| T02, T04 | `GET /campaigns/{id}/journal` · `GET /campaigns/{id}/archives` | ⬜ |
| T05 | `GET/POST /campaigns/{id}/checkpoints` · `POST .../restore` | ⬜ |
| Multijoueur | Salles Socket.IO : `team.joined`, `role.assigned`, `proposal.*`, `vote.cast`, `ready.toggled` | ⬜ |

**Principe :** le backend est l'autorité de la simulation. Le frontend envoie des **intentions** (ajouter un composant, exécuter un cycle) et affiche les **résultats calculés**. Les aperçus instantanés (F-12) ne sont jamais enregistrés comme résultat officiel.

---

## 9. Feuille de route proposée

```
Lot 0  Fondations ─────── F-01 à F-07, F-13 (socle), S-01 (repli 2D), M-00
  │
Lot 1  Parcours jusqu'à la conception ─── P07 · P08 · P09 · P10 · T01 · T03 · T06
  │
Lot 2  Lancement et exploitation ─────── P11 · P12 · P13 · P14 · P15
  │
Lot 3  Crise et fin ──────────────────── P16–P19 · P20 · P21 · P22
  │
Lot 4  Complétude ────────────────────── P04 · P03 · T02 · T04 · F-08 à F-11 · P00
  │
Lot 5  Scène 3D ──────────────────────── S-02 · S-03 · S-04 à S-09
  │
Lot 6  Multijoueur ───────────────────── M-01 à M-05 (hot-seat) puis M-06 à M-08
```

| Lot | Objectif livrable | Critère de sortie |
|---|---|---|
| **0** | Socle propre et exécuté | Menu → Mode → Prologue fonctionnent contre le backend ou en local ; tests de ViewModel en CI |
| **1** | Conception complète d'un orbiteur | Un joueur arrive à une configuration validée avec traces d'avertissements (TC-004 à TC-013) |
| **2** | Lancement et premiers cycles | Cycles exécutables, indices d'anomalie visibles avant la crise (TC-014 à TC-018) |
| **3** | Campagne jouable de bout en bout | Les **quatre fins** sont atteignables (TC-025 à TC-028) ; rapport traçable |
| **4** | Version complète en 2D | Options, rapports comparables, journal, archives, i18n FR/EN, sauvegarde et reprise (TC-030) |
| **5** | Expérience 3D | Vertical slice validé sur appareil moyen ; repli 2D testé |
| **6** | Équipe jusqu'à 4 | Hot-seat jouable ; mode en ligne si le temps le permet |

### 9.1 Coupe « MVP hackathon » (si le temps est court)

1. **Indispensable** : Lot 0, Lot 1, Lot 2, Lot 3 en **repli 2D** (pas de 3D), avec P04 minimal et T03.
2. **Ensuite** : vertical slice 3D (S-02, S-03) sur l'Atelier et le Contrôle de mission.
3. **Pour la démonstration d'équipe** : **hot-seat** (M-05, M-02, M-04) plutôt que le temps réel en ligne.
4. **Reporter** : P05, S-10, M-06, M-07, M-08, comparaison avancée de rapports.

---

## 10. Plan de tests et définition de « terminé »

| Niveau | Outil | Cible |
|---|---|---|
| **Unitaire (ViewModel)** | Vitest + ports factices | Règles d'écran : disponibilités, validations, erreurs, double validation |
| **Composant** | Testing Library | États des composants (`ActionButton`, `ValidationReport`…), accessibilité de base |
| **Parcours** | Playwright | Cas de la matrice QA : TC-001 à TC-032 (et TC-M01 à TC-M10) |
| **Accessibilité** | axe + revue manuelle | Contrastes, focus, clavier, lecteur d'écran |
| **Performance** | Mesure sur appareil de référence | Poids de chargement, images par seconde, temps avant interaction |

**Définition de « terminé » pour une page**

- [ ] Fonctionnalités de la section 4 / 5 cochées.
- [ ] ViewModel couvert par des tests unitaires (cas nominal, erreur, indisponibilité).
- [ ] Navigable au clavier ; états redondants (icône + libellé + couleur).
- [ ] Textes extraits vers l'i18n (FR/EN).
- [ ] Événements du catalogue enregistrés.
- [ ] Fonctionne contre l'adaptateur HTTP **et** l'adaptateur local.
- [ ] Revue visuelle avec la liste de contrôle DA (section 14.15) et lisible en 1280 × 720 et en largeur mobile.
- [ ] README mis à jour (contrat d'API consommé).

---

## 11. Risques et décisions à prendre

| Risque / décision | Impact | Proposition |
|---|---|---|
| **P09 est très dense** | Retard sur tout l'enchaînement | Livrer d'abord en 2D, avec 2 sous-systèmes complets, puis étendre |
| Simulation dupliquée (aperçu front vs serveur) | Résultats incohérents | Module pur **partagé** et tests de parité ; le serveur reste l'autorité |
| Contrats d'API non figés | Réécritures d'adaptateurs | Figer les contrats par lot ; adaptateur isolé dans `data/`, mapper dédié |
| 3D trop lourde pour les appareils cibles | Écrans inutilisables | Repli 2D complet dès le Lot 0 ; budgets mesurés au vertical slice |
| Multijoueur ajouté tard | Refonte des pages | M-00 dès le Lot 0 (permissions, shell, modèle de données) |
| Seuils de simulation non calibrés | Écrans sans valeurs réalistes | Valeurs factices **configurables** côté backend, jamais dans les vues |
| Crise en temps réel ou tour par tour | Conception de P16–P18 | Décision proposée : temps figé, délai avant seuil affiché |
| Hot-seat dans le MVP ou non | Périmètre | Recommandé si une démonstration à plusieurs est prévue |
| Incohérences documentaires (six ou sept actes, score sur 100 ou 1000) | Libellés et rapport | À trancher avant P20 |

---

## 12. Prochaines actions immédiates

1. **F-01** : installer, compiler et lancer le projet existant, corriger les erreurs.
2. **F-02 / F-03 / F-04** : routeur à gardes, fichier de thème, premiers composants communs.
3. **P07 Briefing** : suite directe du prologue, courte, qui valide le routeur et `DialogueBox`.
4. **Contrats** : réunion de cadrage avec le backend sur les endpoints de P08 à P11.
5. **S-01** : repli 2D de l'orbiteur, qui débloque l'Atelier sans attendre la 3D.
