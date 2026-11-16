# THE LAST LIGHT — Front (P01 Menu principal)

React + TypeScript + Vite. Architecture **MVVM**, dépendances orientées vers le domaine.

```
View (React, sans logique) → ViewModel (Store observable) → Ports (domain/ports.ts) ← Adaptateurs (data/)
```

| Couche | Fichiers | Rôle |
|---|---|---|
| Model | `domain/campaign.ts`, `domain/ports.ts` | Types métier ; interfaces `CampaignRepository`, `CapabilitiesProvider`, `Navigator` |
| ViewModel | `features/menu/MenuViewModel.ts` | État et règles de l'écran (Continuer disponible ? confirmation d'écrasement ? erreurs) ; testable sans React ni DOM |
| View | `features/menu/MenuView.tsx` | Affichage, accessibilité, délégation des actions |
| Adaptateurs | `data/*` | HTTP (backend), local (démo/hors ligne), WebGL, navigation hash |
| Composition | `app/container.ts` | **Seul** endroit qui choisit les implémentations |

## Lancer
    npm install && cp .env.example .env && npm run dev

## Brancher le backend
1. Renseigner `VITE_API_URL` (ex. `http://localhost:3000/api`) et `VITE_USE_MOCK=0` dans `.env`.
2. Contrat attendu par `HttpCampaignRepository` (**à aligner avec les contrats du backend**) :

| Appel | Réponse |
|---|---|
| `GET {API}/campaigns/latest` | `200` `{ "id": string, "current_act": 0..6, "mode": "guided"\|"standard"\|"expert", "updated_at": ISO-8601 }` ; `404`/`204` = aucune sauvegarde |

3. Si les noms de champs diffèrent, ne modifier que `toDomain()` dans `HttpCampaignRepository.ts`.
4. Authentification : `credentials: 'include'` (cookies) ; pour un jeton, ajouter l'en-tête dans l'adaptateur.
5. CORS : le backend doit autoriser l'origine du front avec les cookies.

## Ajouter une page
Créer `features/<page>/<Page>ViewModel.ts` + `<Page>View.tsx`, déclarer ses ports dans `domain/ports.ts`, l'instancier dans `container.ts`, puis l'ajouter aux routes de `App.tsx`.

## Notes
- `src/styles.css` reprend les jetons de la section 14 du document d'architecture (CSS simple ; migration Tailwind possible via les variables).
- `.scene` est l'emplacement de la scène Three.js ; le fond CSS sert de repli 2D.
- Chaînes en français codées dans la View : à extraire vers `i18n/` (FR/EN) à l'ajout de la 2ᵉ page.

## P02 — Choix du mode (`features/mode/`)
`ModeSelectionViewModel` : sélection obligatoire avant « Confirmer », pas de double validation, erreurs réseau affichées. Navigation : `/mode` → `/campagne/prologue`.

| Appel | Corps / réponse |
|---|---|
| `POST {API}/campaigns` | corps `{ "mode": "guided"\|"standard"\|"expert" }` ; `201` même forme que `GET /campaigns/latest` (nouvelle campagne à l'acte 0) |

Les routes `/mode` et `/` créent un ViewModel neuf à chaque visite (l'écran se recharge au retour).

## P06 — Prologue (`features/prologue/`)
Scènes P0-S01 à P0-S03, puis `/campagne/briefing`. Contrôles : Continuer, Passer la scène, Historique, Pause (Échap). Sous-titre/description du son toujours affiché.

- `ScriptRepository` : script statique (`StaticScriptRepository`) ; adapter vers le backend/CMS en implémentant ce port.
- `EventRecorder` : journalise `EVT-PRO-001` et `EVT-PRO-002` à l'entrée de la scène (une fois). Best-effort : un échec n'interrompt pas le joueur.

| Appel | Corps |
|---|---|
| `POST {API}/campaigns/{id}/events` | `{ "code": "EVT-PRO-001", "trace": "signal_seen", "occurred_at": ISO-8601 }` |

## P05 — Crédits et manifeste des visuels (`features/credits/`, `public/assets-manifest.json`)
Chaque visuel est déclaré dans le manifeste : source, URL, crédit, licence, statut (`a-trouver` → `a-produire` → `valide` → `integre`). La page Crédits n'affiche que les visuels `valide`/`integre`. En développement, `manifestIssues()` signale un crédité sans crédit, licence confirmée, URL de source ou fichier. Les entrées « a-trouver » sont des **pistes** : vérifier la page et la licence avant de passer à `valide`.

## P07 — Briefing (`features/briefing/`)
Onglets Contexte · Personnages · Objectifs · Contraintes (clavier : flèches), choix de la posture initiale, réaction du personnage, question supplémentaire sur LUNAR-01. Sortie : « Commencer l'Acte I » (posture choisie) ou « Passer sans choisir » (explicite) → `/campagne/acte-1/profil`. La posture ne change jamais la faisabilité technique. **Les trois postures (prudente, équilibrée, ambitieuse) sont une proposition à valider.**

| Appel | Corps |
|---|---|
| `PUT {API}/campaigns/{id}/narrative/initial-stance` | `{ "stance": "prudent"\|"balanced"\|"ambitious"\|"skipped" }` |
| `POST {API}/campaigns/{id}/events` (existant) | `EVT-PRO-003`, `trace: "initial_stance"`, `data: { "stance": … }` — champ `data` ajouté au contrat des événements |

Les portraits sont des pastilles d'initiales en attendant les illustrations (voir le manifeste d'assets).

## P08 — Profil scientifique, Acte I (`features/profile/`)
Premier écran en **shell de jeu** (topbar · rail d'étapes · zone centrale en repli 2D SVG · panneau droit · barre basse avec jauges et action principale fixe). Étapes : Briefing polaire → Débat → Objectifs → Instrument d'Elias → Confirmation (pas de saut vers l'avant).

- Règles : 1 objectif principal obligatoire (TC-004) ; 1–2 secondaires **ou** « aucun » coché explicitement ; décision sur le radar d'Elias (conserver / écarter / reporter) obligatoire, sans pénalité morale.
- Estimation (masse, énergie, données, coût) = aperçu pur `domain/profile.ts` (`estimate`), jamais un résultat officiel.
- Valeurs : masse/puissance des instruments LRO (LROC, LEND, Diviner, Mini-RF) **[S] à recouper** ; données et coût **illustratifs**, à équilibrer côté backend.
- **Hypothèse à valider** : l'instrument d'Elias est le radar (déduit de la crise de l'Acte V « Désactiver le radar »).

| Appel | Corps |
|---|---|
| `PUT {API}/campaigns/{id}/profile` | `{ primary_objective, secondary_objectives[], no_secondary_by_choice, elias_instrument: "keep"\|"drop"\|"defer", instruments[], confirmed_at }` |
| `POST {API}/campaigns/{id}/events` | `EVT-A1-002` (`elias_instrument`) puis `EVT-A1-001` (`scientific_profile`) |

Tests : `npm test` (Vitest, 6 tests du ViewModel).

## Actes II à VI — P09 à P22 (campagne jouable de bout en bout)

| Acte | Pages (routes) | ViewModel |
|---|---|---|
| II | P09 Atelier `/campagne/acte-2/atelier[?focus=…]` · P10 Prévalidation `/prevalidation` | `features/workshop/WorkshopViewModel` |
| III | P11 Revue `/campagne/acte-3/revue` · P12 Séquence `/lancement` | `features/launch/LaunchViewModel` |
| IV | P13 Contrôle · P14 Planificateur · P15 Bilan (`/campagne/acte-4/…`) | `features/ops/OpsViewModel` |
| V | P16 Alerte · P17 Diagnostic · P18 Arbitrage · P19 Résolution (`/campagne/acte-5/…`) | `features/crisis/CrisisViewModel` |
| VI | P20 Rapport · P21 Fin · P22 Écran final (`/campagne/acte-6/…`) | `features/ending/EndingViewModel` |

- **Base commune** `features/mission/MissionViewModel` : chargement, sauvegarde optimiste + `SaveIndicator`, événements best-effort, progression (`reached`).
- **Routeur à gardes (F-02)** : une page non atteinte redirige vers la dernière page valide avec un message. `/campagne/reprendre` reprend à l'écran sauvegardé (bouton « Continuer »).
- **Moteur pur** `domain/sim.ts` (bilans, validation, lancement, cycles, anomalie scénarisée au cycle 5, crise, fins, score /100) et `domain/orbit.ts` (Kepler, μ☾ = 4902,800066 km³/s², vecteur d'état). **Le backend reste l'autorité** : ce module doit être partagé avec lui (tests de parité).
- **Valeurs** : catalogue `domain/mission.ts` = paramètres de gameplay **illustratifs** (instruments : masse/puissance LRO). Calibration vérifiée par tests : les **quatre fins sont atteignables** (TC-025 à TC-028).
- **Scène 3D** `scene/` (Three.js, chargée à la demande) : Lune texturée, **modèle LRO de la NASA**, orbite réelle propagée, liaison Terre, variantes crise/fins ; réagit à la souris (parallaxe, orbiteur qui suit le pointeur, survol). Repli 2D automatique sans WebGL ou via Pause → Options.
- **Panneau GMAT** `ui/Gmat.tsx` : SMA, ECC, INC, RAAN, AOP, TA, altitude, VMAG, période, énergie, X/Y/Z/VX/VY/VZ, époque UTCGregorian, repère MoonMJ2000Eq, propagés en direct (1 s = 60 s).
- **Composants** `ui/kit.tsx` : `Gauge` (C-01), `SystemBadge`, `AlertBanner`, `ActionButton` (raison visible), `TrendChart` (prévision en pointillés), `RadarChart`, `Bars`, `ConfirmModal` (focus sur Annuler, double confirmation), `TradeoffTable`, `Consequence`, `KV`. `ui/Shell.tsx` : gabarit, pause, options (2D, transparence, contraste), glossaire, journal.

| Appel supposé (à aligner) | Usage |
|---|---|
| `GET/PUT {API}/campaigns/{id}/mission` | État complet de mission (remplacé à terme par les endpoints fins du plan §8) |
| `GET {API}/campaigns/{id}/profile` | Lecture du profil (Acte I) |
| `GET/POST {API}/reports` | Rapports figés et comparaison |
| `POST {API}/campaigns/{id}/events` | `EVT-A2-001…004`, `EVT-A3-001…003`, `EVT-A4-001…004`, `EVT-A5-001…005`, `EVT-A6-001…003` |

Tests : `npm test` (11 tests : simulation, Atelier, Crise, Profil). Parcours complet Acte II → écran final vérifié dans Chromium, 0 erreur console.

### Ressources NASA (voir `public/assets-manifest.json` et la page Crédits)
- `public/nasa/lro.glb` — *Lunar Reconnaissance Orbiter (A)*, NASA 3D Resources (glTF Draco).
- `public/nasa/moon-map.jpg` — **dérivée** de la photo *Moon* de NASA 3D Resources, reprojetée en équirectangulaire ; **la face cachée est un miroir**. À remplacer par la mosaïque LROC (NASA SVS « CGI Moon Kit ») : le réseau de l'environnement de développement bloquait svs.gsfc.nasa.gov.

## Mode connecté au backend (`space-mission-game`)

Avec `VITE_API_URL` défini (voir `.env.example`), **le serveur fait autorité** sur toutes les valeurs officielles ; sans lui, le jeu tourne en mode local (démo hors ligne).

| Page | Appels serveur |
|---|---|
| Session | `POST /api/identite/invites` (jeton invité de 30 jours, stocké localement, renouvelé sur 401) |
| P02 Nouvelle mission | `GET /api/campagne/scenarios` → `POST /api/conception/configurations` (niveau `expert` : 0 à 2 objectifs secondaires, comme le GDD) → `POST /api/campagne/missions` |
| P01 Continuer | `GET /api/campagne/missions/:id` |
| P08 Profil | `PATCH …/configurations/:id {type:"objectifs"}` |
| P09-P10 Atelier | `GET /api/catalogue/1.2.0` (catalogue du serveur, valeurs LRO) ; `PATCH … ajouter / retirer-element / instrument + associer-objectifs` ; jauges, erreurs et alertes = réponse du serveur |
| P11-P12 Lancement | `PATCH {type:"lancement"}` ; `POST …/actes` 1→3 (validation et gel), puis 4 en fin de séquence |
| P13-P15 Cycles | `POST …/simulation {commandes, jours:1}` : un cycle = un jour simulé par le serveur |
| P16-P19 Crise | crise ouverte par le serveur (anomalie du jour 5) ; `POST …/crise` (**une** décision), puis simulation jusqu'au terme |
| P20-P22 Rapport | `POST …/actes` 5→6 → bilan C5 sur **1000** (science, technique, ressources, fiabilité), fin A–D → Legacy / Fragment / Last Signal / Silence |

Ce qui reste local, faute d'équivalent serveur : posture initiale (P07), événements `EVT-…`, décision d'Elias, points de reprise et comparaison des rapports.

Limites assumées du mode connecté :
- pas de prévision avant exécution (P14) ni de « prévu contre calculé » (P19), car le serveur n'expose pas d'aperçu ;
- orbites fixes, car le catalogue n'a pas de paramètres réglables ;
- une seule décision par crise.

Parcours de bout en bout (Playwright, avec le serveur et `vite preview` sur le port 4173) : `node e2e/partie-connectee.cjs` et `node e2e/partie-locale.cjs`.

## P03 Rapports et P04 Options

- **`/rapports`** (`features/reports/`) : liste triable (date, score, fin), détail par catégorie avec radar, comparaison côte à côte de deux rapports **en pourcentage** (un rapport local sur 100 et un rapport serveur sur 1000 restent comparables). En mode connecté, les bilans des missions clôturées sur le serveur s'ajoutent à l'archive du navigateur.
- **`/options`** (`features/options/`, `domain/preferences.ts`) : affichage (3D ou 2D, qualité 3D, panneau GMAT), accessibilité (contraste, transparence, animations, taille de l'interface, aides de l'atelier), performance (30 ou 60 images/s), langue (français ; anglais non traduit), données (mode local ou connecté, nouvelle session invitée, effacement de la progression locale avec double confirmation). Application immédiate et « Rétablir par défaut ». L'audio est signalé comme absent plutôt que simulé.

## Atelier : inventaire et vue éclatée (lot 1)
- **Onglet Inventaire** (`features/workshop/Inventory.tsx`) : composants installés regroupés par sous-système, sous-totaux, totaux (serveur en mode connecté), tri par masse, coût ou puissance ; « Retirer » et ouverture de la fiche au catalogue. La fiabilité totale est le produit des fiabilités.
- **Vue éclatée 3D (scène 2.2)** (`scene/engine.ts`) : une pièce par composant, forme selon le rôle, couleur selon le sous-système, liens vers le corps. Cadrage fixe pour viser les pièces, tolérance de survol de 250 ms.
- **Lien dans les deux sens** : survoler une pièce affiche sa fiche flottante et surligne sa ligne ; survoler une ligne fait briller la pièce.
- Les aides de l'atelier n'ont plus qu'une source de vérité : la préférence `help` (page Options).

## Langue : français / anglais (US)
- Réglage : **Options → Langue et audio** (`fr` ou `English (US)`), appliqué tout de suite, sans perdre la partie, et mémorisé dans `tll.prefs`.
- `src/i18n/index.ts` : `t(fr)` (le texte français sert de clé), `tf(fr, {vars})` pour les phrases à variables, `tc(ctx, fr)` quand un même mot change de sens (`undo|Annuler` → *Undo*), `tmap({...})` pour les tables de libellés, `locale()` pour les nombres et dates.
- `src/i18n/en.ts` : dictionnaire FR → EN-US (~1 150 entrées). Une clé absente retombe sur le français : rien ne casse, mais le texte reste en français.
- Messages d'erreur du serveur : `data/backend/api.ts` (`MESSAGES` / `MESSAGES_EN`, choisis selon la langue).
- Outils : `node tools/i18n-extract.mjs src keys.json` (liste des textes) ; `node tools/i18n-scan.mjs` (textes français non passés à `t()`) ; `node tools/i18n-wrap2.mjs` (balisage automatique, à relire).
- Ajouter un texte : écrire `t("Texte français")` puis ajouter `"Texte français": "English text"` dans `en.ts`.
- Limites connues : le journal de l'atelier et les points de reprise gardent la langue où ils ont été écrits ; noms propres et sigles non traduits.
