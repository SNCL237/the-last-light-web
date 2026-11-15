# THE LAST LIGHT — Architecture des interfaces

*Version 1.2 (ajout du mode multijoueur, section 13, et de la direction artistique avec guide UI, section 14) · 15 novembre 2026 · Découle de l'analyse UX, des livrables de production v1.1 et des cahiers d'analyse / conception v1.2 (React · Three.js · Tailwind).*

> **Statut.** Les identifiants de pages (`P00`…), les composants (`C-…`) et les seuils sont des **propositions de production à valider**. Les valeurs numériques sont **à calibrer** pendant le prototypage.

---

## 1. Principes directeurs

| Réf. | Principe | Conséquence sur les pages |
|---|---|---|
| UX-1 | La 3D soutient, ne masque jamais | Toute information critique existe en HUD 2D, indépendante de la caméra |
| UX-2 | Contraintes visibles avant toute décision irréversible | Rapport de risque + confirmation modale avant lancement et décision de crise |
| UX-3 | Erreur bloquante ≠ avertissement | Composant `ValidationReport` unique, partout |
| UX-4 | Chaque action importante → avant / action / après / conséquence | Composant `ConsequencePanel` |
| UX-5 | Pas de surprise injustifiée | Prévalidation « pire cas » (A2), indices progressifs (A4) |
| UX-6 | Couleur jamais seule | Icône + libellé + couleur pour tous les états |
| UX-7 | Le repli 2D est un mode complet | Mêmes pages, même état, rendu central différent |
| UX-8 | Aucune règle métier dans l'interface | Les écrans lisent l'état de simulation ; le moteur calcule |

---

## 2. Plan du site (carte de navigation)

```
P00 Chargement
 └─ P01 Menu principal
     ├─ P02 Choix du mode ──► P06 Prologue ──► P07 Briefing
     ├─ Continuer ──► (reprise à l'écran sauvegardé)
     ├─ P03 Rapports & comparaison
     ├─ P04 Options
     └─ P05 Crédits

CAMPAGNE (flux linéaire, barre de progression des actes)
 P07 Briefing
  └─ ACTE I   P08 Profil scientifique
  └─ ACTE II  P09 Atelier spatial ── P10 Prévalidation
  └─ ACTE III P11 Revue de lancement ── P12 Séquence de lancement
  └─ ACTE IV  P13 Contrôle de mission ── P14 Planificateur de cycle ── P15 Bilan de cycle
  └─ ACTE V   P16 Alerte critique ── P17 Diagnostic ── P18 Arbitrage ── P19 Résolution
  └─ ACTE VI  P20 Rapport final ── P21 Fin narrative ── P22 Écran final & rejouabilité

TRANSVERSAUX (overlays, accessibles depuis toute page de campagne)
 T01 Pause / menu · T02 Journal · T03 Glossaire & aide · T04 Archives
 T05 Sauvegarde · T06 Modales de confirmation · T07 Erreurs & états système
```

### 2.1 Table de routage proposée

| Route | Page | Précondition (garde) |
|---|---|---|
| `/` | P01 Menu | — |
| `/mode` | P02 | Nouvelle campagne demandée |
| `/campagne/prologue` | P06 | Campagne créée |
| `/campagne/briefing` | P07 | Prologue terminé |
| `/campagne/acte-1/profil` | P08 | Briefing terminé |
| `/campagne/acte-2/atelier` | P09 | Profil scientifique confirmé |
| `/campagne/acte-3/lancement` | P11 | Configuration validée (aucune erreur bloquante) |
| `/campagne/acte-3/sequence` | P12 | Lancement confirmé |
| `/campagne/acte-4/controle` | P13 | Conception verrouillée |
| `/campagne/acte-5/crise` | P16–P19 | Seuil critique atteint |
| `/campagne/acte-6/rapport` | P20–P22 | État final verrouillé |
| `/rapports` | P03 | — |

> **Règle de garde :** une route de campagne inaccessible redirige vers la dernière page valide et explique pourquoi.

---

## 3. Gabarit commun (Shell)

### 3.1 Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ TOPBAR  Acte · Étape · Progression │ Sauvegarde │ Aide │ Pause  │
├───────────┬───────────────────────────────────────┬─────────────┤
│ PANNEAU   │                                       │ PANNEAU     │
│ GAUCHE    │        ZONE CENTRALE                  │ DROIT       │
│ Navigation│   Scène 3D  ─ ou ─  Repli 2D (SVG)    │ Contexte :  │
│ États des │                                       │ catalogue,  │
│ systèmes  │                                       │ fiche,      │
│           │                                       │ options     │
├───────────┴───────────────────────────────────────┴─────────────┤
│ BARRE BASSE  Ressources clés │ Alertes │ Journal │ ACTION PRINC.│
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Zones et responsabilités

| Zone | Contenu | Règles |
|---|---|---|
| **Topbar** | Acte, étape, indicateur de sauvegarde, accès aide/pause | Toujours visible ; hauteur fixe |
| **Panneau gauche** | Navigation d'étape, badges d'état des sous-systèmes | Repliable ; tiroir sur mobile |
| **Zone centrale** | Scène 3D ou repli 2D, contrôles de caméra, légende | Jamais recouverte par plus d'un panneau à la fois |
| **Panneau droit** | Contenu contextuel de la page (catalogue, fiche, options) | Change selon la page ; repliable |
| **Barre basse** | 3 à 4 jauges critiques, alertes, journal court, **bouton d'action principale** | Action principale toujours au même endroit |

### 3.3 Ressources affichées en permanence selon l'acte

| Acte | Jauges permanentes (3–4) | Autres ressources |
|---|---|---|
| I | Budget estimé, nombre d'objectifs | Dans « Toutes les ressources » |
| II | Masse, budget, puissance, stockage | Fiabilité, énergie |
| III | Masse/capacité lanceur, carburant, comms, budget | Période, couverture |
| IV | Énergie (batterie), stockage, comms, temps | Fiabilité, carburant |
| V | Énergie, production vs consommation, stockage, délai avant seuil | Santé des composants |
| VI | — (rapport) | — |

### 3.4 Comportement responsive

| Largeur | Disposition |
|---|---|
| ≥ 1280 px | Trois colonnes, barre basse complète |
| 768–1279 px | Panneau gauche réduit en icônes ; panneau droit en tiroir |
| < 768 px | Scène en haut ; panneaux en tiroirs ; ressources en bandeau bas ; action principale en barre fixe |

*Largeurs et appareils de référence : à confirmer par la direction technique.*

### 3.5 Modes de rendu de la zone centrale

| Mode | Contenu | Déclenchement |
|---|---|---|
| **3D complet** | Lune, orbiteur modulaire, trajectoires, effets | Par défaut si capacités suffisantes |
| **3D allégé** | Géométries réduites, sans effets volumétriques | Option ou détection de performance faible |
| **Repli 2D** | Schéma SVG/Canvas de l'orbiteur et de l'orbite | Option, échec WebGL ou connexion faible |

---

## 4. Bibliothèque de composants

| ID | Composant | Rôle | États / variantes |
|---|---|---|---|
| C-01 | `ResourceGauge` | Valeur, unité, tendance, seuil | normal / faible / critique ; icône + libellé |
| C-02 | `SystemBadge` | État d'un sous-système | opérationnel / dégradé / critique / hors ligne |
| C-03 | `AlertBanner` | Message système | information / avertissement / critique / bloquante |
| C-04 | `ValidationReport` | Erreurs et avertissements | liste ; case d'acceptation explicite par avertissement |
| C-05 | `ComponentCard` | Fiche d'un composant | disponible / sélectionné / incompatible (raison) |
| C-06 | `ComparePanel` | Comparaison côte à côte (2–3 composants) | — |
| C-07 | `ConsequencePanel` | Avant / action / après / conséquence | — |
| C-08 | `DialogueBox` | Dialogue + portrait | avancer, passer, historique, vitesse du texte |
| C-09 | `ArchiveViewer` | Archives d'Elias | complète / fragmentée / verrouillée |
| C-10 | `GlossaryTerm` | Terme cliquable avec définition | — |
| C-11 | `ConfirmModal` | Confirmation d'action irréversible | normale / irréversible (double confirmation) |
| C-12 | `ActionButton` | Action principale | disponible / indisponible (raison) / en cours / confirmé |
| C-13 | `CameraControls` | Rotation, zoom, recentrage, changement de vue | — |
| C-14 | `Legend3D` | Codes visuels trajectoires, états, zones | repliable |
| C-15 | `SaveIndicator` | État de sauvegarde | à jour / en cours / échec |
| C-16 | `TrendChart` | Courbes de tendance (énergie, stockage) | prévision en pointillés |
| C-17 | `ObjectiveCard` | Carte d'objectif scientifique | principal / secondaire / non sélectionné |
| C-18 | `ProgressRail` | Progression des actes | acte courant / terminé / à venir |
| C-19 | `Tooltip` | Aide courte, raison d'indisponibilité | — |
| C-20 | `TradeoffTable` | « Je sauve / je perds » par option | — |

### 4.1 Règles d'état communes

- **Bouton indisponible** → toujours une raison visible (infobulle et texte, pas seulement grisé).
- **Alerte bloquante** → empêche l'action associée ; ne disparaît qu'une fois la cause corrigée.
- **Double validation** → empêchée pendant l'état « en cours ».
- **Sauvegarde en échec** → message clair ; l'historique n'est jamais perdu.

---

## 5. Spécification page par page

> **Gabarit de lecture :** objectif · gabarit · zones · composants · actions · validations · retours · événements · données · accessibilité/responsive.

---

### P00 — Chargement

| Champ | Contenu |
|---|---|
| **Objectif** | Charger l'application et les ressources de base sans bloquer l'utilisateur |
| **Zones** | Logo, barre de progression, message d'état |
| **Comportement** | Interface affichée en premier ; scène 3D chargée progressivement ; détection des capacités (WebGL, mémoire, connexion) |
| **Sorties** | Mode de rendu proposé (3D complet / allégé / 2D) → P01 |
| **Erreurs** | Échec WebGL → bascule automatique en repli 2D avec message |
| **Accessibilité** | Texte de progression lu par lecteur d'écran |

---

### P01 — Menu principal

| Champ | Contenu |
|---|---|
| **Objectif** | Point d'entrée : démarrer, reprendre, consulter |
| **Gabarit** | Plein écran, scène d'ambiance (Lune) en fond, panneau central |
| **Composants** | `ActionButton` ×5, `SaveIndicator` (état de la sauvegarde) |
| **Actions** | Nouvelle mission · Continuer · Rapports & comparaison · Options · Crédits |
| **Validations** | « Continuer » disponible **uniquement** si sauvegarde exploitable (raison affichée sinon) ; confirmation avant écrasement d'une campagne existante |
| **Retours** | Résumé de la sauvegarde : acte, date, mode |
| **Événements** | — |
| **Données** | Lit : `CampaignState` (sauvegarde) |
| **Accessibilité** | Navigation clavier, focus visible, ordre logique |

```
┌─────────────────────────────────────────┐
│              THE LAST LIGHT             │
│                                         │
│          [ Nouvelle mission ]           │
│          [ Continuer        ]  ← Acte III · 14/11 │
│          [ Rapports         ]           │
│          [ Options          ]           │
│          [ Crédits          ]           │
└─────────────────────────────────────────┘
```

---

### P02 — Choix du mode

| Champ | Contenu |
|---|---|
| **Objectif** | Adapter le niveau d'aide au joueur |
| **Composants** | 3 cartes de mode, aperçu de ce que chaque mode change |
| **Modes** | **Guidé** : bulles d'aide, presets recommandés, explications renforcées · **Standard** : aide contextuelle à la demande · **Expert** : aide désactivée, marges plus serrées *(à calibrer)* |
| **Actions** | Choisir le mode · Retour · Confirmer |
| **Validations** | Un mode choisi avant de continuer |
| **Données** | Écrit : `CampaignState.mode` |
| **Remarque** | Le mode ne change pas les règles de la simulation, seulement l'aide et, éventuellement, la difficulté *(à calibrer)* |

---

### P03 — Rapports & comparaison

| Champ | Contenu |
|---|---|
| **Objectif** | Consulter les rapports passés et comparer deux stratégies |
| **Zones** | Liste des rapports (gauche) · détail ou comparaison (centre) |
| **Composants** | Liste triable (date, score, fin) · tableau de comparaison côte à côte · `ConsequencePanel` |
| **Actions** | Ouvrir · Comparer (2 rapports) · Rejouer depuis un point de reprise · Supprimer |
| **Comparaison** | Objectifs, configuration, lanceur/orbite, décisions de crise, score par catégorie, fin |
| **Données** | Lit : `MissionReport[]` |
| **États vides** | Message invitant à terminer une première campagne |

---

### P04 — Options

| Champ | Contenu |
|---|---|
| **Onglets** | Affichage · Audio · Accessibilité · Performance · Langue · Données |
| **Affichage** | Taille de texte · effets d'écran (vignettage, scanlines, bruit radio) activables/désactivables |
| **Audio** | Volumes (musique, ambiance, alertes, voix) ; sous-titres |
| **Accessibilité** | Contraste renforcé · réduction des animations · indicateurs redondants (icônes) · navigation clavier · sous-titrage des alertes sonores |
| **Performance** | Mode de rendu : 3D complet / allégé / 2D ; qualité des ombres ; limite d'images/s |
| **Langue** | FR / EN |
| **Données** | Exporter / supprimer la sauvegarde locale |
| **Règle** | Appliquer en direct avec aperçu ; bouton « Rétablir par défaut » |

---

### P05 — Crédits

| Champ | Contenu |
|---|---|
| **Contenu** | Équipe, institution, sources (NASA, ESA), licences |
| **Actions** | Retour |

---

### P06 — Prologue « The Last Transmission »

| Champ | Contenu |
|---|---|
| **Objectif** | Installer la perte de LUNAR-01 et le rôle du joueur |
| **Séquence** | P0-S01 Signal perdu → P0-S02 Archive → P0-S03 Recrutement |
| **Gabarit** | Plein écran, sans HUD de ressources ; seuls `DialogueBox` et contrôles minimaux |
| **Contrôles** | Avancer · Passer la scène · Historique · Pause |
| **Règles** | Ne pas révéler les marges énergétiques ni les responsabilités ; contenu d'archive volontairement incomplet |
| **Événements** | `EVT-PRO-001` (signal), `EVT-PRO-002` (archive Elias) |
| **Accessibilité** | Sous-titrage du signal radio ; alternative textuelle du bruit |

---

### P07 — Briefing (rencontre de l'équipe)

| Champ | Contenu |
|---|---|
| **Objectif** | Présenter l'équipe, les tensions et choisir une posture initiale |
| **Gabarit** | Shell simplifié : zone centrale = scène d'équipe/portraits ; panneau droit = onglets |
| **Onglets** | Contexte · Personnages · Objectifs · Contraintes |
| **Personnages** | Maya (comprendre le passé), Daniel (tenir la mission), Noah (maximiser la science), Amara (préserver les opérations) |
| **Actions** | Naviguer entre onglets · Choisir une posture (facultatif/confirmé) · Poser une question supplémentaire sur LUNAR-01 |
| **Validations** | Posture choisie ou « passer » explicite avant de quitter |
| **Retours** | Réaction adaptée du personnage ; **aucune** route bloquée |
| **Événements** | `EVT-PRO-003` (posture) |
| **Données** | Écrit : `narrative_variables.initial_stance` |

---

### P08 — Profil scientifique (Acte I)

| Champ | Contenu |
|---|---|
| **Objectif** | Choisir 1 objectif principal + 0 à 2 secondaires ; décider de l'instrument d'Elias |
| **Gabarit** | Shell : centrale = région polaire (carte/3D) ; droit = objectifs et instruments ; bas = coût estimé + action |
| **Étapes** | 1 Briefing polaire → 2 Débat → 3 Sélection → 4 Instrument d'Elias → 5 Confirmation |
| **Composants** | `ObjectiveCard` ×4 (cartographie, glace, thermique, composition), liste d'instruments pertinents, `TradeoffTable` (instrument d'Elias), `ConsequencePanel` |
| **Actions** | Sélectionner principal · ajouter 1–2 secondaires (ou aucun, volontairement) · Conserver / Écarter / Reporter l'instrument d'Elias · Confirmer |
| **Validations** | Objectif principal requis (sinon « choix incomplet » signalé) ; objectifs supplémentaires → contraintes affichées avant confirmation |
| **Retours** | Pour chaque instrument : masse, énergie, données, coût estimés ; mise à jour immédiate |
| **Événements** | `EVT-A1-001` (profil confirmé), `EVT-A1-002` (instrument d'Elias) |
| **Données** | Écrit : `ScientificProfile` (+ horodatage) |
| **Règle narrative** | Écarter l'instrument n'entraîne **pas** de pénalité morale arbitraire |
| **Sortie** | Profil valide → P09 ; sinon retour à la sélection |

---

### P09 — Atelier spatial (Acte II)

| Champ | Contenu |
|---|---|
| **Objectif** | Assembler l'orbiteur sous contraintes de masse, budget, énergie et stockage |
| **Gabarit** | Shell complet ; **c'est la page la plus dense** |
| **Zone centrale** | Orbiteur 3D modulaire (ou schéma 2D) ; stations cliquables |
| **Panneau gauche** | 6 sous-systèmes : structure · énergie · communications · contrôle · charge utile · propulsion, avec `SystemBadge` et complétude |
| **Panneau droit** | Catalogue filtré du sous-système actif · fiche détaillée · `ComparePanel` |
| **Barre basse** | Masse · Budget · Puissance · Stockage (jauges) · bouton **Prévalider** |

```
┌ Topbar : Acte II · Atelier ─────────────── Sauvegarde ✓ │ ? │ ⏸ ┐
├ Sous-systèmes ┬ Orbiteur 3D / 2D ───────┬ Catalogue : Énergie ────┤
│ ▣ Structure ✓ │                         │ [Panneau 120 W]  42 kg  │
│ ▣ Énergie   ● │      (orbiteur)         │ [Batterie 400Wh] 8 kg   │
│ ▢ Comms       │                         │ [Comparer ▸]            │
│ ▢ Contrôle    │                         │                         │
│ ▢ Charge utile│                         │ Fiche : pourquoi ça     │
│ ▢ Propulsion  │                         │ compte (GlossaryTerm)   │
├ Masse ▓▓▓░ │ Budget ▓▓░ │ Puissance ▓▓▓ │ Stockage ░ │ [Prévalider]┤
└────────────────────────────────────────────────────────────────────┘
```

| Champ | Contenu |
|---|---|
| **Actions** | Sélectionner · ajouter · retirer · comparer · annuler / rétablir · réinitialiser · appliquer un **preset recommandé** (mode Guidé) · lancer la prévalidation |
| **Validations** | Compatibilité masse, budget, énergie, stockage, cohérence scientifique avec le profil ; composants incompatibles grisés **avec raison** |
| **Retours** | Tableau de bord **recalculé immédiatement** après chaque modification ; `ConsequencePanel` pour chaque ajout/retrait |
| **Événements** | `EVT-A2-001` (composant installé/retiré), `EVT-A2-004` (note d'Elias, déblocage selon progression) |
| **Données** | Écrit : `ComponentSelection[]` ; lit : catalogue |
| **Aide (mode Guidé)** | Bulles d'explication (masse, puissance, données) ; surbrillance de la prochaine étape |
| **Accessibilité** | Sélection au clavier depuis la liste (la 3D n'est jamais le seul moyen de choisir) |
| **Responsive** | Mobile : catalogue en tiroir bas ; orbiteur compact ; sous-systèmes en onglets |

---

### P10 — Prévalidation (panneau / page modale de l'Acte II)

| Champ | Contenu |
|---|---|
| **Objectif** | Détecter les impossibilités et exposer les risques **avant** le lancement |
| **Gabarit** | Panneau large sur la zone droite (ou page modale) ; scène visible en arrière-plan |
| **Sections** | Erreurs bloquantes · Avertissements · **Scénario « pire cas »** · Marges · Résumé |
| **Composants** | `ValidationReport`, `TrendChart` (puissance : nominal vs pics simultanés), `TradeoffTable` |
| **Pire cas** | Montre la demande énergétique lorsque plusieurs systèmes fonctionnent en même temps (cohérent avec la note d'Elias) |
| **Actions** | Corriger (retour atelier avec focalisation sur le composant fautif) · **Accepter explicitement** un avertissement · Valider la configuration |
| **Validations** | Aucune erreur bloquante ; configuration complète ; chaque avertissement accepté ou corrigé |
| **Retours** | Enregistrement du type, gravité, valeur mesurée, décision et version de configuration |
| **Événements** | `EVT-A2-002` (prévalidation), `EVT-A2-003` (avertissement accepté) |
| **Données** | Écrit : `ValidationReport` |
| **Sortie** | Configuration validée → P11 |

---

### P11 — Revue de lancement (Acte III)

| Champ | Contenu |
|---|---|
| **Objectif** | Choisir lanceur et orbite, vérifier la compatibilité, confirmer l'irréversible |
| **Gabarit** | Shell ; centrale = Lune + trajectoire ; droit = sélecteurs ; bas = rapport de risque + **Lancer** |
| **Composants** | Sélecteur de lanceur (léger / moyen / lourd), sélecteur d'orbite (polaire / circulaire basse / elliptique), curseurs de paramètres accessibles, `ValidationReport`, `Legend3D`, `ConfirmModal` (irréversible) |
| **Actions** | Choisir lanceur · choisir orbite · régler paramètres · consulter le rapport de risque · confirmer le lancement |
| **Retours en direct** | Couverture · période · communications · carburant · marge de masse |
| **Validations** | Compatibilité orbiteur / lanceur / orbite ; **aucun lancement** si contrainte bloquante (raison affichée) |
| **Confirmation** | Modale double : rappel que la conception sera verrouillée ; option « **Créer un point de reprise** » avant lancement |
| **Événements** | `EVT-A3-001` (configuration), `EVT-A3-002` (validation) |
| **Données** | Écrit : `LaunchRecord` (provisoire) |
| **Note narrative** | Message inachevé d'Elias (A3-S03) proposé avant confirmation, sans bloquer l'action |

---

### P12 — Séquence de lancement

| Champ | Contenu |
|---|---|
| **Objectif** | Marquer le passage de la conception à l'exploitation |
| **Gabarit** | Plein écran, HUD minimal : compte à rebours, état des contrôles |
| **Contenu** | Compte à rebours · contrôles · séparation des étages · injection orbitale |
| **Contrôles** | **Passer la séquence** (toujours disponible) · Pause |
| **Événements** | `EVT-A3-003` (lancement confirmé) |
| **Effets** | Conception **verrouillée** ; modifications interdites ensuite |
| **Accessibilité** | Sous-titres ; alternative sans animation (écran statique + résumé) |
| **Sortie** | Injection enregistrée → P13 |

---

### P13 — Contrôle de mission (Acte IV)

| Champ | Contenu |
|---|---|
| **Objectif** | Piloter les opérations par cycles, voir ressources et états |
| **Gabarit** | Shell ; centrale = Lune, orbiteur, trajectoire, fenêtres de comms |
| **Panneau gauche** | `SystemBadge` de chaque sous-système avec **tendance** |
| **Panneau droit** | Onglets : Plan d'opérations · Journal · Objectifs scientifiques |
| **Barre basse** | Énergie · Stockage · Comms · Temps · bouton **Planifier le cycle** |
| **Composants** | `TrendChart` (énergie, stockage), `Legend3D`, `AlertBanner` (indices d'anomalie) |
| **Actions** | Ouvrir le planificateur · consulter l'état/tendances · changer de vue (présentation / tactique) |
| **Règle** | Afficher **état et tendance**, pas seulement la valeur instantanée |
| **Indices d'anomalie** | Progressifs : production solaire plus faible, température composant, consommation élevée, stockage qui se remplit, fenêtre manquée |
| **Événements** | `EVT-A4-002` (observation), `EVT-A4-003` (fenêtre manquée), `EVT-A4-004` (indice) |
| **Données** | Lit : état de simulation ; écrit : rien (lecture seule) |

---

### P14 — Planificateur de cycle

| Champ | Contenu |
|---|---|
| **Objectif** | Définir observations, instruments actifs, durée et transmissions |
| **Gabarit** | Panneau large (modal) au-dessus du contrôle de mission |
| **Sections** | Observations · Instruments actifs · Durée · Transmissions (fenêtres) · Manœuvres disponibles |
| **Composants** | Liste d'instruments avec interrupteurs, frise temporelle des fenêtres de comms, `TrendChart` (prévision énergétique), `ValidationReport` |
| **Modes** | **Manuel** · **Semi-automatique** (suggestion du plan) · **Automatique** (cycles répétés selon le plan précédent, interrompu à toute alerte) |
| **Actions** | Configurer · Prévoir · Exécuter · Avance rapide (n cycles) |
| **Validations** | Plan valide et ressources simulables ; cycle borné ; réserves respectées |
| **Retours** | **Prévision avant exécution** : consommation, données produites, stockage, transmission possible |
| **Événements** | `EVT-A4-001` (cycle exécuté) |
| **Données** | Écrit : `OperationCycle` |

---

### P15 — Bilan de cycle

| Champ | Contenu |
|---|---|
| **Objectif** | Expliquer le résultat du cycle (observation → consommation → données → stockage → transmission) |
| **Gabarit** | Panneau modal compact, fermable |
| **Composants** | `ConsequencePanel` (ressources avant/après), liste des observations, données produites vs transmises, `AlertBanner` éventuels |
| **Actions** | Continuer · Revoir le journal · Planifier le cycle suivant |
| **Règle** | Si seuil d'anomalie atteint → transition vers P16 |
| **Données** | Lit : `OperationCycle` |

---

### P16 — Alerte critique (Acte V)

| Champ | Contenu |
|---|---|
| **Objectif** | Faire comprendre l'urgence et l'horizon temporel |
| **Gabarit** | Shell avec bandeau d'alerte critique ; scène en variante de crise (éclairage) |
| **Contenu** | Production insuffisante · batterie en baisse · prochaine fenêtre de comms différée · **délai avant seuil** |
| **Composants** | `AlertBanner` (critique), `ResourceGauge` énergie, `TrendChart` production/consommation par sous-système |
| **Actions** | **Ouvrir le diagnostic** (action principale) |
| **Règle** | L'alerte ne masque jamais l'action d'urgence ; **aucune pression temps réel** : le temps est figé tant que le joueur décide *(à valider, voir §6)* |
| **Événements** | `EVT-A5-001` (marge critique) |

---

### P17 — Diagnostic

| Champ | Contenu |
|---|---|
| **Objectif** | Permettre une décision informée |
| **Gabarit** | Panneau large (droit + centre étendu) |
| **Sections** | Tendances · Batterie · Stockage · Fenêtre de comms · Santé des composants · Consommation par sous-système |
| **Composants** | `TrendChart`, `SystemBadge`, tableau de consommation |
| **Règle** | **Toutes** les valeurs sont cohérentes avec l'état du moteur |
| **Actions** | Consulter · Passer à l'arbitrage |
| **Événements** | `EVT-A5-002` (diagnostic consulté, instantané d'état tracé) |

---

### P18 — Arbitrage

| Champ | Contenu |
|---|---|
| **Objectif** | Le joueur choisit ce qu'il sacrifie |
| **Gabarit** | Gauche : options · centre : orbiteur · droit : `TradeoffTable` |
| **Options** | Désactiver le radar · Suspendre les observations · Réduire les transmissions · Mode basse consommation · Continuer comme prévu |
| **Combinaisons** | **Autorisées** quand elles sont compatibles (ex. réduire les transmissions + suspendre une observation) ; incompatibilités expliquées |
| **Composants** | `TradeoffTable` (« je sauve / je perds »), `ConsequencePanel` (effets **prévus**), `ConfirmModal` |
| **Dialogues** | Noah défend la science, Amara les données, Daniel rappelle le coût, Maya hésite — **aucune option n'est présentée comme moralement la seule bonne** |
| **Validations** | Seules les options disponibles dans l'état réel sont actives (raison affichée pour les autres) |
| **Confirmation** | Modale : récapitulatif des effets prévus, systèmes sacrifiés ; irréversible |
| **Événements** | `EVT-A5-003` (décision de crise) |
| **Données** | Écrit : `CrisisDecision` |
| **Cas particulier** | « Continuer » : risque de décharge profonde **calculé**, sans protection artificielle |

---

### P19 — Résolution

| Champ | Contenu |
|---|---|
| **Objectif** | Montrer les effets calculés et verrouiller l'état final |
| **Contenu** | Effets prévus **vs** effets calculés · systèmes affectés · données sauvées/perdues · état : stable / dégradé durable / perte irrécupérable |
| **Narration** | Message final d'Elias (si conditions réunies) · réaction de Maya adaptée |
| **Composants** | `ConsequencePanel`, `ArchiveViewer`, `DialogueBox` |
| **Règle** | La fin dépend de l'**état réel**, pas du dernier choix |
| **Événements** | `EVT-A5-004` (message final), `EVT-A5-005` (état verrouillé) |
| **Sortie** | État verrouillé → P20 |

---

### P20 — Rapport final (Acte VI)

| Champ | Contenu |
|---|---|
| **Objectif** | Expliquer les liens entre décisions et résultats |
| **Gabarit** | Page de rapport en sections navigables ; scène 3D de l'orbiteur en arrière-plan |
| **Sections** | Résumé · Résultats scientifiques · Performances techniques · Données (produites/récupérées) · Décisions clés · Score par catégorie · Conclusion · Leçons |
| **Composants** | Tableaux, `TrendChart`, `ConsequencePanel`, chronologie des décisions avec liens cause → effet |
| **Règles** | Le score ne compense **jamais** une contrainte bloquante ; chaque point est expliqué |
| **Actions** | Naviguer · Comparer avec un rapport antérieur · Passer à la fin narrative |
| **Événements** | `EVT-A6-001` (rapport calculé) |
| **Données** | Écrit : `MissionReport` (figé) |

---

### P21 — Fin narrative

| Champ | Contenu |
|---|---|
| **Objectif** | Donner du sens à la réussite, au sacrifice ou à l'échec |
| **Fins** | *The Legacy Lives On* · *A Fragment of Hope* · *The Last Signal* · *The Silence of Space* |
| **Gabarit** | Plein écran ; scène 3D réutilisée avec variations d'état, d'éclairage, de dommages, de cadrage |
| **Contenu** | Réactions de Maya, Daniel, Noah, Amara selon les résultats |
| **Règle** | Conditions basées sur la simulation et les décisions clés, **pas sur un dialogue final isolé** |
| **Contrôles** | Avancer · Passer |
| **Événements** | `EVT-A6-002` (fin attribuée) |

---

### P22 — Écran final & rejouabilité

| Champ | Contenu |
|---|---|
| **Contenu** | Scène finale · phrase de conclusion · score · leçons · « Une autre stratégie aurait-elle changé la mission ? » |
| **Actions** | Consulter le rapport · Comparer · **Rejouer depuis un point de reprise** (avant lancement, début de l'Acte II…) · Nouvelle campagne · Menu principal |
| **Déblocages** | Archives et variantes débloquées signalées |
| **Événements** | `EVT-A6-003` (campagne terminée) |

---

## 6. Pages et overlays transversaux

### T01 — Pause / menu

| Contenu | Actions |
|---|---|
| Reprendre · Options · Sauvegarder · Quitter vers le menu | Confirmation si progression non sauvegardée |

### T02 — Journal

| Contenu | Règles |
|---|---|
| Liste chronologique : décisions, alertes, cycles, validations | Filtrable (type, acte) ; chaque entrée garde valeurs avant/après ; accès permanent pendant les opérations |

### T03 — Glossaire & aide

| Contenu | Règles |
|---|---|
| Termes (masse, puissance, orbite polaire, débit, fenêtre de comms…) | `GlossaryTerm` contextuel ; recherche ; en mode Guidé, aide pas-à-pas rejouable |

### T04 — Archives

| Contenu | Règles |
|---|---|
| Archives d'Elias, notes, messages | États : complète / fragmentée / verrouillée ; condition de déblocage visible sans spoiler |

### T05 — Sauvegarde

| Comportement | Règles |
|---|---|
| Sauvegarde automatique à chaque fin d'étape ; manuelle possible | Échec → message clair, historique conservé ; points de reprise nommés (avant lancement, début d'acte) |

### T06 — Modales de confirmation

| Cas | Particularité |
|---|---|
| Lancement · décision de crise · écrasement de sauvegarde · quitter | Rappel des conséquences ; bouton de confirmation distinct du bouton d'annulation ; focus par défaut sur « Annuler » |

### T07 — Erreurs & états système

| Cas | Comportement |
|---|---|
| Échec WebGL / 3D | Bascule en repli 2D avec message |
| Connexion perdue | Mode hors ligne si possible ; état de sauvegarde visible |
| Données corrompues | Proposition de reprise depuis le dernier point valide |
| Chargement lent | Interface affichée d'abord ; scène en chargement progressif |

---

## 7. Matrice écrans × composants

| Composant | P08 | P09 | P10 | P11 | P13 | P14 | P16–18 | P20 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `ResourceGauge` | ● | ● | ● | ● | ● | ● | ● | |
| `SystemBadge` | | ● | | | ● | | ● | |
| `AlertBanner` | | | ● | ● | ● | ● | ● | |
| `ValidationReport` | | | ● | ● | | ● | | |
| `ComponentCard` / `ComparePanel` | ● | ● | | | | | | |
| `ConsequencePanel` | ● | ● | | | ● | ● | ● | ● |
| `TradeoffTable` | ● | | ● | | | | ● | |
| `TrendChart` | | | ● | | ● | ● | ● | ● |
| `ConfirmModal` | | | | ● | | | ● | |
| `DialogueBox` | ● | | | ● | | | ● | ● |
| `CameraControls` / `Legend3D` | | ● | | ● | ● | | ● | |

---

## 8. Flux de données entre interface et domaines

| Page | Lit | Écrit (via contrats) |
|---|---|---|
| P08 | Catalogue, scénario | `ScientificProfile` |
| P09–P10 | Catalogue, profil | `ComponentSelection`, `ValidationReport` |
| P11 | Configuration validée, lanceurs, orbites | `LaunchRecord` |
| P13–P15 | État de simulation | `OperationCycle` |
| P16–P19 | État de simulation, diagnostic | `CrisisDecision` |
| P20–P22 | Historique complet | `MissionReport`, progression |

> **Règle :** l'interface ne calcule rien. Les aperçus instantanés utilisent le module de simulation pur partagé ; le résultat officiel vient du moteur.

---

## 9. Structure de code React proposée

```
src/
 ├─ app/          routage par acte, gardes, store de campagne
 ├─ shell/        TopBar, LeftPanel, RightPanel, BottomBar, Drawers
 ├─ screens/
 │   ├─ menu/         P01 P02 P03 P04 P05
 │   ├─ narrative/    P06 P07 P21
 │   ├─ act1/         P08
 │   ├─ act2/         P09 P10
 │   ├─ act3/         P11 P12
 │   ├─ act4/         P13 P14 P15
 │   ├─ act5/         P16 P17 P18 P19
 │   └─ act6/         P20 P22
 ├─ overlays/     Pause, Journal, Glossaire, Archives, Confirm, Errors
 ├─ scene/        SceneHost (Three.js), Scene2DFallback, cameras, legend
 ├─ components/   C-01 … C-20
 ├─ i18n/         fr, en
 └─ api/          client des contrats (@smdg/contracts)
```

---

## 10. Accessibilité et performance (exigences transversales)

- Contraste conforme **WCAG AA** ; panneaux translucides avec fond de secours opaque.
- **Orange = accent d'interaction** (sélection, onglet actif, action principale) ; les alertes utilisent leur propre palette (ambre / rouge) avec icône et libellé : voir section 14.4.
- États toujours redondants : couleur + icône + libellé.
- Navigation clavier complète ; focus visible ; ordre logique.
- Textes FR/EN ; taille ajustable ; sous-titres pour tous les sons importants.
- Effets d'écran désactivables ; option « réduire les animations ».
- Performance : interface prioritaire, 3D progressive ; budgets (triangles, textures, lumières, images/s, poids) **à fixer après prototype**.

---

## 11. Points à trancher avant production

1. **Crise** : tour par tour (temps figé) ou compte à rebours ? *(recommandation : figé, avec « délai avant seuil » affiché)*.
2. **Modes de difficulté** : seulement l'aide, ou aussi les marges de la simulation ?
3. **Combinaisons de mesures d'urgence** : liste des combinaisons autorisées.
4. **Points de reprise** : lesquels sont proposés, et leur effet sur le score/classement.
5. **Cycles** : nombre cible pour tenir 45–75 min ; règles de l'avance rapide.
6. **Appareils et largeurs de référence** pour le responsive et la performance.
7. **Multijoueur** : intégré à l'architecture dès maintenant (voir section 13) ; reste à décider quelle part est livrée en MVP (hot-seat) et quelle part en V2 (en ligne).
8. **Incohérences documentaires** : « six actes + prologue » (livrables) vs « sept actes » (cahier d'analyse) ; score sur 100 vs 1000.

---

## 12. Ordre de réalisation suggéré

| Lot | Contenu | Page(s) |
|---|---|---|
| 1 | Shell, composants communs, tableau de bord, états | Tous |
| 2 | Atelier 2D + prévalidation (cœur pédagogique) | P08, P09, P10 |
| 3 | Revue de lancement, contrôle, cycles | P11–P15 |
| 4 | Crise, rapport, fins | P16–P22 |
| 5 | Scène 3D (vertical slice : Lune, orbiteur, 2 configurations) | P09, P11, P13 |
| 6 | Mode Guidé, accessibilité, responsive, options | P02, P04, T03 |


---

## 13. Mode multijoueur coopératif (1 à 4 joueurs)

> **Pourquoi l'intégrer maintenant.** Le défi demande une équipe jusqu'à 4 avec des rôles distincts et des décisions collectives, et le cahier de conception prévoit déjà rôles et votes dans le domaine Équipe (EQU). Si le shell, les permissions et le modèle de données ne les prévoient pas dès le MVP, les ajouter plus tard obligera à refaire presque toutes les pages. **Principe : une seule campagne, un seul jeu de pages ; le multijoueur ajoute des couches (équipe, permissions, votes), il ne duplique pas les écrans.**

### 13.1 Modes de jeu

| Mode | Description | Phase proposée |
|---|---|---|
| **Solo** | Un joueur tient les 4 rôles ; les conseillers PNJ jouent le rôle d'avis | MVP |
| **Hot-seat (même écran)** | 2 à 4 joueurs sur un seul appareil, passage de témoin entre rôles | MVP si le temps le permet (idéal pour la démo du hackathon, sans serveur temps réel) |
| **Coopératif en ligne** | 2 à 4 joueurs, chacun sur son appareil, même mission | V2 (architecture prête dès le MVP) |
| **Compétitif asynchrone** | Plusieurs équipes, même scénario, comparaison des rapports | Après V2 (réutilise P03) |

### 13.2 Les quatre rôles

Les rôles suivent les fonctions citées dans le défi (planification, conception, science, communications/ressources) et sont **nommés par fonction**, pas par personnage, pour ne pas entrer en conflit avec le récit : Maya, Daniel, Noah et Amara restent des personnages et jouent le rôle de **conseillers** dont les priorités font écho aux rôles.

| Rôle joueur | Responsabilités principales | Conseiller PNJ associé | Ressources « possédées » |
|---|---|---|---|
| **Stratège de mission** | Budget, niveau de risque accepté, choix lanceur/orbite, validation finale, départage des votes | Daniel | Budget, temps |
| **Ingénieur orbiteur** | Structure, énergie, contrôle, propulsion, prévalidation, diagnostic technique | Maya | Masse, puissance, fiabilité |
| **Responsable science** | Objectifs, instruments, observations, valeur scientifique | Noah | Données scientifiques, instruments |
| **Opérations & communications** | Communications, fenêtres, cycles, stockage et transmissions | Amara | Communications, stockage, carburant |

**Règles :**
- **Solo** : le joueur voit tous les panneaux ; les conseillers donnent leur avis comme dans la campagne de base.
- **Moins de 4 joueurs** : les rôles sont répartis ou cumulés ; les rôles non tenus sont repris par le joueur désigné. Aucun rôle n'est perdu.
- **Principe de propriété** : chaque rôle **modifie** son domaine, les autres le **voient** et peuvent **proposer** un changement. Évite les conflits d'édition sur un même composant.

### 13.3 Pages et overlays ajoutés

| ID | Écran | Objectif | Contenu clé |
|---|---|---|---|
| **M01** | Salon d'équipe | Créer ou rejoindre une équipe | Code d'invitation / lien, liste des joueurs (pseudo ou invité), choix du mode, bouton « Prêt » ; connexion de l'hôte |
| **M02** | Choix des rôles | Répartir les 4 rôles | Cartes de rôle (responsabilités, ressources possédées, conseiller PNJ), répartition manuelle ou aléatoire, résumé des priorités |
| **M03** | Fiche de rôle | Rappeler ce qu'on peut faire | Droits d'édition, décisions à prendre dans l'acte courant, objectifs de coordination |
| **M04** | Panneau Équipe (overlay permanent) | Communiquer et décider | Onglets : Présence · Propositions · Votes · Chat · Annotations |
| **M05** | Go / No-Go de lancement | Décision collective avant l'irréversible | Chaque rôle déclare *Go* ou *No-Go* avec motif ; rapport de risque partagé |
| **M06** | Vote de crise | Choix collectif des mesures d'urgence | Chaque rôle propose et vote ; `TradeoffTable` par rôle ; départage par le Stratège |
| **M07** | Rapport d'équipe | Évaluer la coordination | Contribution par rôle, propositions acceptées/refusées, conflits résolus, décisions clés |
| **M08** | Connexion perdue / reprise | Gérer les absences | État du joueur absent, reprise du rôle, délégation temporaire |
| **M09** | Passage de témoin (hot-seat) | Changer de joueur sur le même écran | Écran de transition « À toi, [rôle] » avec résumé de ce qui a changé ; masque l'écran pendant l'échange |

### 13.4 Modifications du shell

```
┌─────────────────────────────────────────────────────────────────┐
│ TOPBAR  Acte · Étape │ ÉQUIPE : ● Stratège ● Ingénieur ○ Science │
│                       │          ● Ops   (présence · prêt)        │
├───────────┬───────────────────────────────────┬─────────────────┤
│ GAUCHE    │          ZONE CENTRALE            │ DROIT           │
│ États +   │   Scène 3D ou repli 2D            │ Contexte du rôle│
│ propriété │   + curseurs/pings des équipiers  │ + onglet ÉQUIPE │
│ par rôle  │                                   │ (M04)           │
├───────────┴───────────────────────────────────┴─────────────────┤
│ Ressources (par propriétaire) │ Alertes │ Go/No-Go │ ACTION     │
└─────────────────────────────────────────────────────────────────┘
```

| Zone | Ajout en mode équipe |
|---|---|
| **Topbar** | Barre d'équipe : avatars, rôle, état (en ligne / absent / prêt), indicateur « en attente de … » |
| **Panneau gauche** | Étiquette du rôle propriétaire sur chaque sous-système ; verrou visible quand quelqu'un édite |
| **Zone centrale** | Curseurs ou marqueurs des équipiers sur la scène, **pings** et annotations (une annotation = un repère 3D **et** un message dans le panneau Équipe) |
| **Panneau droit** | Onglet **Équipe** (M04) en plus du contexte de page |
| **Barre basse** | Jauges regroupées par propriétaire ; l'action principale devient « Proposer » ou « Valider » selon le droit du rôle |

> **Solo :** le panneau Équipe est replié par défaut et la barre d'équipe n'affiche que les conseillers PNJ. Le même shell sert aux deux modes.

### 13.5 Permissions par page

| Page | Stratège | Ingénieur | Science | Ops & comms |
|---|:-:|:-:|:-:|:-:|
| P08 Profil scientifique | Propose / valide | Propose | **Édite** | Propose |
| P09 Atelier — structure/énergie/contrôle/propulsion | Propose | **Édite** | Propose | Propose |
| P09 Atelier — charge utile (instruments) | Propose | Propose | **Édite** | Propose |
| P09 Atelier — communications / stockage | Propose | Propose | Propose | **Édite** |
| P10 Prévalidation | **Valide** (accepte risques) | Lance | Lit | Lit |
| P11 Revue de lancement — lanceur et orbite | **Édite** | Propose | Propose | Propose (fenêtres) |
| P11 / M05 Go-No-Go | Départage | Vote | Vote | Vote |
| P14 Planificateur de cycle | Valide | Lit | **Édite** (observations) | **Édite** (transmissions) |
| P17 Diagnostic | Lit | **Anime** | Lit | Lit |
| P18 / M06 Arbitrage | Départage | Vote | Vote | Vote |
| P20 Rapport final | Lit | Lit | Lit | Lit |

*« Propose » = envoie une proposition dans le panneau Équipe ; le propriétaire l'accepte ou la refuse (avec motif).*

### 13.6 Propositions, votes et négociation

**Cycle d'une proposition :**
`Créée` → `Discutée` (commentaires) → `Acceptée / Refusée / Amendée` par le propriétaire → `Appliquée` (journalisée).

**Règles de vote :**

| Décision | Règle proposée *(à calibrer)* |
|---|---|
| Acceptation d'un avertissement (P10) | Validation du Stratège après avis visible de l'Ingénieur |
| Go / No-Go de lancement (M05) | **Unanimité** des quatre *Go* ; un *No-Go* bloque et exige un motif |
| Mesure d'urgence (M06) | Majorité ; **égalité départagée par le Stratège** |
| Reporter l'instrument d'Elias (P08) | Proposé par la Science, validé par l'Ingénieur (impact énergie) |

**Aucun minuteur par défaut** : comme en solo, le temps est figé pendant la discussion. Option d'hôte : « forcer la décision » au bout d'un délai défini *(à valider, risque d'abus)*.

**Détection des tensions :** le tableau de bord signale automatiquement les conflits entre rôles, par exemple « Science : +1 instrument = +12 W et +6 kg ; Ingénieur : marge énergétique < seuil ». Chaque tension propose une résolution (retirer, compenser, accepter le risque). Cela rend visibles les arbitrages que le défi demande de négocier.

### 13.7 Équilibre de charge par acte

Risque principal : un joueur peut rester inactif pendant qu'un autre décide. Chaque acte donne donc une **tâche principale** à un rôle et une **tâche de revue** aux autres.

| Acte | Tâche principale | Tâche de revue des autres |
|---|---|---|
| I Profil | Science (objectifs, instrument d'Elias) | Ingénieur : coût énergétique ; Ops : volume de données ; Stratège : budget |
| II Atelier | Ingénieur (assemblage) + Ops (comms) | Science : adéquation des instruments ; Stratège : budget |
| III Lancement | Stratège (lanceur, orbite) + Ops (fenêtres) | Ingénieur : masse ; Science : couverture |
| IV Exploitation | Ops (cycles, transmissions) + Science (observations) | Ingénieur : surveillance des tendances ; Stratège : risque |
| V Crise | Ingénieur (diagnostic) | Tous : vote, avec argumentaire de rôle |
| VI Rapport | Tous | — |

### 13.8 Gestion des absences et de la synchronisation

- **Déconnexion** : le rôle passe en état « absent » ; après un délai configurable, il est repris par un joueur désigné ou par un **conseiller automatique** (propose, ne décide pas seul).
- **Reconnexion** : retour au même rôle avec un **résumé de ce qui a changé** (propositions, décisions, alertes).
- **Verrous** : un sous-système en cours d'édition est verrouillé pour les autres (affiché) ; évite les écrasements.
- **Autorité** : le serveur reste maître de la simulation (résultat officiel, cohérent avec le cahier de conception) ; les clients affichent des aperçus.
- **Reproductibilité** : mêmes entrées et décisions de l'équipe → mêmes résultats (TC-029 étendu).

### 13.9 Données et événements (propositions)

**Objets ajoutés au modèle de données :**

| Objet | Champs minimaux |
|---|---|
| `Team` | team_id, campaign_id, mode, host_id, members[], created_at |
| `Member` | member_id, display_name, role, status (en ligne / absent / prêt), joined_at |
| `Proposal` | proposal_id, author_role, target_page, target_object, change, status, comments[], decided_by, decided_at |
| `Vote` | vote_id, subject (go_nogo / crisis / risk), ballots[{role, choice, reason}], result, tiebreak_by |
| `Annotation` | annotation_id, author_role, scene_anchor, text, created_at |
| `TeamReport` | contribution_by_role, proposals_accepted/refused, conflicts_resolved, coordination_score |

**Événements ajoutés au catalogue :**

| ID | Événement | Effet attendu | Trace |
|---|---|---|---|
| EVT-TEAM-001 | Équipe créée / joueur rejoint | Salon mis à jour | team_joined |
| EVT-TEAM-002 | Rôle attribué | Droits appliqués | role_assigned |
| EVT-TEAM-003 | Proposition créée / décidée | Journal + notification | proposal_created / proposal_decided |
| EVT-TEAM-004 | Go / No-Go exprimé | Résultat consolidé | launch_poll |
| EVT-TEAM-005 | Vote de crise clos | Décision appliquée | crisis_vote |
| EVT-TEAM-006 | Tension de ressources détectée | Alerte d'équipe | resource_conflict |
| EVT-TEAM-007 | Joueur absent / de retour | Résumé de reprise | member_status |

### 13.10 Rapport d'équipe et score de coordination

Le défi veut récompenser la collaboration. Le rapport final (P20) gagne une section **Équipe** (M07) :

- Contribution de chaque rôle **sans classement humiliant** : décisions clés, propositions retenues, tensions résolues.
- Catégorie de score **Coordination** (poids à calibrer) : cohérence entre propositions et décisions, conflits résolus avant l'irréversible, absence d'avertissements acceptés sans avis.
- Même règle qu'en solo : le score ne compense jamais une contrainte bloquante.

### 13.11 Technique

| Sujet | Proposition |
|---|---|
| Domaine | EQU (équipe, rôles, votes), indépendant de SIM et CON ; échanges par contrats |
| Temps réel | Socket.IO, salles par équipe (déjà prévu, interface I2) |
| Hot-seat | Même code que l'équipe en ligne, transport local ; sert de **bouchon** de test du multijoueur |
| Permissions | Couche de droits par rôle côté serveur ; l'interface ne fait qu'afficher |
| Sauvegarde | Une campagne d'équipe est partagée ; chaque membre y retrouve son rôle |

### 13.12 Tests multijoueur à ajouter à la matrice QA

| ID | Cas | Résultat attendu |
|---|---|---|
| TC-M01 | Rejoindre un salon avec code | Joueur ajouté, rôle choisi, état visible de tous |
| TC-M02 | Édition d'un sous-système par un non-propriétaire | Refus avec explication ; proposition possible |
| TC-M03 | Édition simultanée | Verrou affiché ; aucun écrasement |
| TC-M04 | Go/No-Go avec un No-Go | Lancement bloqué ; motif affiché |
| TC-M05 | Vote de crise à égalité | Départage par le Stratège, tracé |
| TC-M06 | Déconnexion en pleine décision | Rôle repris ; résumé à la reconnexion |
| TC-M07 | Équipe de 2 joueurs | Les 4 rôles couverts sans écran vide |
| TC-M08 | Même décisions d'équipe, même graine | Résultats identiques |
| TC-M09 | Hot-seat 4 joueurs | Passage de témoin sans fuite d'écran ni perte d'état |
| TC-M10 | Solo | Aucun élément multijoueur gênant ; panneau Équipe replié |

### 13.13 Points à décider

1. Livrer le **hot-seat** dans le MVP ou attendre le mode en ligne ?
2. Quand un humain tient un rôle, que deviennent les dialogues du PNJ associé : conseiller (recommandé) ou remplacé ?
3. Règles exactes de vote (unanimité, majorité, rôle du Stratège) et option de « forcer la décision ».
4. Équilibrage : les marges de la simulation changent-elles avec le nombre de joueurs ?
5. Authentification : invité + pseudo seulement, ou comptes (cahier de conception : mode invité et OAuth optionnel) ?
6. Chat texte : modération minimale, ou messages prédéfinis uniquement (plus sûr et plus rapide en hackathon) ?


---

## 14. Direction artistique et guide UI

> **Référence visuelle fournie par l'équipe** : concept d'interface « Vortex — Vessel Command Hub » (`references/DA_reference_vortex_command_hub.webp`). Elle sert **d'inspiration d'ambiance et de structure**. On n'en reprend ni les éléments graphiques, ni la mise en page à l'identique, ni son vocabulaire (armes, puissance de feu) : le jeu parle de mission, de ressources et de science.

![Référence DA](references/DA_reference_vortex_command_hub.webp)

### 14.1 Ce que l'on retient de la référence

| Caractéristique observée | Traduction dans THE LAST LIGHT |
|---|---|
| Scène plein cadre : engin spatial cinématographique sur fond noir, éclairage contrasté, horizon planétaire lumineux | La scène 3D occupe **tout l'écran** ; l'orbiteur est le point focal, légèrement décentré pour laisser respirer les panneaux |
| Panneaux **en verre sombre translucide**, bordure fine, coins peu arrondis, flou d'arrière-plan | Style de panneau unique, utilisé partout (section 14.5) |
| Panneaux **flottants** répartis en périphérie, jamais en colonnes opaques | Les zones du shell (section 3) deviennent des **zones de flottement** sur la scène, pas des bandes pleines |
| **Un seul accent chaud (orange)** sur un monde sombre et froid | Orange = ce qui est actif, sélectionné ou l'action principale |
| Barre d'onglets segmentée en haut au centre | Navigation d'étape à l'intérieur d'un acte |
| Rail vertical d'icônes à gauche | Rail des modules (Énergie, Données, Comms, Journal…) |
| Panneau de statistiques ancré sur l'engin | Fiche de composant / de l'orbiteur avec **ligne de rappel** vers la pièce 3D |
| Lignes clé/valeur avec pastille d'icône | Composant `KeyValueRow` (section 14.6) |
| Graphiques : radar orange, barres segmentées, peigne vertical | Profil de performance, répartitions, énergie sur un cycle |
| Titre de page + sous-titre court sous le logo | « Titre de l'écran » + une phrase d'objectif (rôle pédagogique) |
| Icônes de service en haut à droite (recherche, messages, alertes, avatar) | Recherche (glossaire), **Équipe/chat**, alertes/journal, **profil et rôle** |

### 14.2 Ce que l'on adapte ou évite

| Point de la référence | Risque | Décision |
|---|---|---|
| Texte très petit (≈ 10 px) sur fond photo | Lisibilité, accessibilité | **Minimum 12 px** pour les libellés, 14 px pour le corps ; fond de panneau jamais inférieur à 55 % d'opacité |
| Texte blanc sur pastille orange | Contraste insuffisant (≈ 3:1) | **Texte sombre** sur fond orange (≈ 6:1) |
| Graphique en peigne vertical sans axes ni valeurs | Illisible pour apprendre | Toujours **axes, unités, seuils et valeurs** (14.7) |
| Fond photoréaliste | Poids, chargement, faible connexion | Scène 3D temps réel **stylisée-réaliste** ; le repli 2D utilise une illustration pré-rendue légère |
| Vocabulaire de combat | Hors sujet | Remplacé par le vocabulaire de mission (14.10) |
| Orange à la fois pour le choix et les mises en avant | Confusion avec les alertes | Alertes avec **palette et icônes propres** (14.4) |
| Flou d'arrière-plan sur de nombreuses surfaces | Coût de rendu | Budget de flous, option « Réduire la transparence » (14.12) |

### 14.3 Principes de la direction artistique

1. **Cinématographique mais lisible** : l'ambiance sert la narration, jamais au détriment des données (reprend UX-1).
2. **Froid partout, chaud uniquement pour agir** : noirs, bleus-gris, cyan pour l'information ; orange pour l'interaction.
3. **Verre et métal** : interface en verre sombre, objets en matériaux techniques crédibles (composite, aluminium, isolants).
4. **Une seule grammaire de panneau** : titre, trait fin, contenu ; on ne multiplie pas les styles.
5. **Hiérarchie par la luminosité, pas par la couleur** : le plus important est le plus clair et le plus grand.
6. **Sobriété des effets** : lueurs et bruit radio discrets, toujours désactivables.

### 14.4 Palette (jetons de couleur)

*Valeurs estimées à partir de la référence ; à affiner sur maquette.*

| Jeton | Valeur | Usage |
|---|---|---|
| `--space-900` | `#05070B` | Fond de scène, espace profond |
| `--space-800` | `#0B0F15` | Fond des écrans sans 3D |
| `--glass` | `16 20 27` (RGB) | Fond de panneau, utilisé avec opacité 0,55–0,70 |
| `--stroke` | `rgba(255,255,255,.12)` | Bordure de panneau, séparateurs |
| `--stroke-strong` | `rgba(255,255,255,.28)` | Focus, survol, panneau actif |
| `--text-1` | `#F2F4F7` | Titres, valeurs |
| `--text-2` | `#A9B3C1` | Libellés, texte secondaire |
| `--text-3` | `#7C8796` | Indications non essentielles uniquement |
| `--accent` | `#F26B1D` | **Sélection, onglet actif, action principale, valeur mise en avant** |
| `--accent-hover` | `#FF8340` | Survol de l'accent |
| `--on-accent` | `#0B0D10` | Texte posé sur l'accent |
| `--info` | `#4DB8FF` | Information, trajectoires, communications, liens |
| `--ok` | `#3CCFB0` | Opérationnel |
| `--warn` | `#F2B63C` | Avertissement, dégradé |
| `--crit` | `#E5484D` | Critique, bloquant |
| `--off` | `#6B7480` | Hors ligne, indisponible |

**Règles d'usage :**

- **L'accent orange n'est jamais un état système.** Les états (opérationnel / dégradé / critique / hors ligne) utilisent `--ok`, `--warn`, `--crit`, `--off`.
- **Risque de confusion orange / ambre** : l'ambre (`--warn`) est toujours accompagné d'un **triangle d'avertissement** et d'un libellé ; l'orange (`--accent`) est toujours un **remplissage plein ou un contour épais avec coche**. Ne jamais se fier à la teinte seule.
- **Dégradé de données** (barres, radar) : de l'ambre vers l'orange pour une intensité croissante, comme dans la référence ; les seuils critiques passent en `--crit`.
- Chaque état porte **couleur + icône + libellé** (principe UX-6).

### 14.5 Anatomie du panneau « verre »

```
┌─ TITRE DU PANNEAU ──────────────────────┐   ← titre 12 px, majuscules, espacement des lettres
│ ─────────────────────────────────────── │   ← trait fin sous le titre (--stroke)
│  [icône] Libellé                 Valeur │   ← lignes clé/valeur
│  [icône] Libellé                 Valeur │
└──────────────────────────────────────────┘
```

```css
.panel {
  background: rgb(var(--glass) / 0.60);
  backdrop-filter: blur(14px) saturate(120%);
  border: 1px solid var(--stroke);
  border-radius: 6px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06),
              0 8px 24px rgb(0 0 0 / 0.35);
  padding: 12px 16px;
}
@supports not (backdrop-filter: blur(1px)) {
  .panel { background: rgb(var(--glass) / 0.92); }   /* repli opaque */
}
.panel--solid { background: rgb(var(--glass) / 0.92); backdrop-filter: none; }
```

| Propriété | Règle |
|---|---|
| Rayon | 6 px pour les panneaux ; 4 px pour pastilles, lignes et boutons |
| Bordure | 1 px ; jamais d'ombre colorée |
| Grille | Base de **4 px** ; marges 12/16/24 ; écart entre panneaux 12 |
| Marge de sécurité | 24 px des bords de l'écran (plus sur mobile avec zones sûres) |
| Superposition | Pas plus d'**un** panneau large ouvert par zone ; les modales se placent au-dessus avec un voile sombre |

### 14.6 Catalogue des composants (style)

| Composant | Description | États |
|---|---|---|
| **Wordmark** | « THE LAST LIGHT » en majuscules, gras, en haut à gauche | — |
| **Titre d'écran** | Titre 28–32 px + sous-titre 14 px (objectif en une phrase) | — |
| **Onglets segmentés** (`TabBar`) | Groupe de boutons dans un panneau verre ; actif = fond `--accent`, texte `--on-accent` | défaut / survol / actif / désactivé (raison) |
| **Rail d'icônes** (`SideRail`) | Colonne verticale d'entrées icône + libellé ; actif = barre orange à gauche et icône pleine | défaut / survol / actif / alerte (pastille) |
| **Pastille d'icône** (`IconTile`) | Carré 28 px, fond légèrement plus clair, icône trait 1,5 px | — |
| **Ligne clé/valeur** (`KeyValueRow`) | Pastille + libellé à gauche, valeur à droite, chiffres tabulaires | normal / faible / critique |
| **Ligne de statistique** (`StatRow`) | Comme ci-dessus avec la valeur dans une pastille sombre | idem |
| **Puce** (`Chip`) | Pastille arrondie ; version « mise en avant » = fond orange, texte sombre | — |
| **Bouton principal** | Fond `--accent`, texte `--on-accent`, 40 px de haut minimum | disponible / indisponible (raison) / en cours / confirmé |
| **Bouton secondaire** | Verre, bordure `--stroke-strong` | idem |
| **Fiche flottante** (`CalloutPanel`) | Panneau avec **ligne de rappel** et point d'ancrage sur la pièce 3D | ancré / détaché |
| **Jauge** (`ResourceGauge`) | Barre segmentée façon « LED », pourcentage et valeur chiffrés, seuil marqué | normal / faible / critique |
| **Barre haute droite** | Icônes : recherche (glossaire), Équipe (chat), alertes/journal, profil + rôle | non lu (pastille) |

**Mapping avec les composants de la section 4 :** `TabBar` → navigation d'étape ; `SideRail` → rail des modules ; `CalloutPanel` → fiche de composant ; `KeyValueRow`/`StatRow` → contenu de `ComponentCard` et du tableau de bord.

### 14.7 Graphiques

| Type (dans la référence) | Usage dans le jeu | Règles |
|---|---|---|
| **Radar** (polygone orange translucide, sommets marqués) | **Profil de performance** : science, énergie, données, communications, fiabilité ; rapport final (P20) et comparaison (P03) | Axes nommés, valeurs affichées, 2 séries maximum pour comparer |
| **Barres segmentées** (court / moyen / long) | Répartition : énergie par sous-système, charge de données, allocation par rôle | Pourcentage chiffré à droite, ordre stable |
| **Peigne vertical** (système d'énergie) | Évolution de l'énergie ou du stockage sur un cycle | **Obligatoire** : axe du temps, unité, ligne de seuil critique, valeur au survol et au clavier |
| *(nouveau)* **Courbe de tendance** | Prévision vs réel, scénario « pire cas » | Prévision en pointillés ; zone critique teintée en `--crit` |

Toute visualisation a une **alternative textuelle ou tabulaire** (bouton « Voir les valeurs »).

### 14.8 Typographie

| Rôle | Police proposée | Taille | Notes |
|---|---|---|---|
| Interface et titres | Sans-serif géométrique de la famille de Montserrat (licence libre) | Titre écran 28–32 ; titre panneau 12 en majuscules, espacement +0,08 em ; corps 14 ; libellé 12–13 | Alternative si la police ne convient pas : Sora ou Manrope |
| Valeurs et télémétrie | Même police avec **chiffres tabulaires** (`font-variant-numeric: tabular-nums`) ; monospace réservée aux journaux | 16–20 pour les valeurs clés | Les chiffres ne doivent pas « danser » quand ils changent |
| Narration (dialogues) | Même famille, graisse normale, interligne 1,5 | 16 | Lisibilité longue durée |

Règles : **polices auto-hébergées et sous-ensemblées** (faible bande passante) ; tailles ajustables dans les options ; majuscules réservées aux titres courts.

### 14.9 Iconographie

- Icônes **au trait** (1,5 px), grille de 20 px dans une pastille de 28 px ; base proposée : bibliothèque d'icônes libre cohérente avec React, complétée par des icônes sur mesure pour les six sous-systèmes (structure, énergie, communications, contrôle, charge utile, propulsion).
- Chaque icône d'état a une **forme distincte** : ✓ cercle (opérationnel), △ triangle (dégradé), ◇ losange avec « ! » (critique), ⊘ barré (hors ligne).
- Pas d'icônes décoratives sans fonction.

### 14.10 Vocabulaire : de la référence vers le jeu

| Référence (combat) | THE LAST LIGHT |
|---|---|
| Ship Statistics : Health / Speed / Evasion / Firepower | **Fiche orbiteur** : Fiabilité / Masse / Puissance disponible / Valeur scientifique |
| Ship Overview : nom, classe, rôle, spécialité | **Fiche mission** : nom de l'orbiteur, classe de lanceur, orbite, type de mission, spécialité (puce : objectif principal) |
| Costs : coût de construction, entretien, besoin | **Budget** : coût de conception, coût d'exploitation, budget restant |
| Ship Performance (radar) | **Profil de performance** |
| Weapons Range (court / moyen / long) | **Répartition** (ex. énergie par sous-système) |
| Energy System | **Système d'énergie** : production, consommation, batterie |
| Menu gauche : Defense, Energy, Time Log, Targeting, Cargo, Systems | **Rail des modules** : Énergie, Données, Communications, Journal, Objectifs, Charge utile, Systèmes |
| Onglets : Systems, Frames, Mods, Utility | **Onglets d'étape** (ex. Atelier : Orbiteur · Instruments · Validation · Résumé) |

*Les valeurs numériques de la référence (1800, 55, 450…) ne sont pas reprises : toutes les valeurs du jeu viennent du moteur de simulation et sont à calibrer.*

### 14.11 Direction artistique de la scène 3D

| Domaine | Directive |
|---|---|
| **Cadrage** | Orbiteur en plan trois-quarts légèrement en contre-plongée, décentré (tiers droit) ; horizon lunaire courbe en bas de cadre ; plans narratifs plus larges |
| **Éclairage** | Lumière solaire **directionnelle dure** (ombres nettes) ; **contre-jour froid** de type lumière terrestre pour détacher la silhouette ; lueur chaude discrète des propulseurs ; pas de bruit colorisé |
| **Matériaux** | Composite blanc cassé, tuiles ou panneaux thermiques noirs, isolant doré, aluminium brossé, panneaux solaires bleu nuit, verre technique. Lignes de panneaux et petites inscriptions pour la crédibilité |
| **Cohérence** | Mêmes matériaux entre atelier, contrôle de mission et rapport (réutilisation de la bibliothèque PBR) |
| **Environnement** | Fond noir profond, champ d'étoiles clairsemé ; surface lunaire minérale, gris froid ; pas d'atmosphère (le halo bleu de la référence est remplacé par un **liseré froid** de lumière terrestre) |
| **Post-traitement** | Légère floraison sur les émissifs, vignettage faible, grain optionnel ; **pas d'aberration chromatique** ; tous les effets désactivables |
| **États visuels** | Sous-système dégradé : lueur ambre discrète et pulsation lente ; critique : rouge fixe avec contour ; hors ligne : désaturé et assombri |
| **Fins** | Mêmes assets, variations de lumière, de dommages et de cadrage (comme prévu par DA-05) |
| **Fiches ancrées** | Une ligne fine relie la fiche à la pièce 3D ; la ligne disparaît si la pièce sort du champ |

### 14.12 Mouvement, performance et accessibilité

**Mouvement**

- Durées : 150–250 ms, courbe de ralentissement douce ; apparition d'un panneau = fondu + décalage de 8 px.
- Valeurs : interpolation courte (≤ 300 ms) ; jamais d'animation qui retarde une action urgente.
- Alerte critique : **deux pulsations maximum**, puis état fixe.
- Option « Réduire les animations » : coupe pulsations, interpolations et mouvements de caméra automatiques.

**Performance**

- **Budget de flou** : au plus 6 panneaux avec `backdrop-filter` visibles ; au-delà, panneaux opaques.
- Option **« Réduire la transparence »** : panneaux à 92 % d'opacité sans flou (aide aussi la lisibilité).
- Interface affichée avant la scène ; polices et icônes légères ; **repli 2D** avec les mêmes panneaux sur un fond illustré pré-rendu.

**Accessibilité**

- Contrastes cibles **WCAG AA** : 4,5:1 pour le texte courant, 3:1 pour les grands textes et éléments graphiques ; tester sur le pire arrière-plan (zone lumineuse de la scène).
- Focus visible : contour `--stroke-strong` + anneau accent de 2 px.
- États jamais transmis par la couleur seule.
- Zones tactiles ≥ 44 px sur mobile.
- Mode **contraste renforcé** : panneaux opaques, bordures plus marquées.

### 14.13 Adaptation du shell et des pages

| Élément du shell (section 3) | Habillage DA |
|---|---|
| Topbar | Wordmark à gauche ; onglets segmentés au centre ; icônes de service à droite ; **pas de bande pleine**, mais un voile dégradé très léger pour la lisibilité |
| Panneau gauche | `SideRail` (rail des modules) + état des sous-systèmes |
| Zone centrale | Scène plein cadre, aucun cadre autour |
| Panneau droit | Panneaux verre empilés (fiche mission, budget, catalogue) |
| Barre basse | Rangée de panneaux de graphiques (profil, répartition, énergie) comme dans la référence ; l'action principale reste à sa place fixe |
| Overlays et modales | Panneau verre `--solid` + voile sombre ; confirmation irréversible avec bordure `--stroke-strong` |

| Page | Application de la DA |
|---|---|
| P01 Menu | Scène d'ambiance plein écran ; wordmark ; boutons verre, bouton principal orange |
| P08 Profil | Cartes d'objectifs en verre ; sélection = bordure orange + coche ; coût estimé en pied |
| P09 Atelier | **Page la plus proche de la référence** : rail à gauche, fiche flottante ancrée sur la pièce, fiche mission et budget à droite, trois graphiques en bas |
| P10 Prévalidation | Panneau large ; erreurs en `--crit`, avertissements en `--warn`, chacun avec icône |
| P11 Revue de lancement | Trajectoires en `--info` ; rapport de risque en panneau verre |
| P13 Contrôle | Rail des modules, graphiques d'énergie et de stockage en bas |
| P16–P19 Crise | Variante d'éclairage plus contrastée ; `--crit` utilisé avec parcimonie ; l'orange reste réservé aux boutons de décision |
| P20 Rapport | Radar du profil de performance au centre ; sections en panneaux verre |
| M04 Équipe | Panneau verre ancré à droite ; avatars avec initiales du rôle ; messages en bas |

### 14.14 Mise en œuvre : jetons pour React et Tailwind

```css
:root {
  --space-900: #05070B;  --space-800: #0B0F15;
  --glass: 16 20 27;
  --stroke: rgb(255 255 255 / .12);  --stroke-strong: rgb(255 255 255 / .28);
  --text-1: #F2F4F7;  --text-2: #A9B3C1;  --text-3: #7C8796;
  --accent: #F26B1D;  --accent-hover: #FF8340;  --on-accent: #0B0D10;
  --info: #4DB8FF;  --ok: #3CCFB0;  --warn: #F2B63C;  --crit: #E5484D;  --off: #6B7480;
  --radius-panel: 6px;  --radius-small: 4px;
}
```

```js
// tailwind.config.js (extrait)
theme: { extend: { colors: {
  space: { 900: 'var(--space-900)', 800: 'var(--space-800)' },
  accent: { DEFAULT: 'var(--accent)', hover: 'var(--accent-hover)', on: 'var(--on-accent)' },
  info: 'var(--info)', ok: 'var(--ok)', warn: 'var(--warn)', crit: 'var(--crit)', off: 'var(--off)',
  text: { 1: 'var(--text-1)', 2: 'var(--text-2)', 3: 'var(--text-3)' },
}}}
```

Les jetons vivent dans un seul fichier de thème ; les composants ne contiennent **aucune couleur en dur**. Cela permet d'ajouter plus tard un thème à contraste renforcé ou un habillage par scénario (cible, objectifs, palette) sans toucher aux écrans.

### 14.15 Liste de contrôle DA / UI (à utiliser en revue)

- [ ] La scène 3D reste visible et ne perd pas son point focal.
- [ ] Un seul style de panneau est utilisé.
- [ ] L'orange n'apparaît que sur ce qui est actif, sélectionné ou principal.
- [ ] Chaque état est lisible sans la couleur (icône + libellé).
- [ ] Tous les textes respectent les minima (12 px / 14 px) et les contrastes.
- [ ] Chaque graphique a axes, unités, seuils et valeurs.
- [ ] L'écran reste lisible en **1280 × 720** et en largeur mobile.
- [ ] Les effets (flou, grain, pulsations) sont désactivables et l'écran reste lisible sans eux.
- [ ] Le repli 2D reproduit les mêmes panneaux.
- [ ] Aucun élément graphique de la référence n'est copié tel quel.

### 14.16 Points à valider

1. **Famille de police finale** et licence d'auto-hébergement.
2. **Photoréalisme ou stylisation** : niveau de détail de l'orbiteur compatible avec les appareils de référence.
3. **Valeurs des jetons** (couleurs, opacités, flou) après maquette haute fidélité.
4. **Habillage par scénario** (futurs scénarios déblocables) : même palette ou variantes d'accent.
5. **Fond du repli 2D** : illustration pré-rendue unique ou plusieurs (une par acte).
6. **Budget de flou et de lumières** à mesurer sur le prototype 3D (lot 4A).

### 14.17 Ordre de réalisation

| Étape | Contenu |
|---|---|
| 0 | Fichier de jetons, panneau verre, onglets, rail, ligne clé/valeur, bouton principal |
| 1 | Maquette haute fidélité de P09 (Atelier) comme **écran étalon** de la DA |
| 2 | Bibliothèque de graphiques (radar, barres segmentées, peigne/courbe) avec axes et seuils |
| 3 | Habillage des autres pages à partir de l'écran étalon |
| 4 | Scène 3D : éclairage, matériaux, contre-jour froid, états visuels |
| 5 | Revue de contraste, de performance et de lisibilité avec la liste de contrôle 14.15 |
