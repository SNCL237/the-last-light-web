# THE LAST LIGHT — Brief d'illustration des portraits

*Version 1.0 · 15 novembre 2026. Les attributs physiques précis (âge, traits, tenue détaillée) ne sont pas définis dans les documents sources : ils sont laissés à l'illustrateur ou à valider par l'équipe. Ce brief fixe la fonction, le ton, les expressions et le cadre technique.*

## 1. Règles communes

| Sujet | Directive |
|---|---|
| **Personnages fictifs** | Aucune ressemblance avec une personne réelle ; pas de portrait de célébrité, d'astronaute ou d'employé d'agence |
| **Emblèmes** | Pas de logo NASA ni d'insigne d'agence réel. Utiliser un **écusson fictif** du programme international lunaire (à concevoir) |
| **Style** | Semi-réaliste légèrement stylisé, cohérent avec la DA : fond sombre, ambiance froide, un seul accent orange discret (liseré ou détail de tenue) |
| **Éclairage** | Lumière principale douce et froide, contre-jour bleuté léger, reflets d'écran possibles ; pas de contraste agressif |
| **Cadrage** | Buste, trois-quarts, regard lisible, marge au-dessus et sur un côté pour les panneaux du HUD |
| **Fond** | Transparent (PNG/WebP avec alpha) ; un fond neutre sombre de secours |
| **Diversité** | Équipe crédible et variée, sans stéréotype ; les origines suggérées par les noms ne sont pas imposées |
| **Cohérence** | Même échelle de tête, même éclairage et même rendu pour les quatre membres de l'équipe |
| **Texte** | Aucun texte intégré à l'image |
| **Ton** | Dramatique, humain, crédible ; éviter le mélodrame et les poses héroïques |

## 2. Jeu d'expressions requis (chaque membre de l'équipe)

Pour tenir les dialogues sans multiplier les assets, **5 expressions** par personnage :

| Code | Expression | Usage |
|---|---|---|
| `NEUTRAL` | Neutre, attentif | Par défaut |
| `FOCUS` | Concentré, analytique | Débats techniques, diagnostic |
| `CONCERN` | Préoccupé | Alertes, crise |
| `RESOLVE` | Déterminé | Arbitrage, décision |
| `RELIEF` | Soulagé ou apaisé (mesuré) | Résolution, fins positives |

*Option P2 : `HESITATE` (hésitation) pour Maya, `CHALLENGE` (défi) pour Noah.*

## 3. Fiches par personnage

### Dr. Maya Moreau — ingénieure système
- **Fonction dramatique :** centre émotionnel ; fille d'Elias ; partagée entre réussite et héritage familial.
- **Voix :** précise, retenue.
- **Attitude à rendre :** contrôle de soi, attention aux détails ; émotion contenue, visible dans le regard plutôt que dans les gestes.
- **Détail suggéré :** tenue de travail sobre ; un objet discret évoquant l'héritage (carnet, stylet), sans symbole explicite.
- **Expressions clés :** `NEUTRAL`, `FOCUS`, `CONCERN`, `RESOLVE` ; `HESITATE` utile pour la décision de l'instrument d'Elias.
- **Usages :** P07, P08, P18, P19, fins.

### Daniel Hayes — directeur de mission
- **Fonction dramatique :** ancien responsable des opérations de LUNAR-01 ; assume ou défend les compromis passés.
- **Voix :** pragmatique, mesurée.
- **Attitude à rendre :** posture stable, regard direct, calme sous pression ; ni autoritaire ni coupable.
- **Détail suggéré :** tenue de direction de mission, sobre, avec l'écusson fictif.
- **Règle narrative :** ne jamais le montrer comme un antagoniste ; l'expression `CONCERN` doit rester ambiguë.
- **Usages :** P07, P11, P18, fins.

### Dr. Noah Williams — responsable scientifique
- **Fonction dramatique :** curieux, ambitieux ; défend la valeur des observations.
- **Voix :** engagée, enthousiaste.
- **Attitude à rendre :** énergie, regard vif, gestes plus ouverts que ses collègues.
- **Détail suggéré :** tenue de laboratoire ou de terrain, éventuellement une tablette de données.
- **Expressions clés :** `NEUTRAL`, `FOCUS`, `RESOLVE` ; `CHALLENGE` en option.
- **Règle narrative :** ne pas le présenter comme systématiquement dans le vrai.
- **Usages :** P07, P08, P14, P18, fins.

### Amara Okafor — opérations de vol et communications
- **Fonction dramatique :** rappelle la valeur des systèmes et des données transmises.
- **Voix :** directe, prudente.
- **Attitude à rendre :** vigilance, sérieux calme, attention portée aux écrans.
- **Détail suggéré :** casque-micro léger ou oreillette, reflets d'écrans de télémétrie.
- **Règle narrative :** même statut dramatique que les autres ; pas de rôle secondaire visuel.
- **Usages :** P07, P11, P13, P17, P18, fins.

### Prof. Elias Moreau — archive (scientifique décédé)
- **Fonction dramatique :** présence d'archive ; voix sobre, analytique, inquiète des marges de sécurité.
- **Traitement :** **jamais en direct** ; il n'apparaît qu'en archive (photographie, image vidéo, enregistrement).
- **Versions à produire :**
  1. `ARCHIVE_FRAGMENT` : image dégradée, incomplète (prologue, A2) ;
  2. `ARCHIVE_CLEAR` : version plus nette (message inachevé, A3) ;
  3. `ARCHIVE_FULL` : version la plus complète (message final, A5, selon conditions).
- **Effets d'archive :** grain, bruit de capteur, découpes, perte de signal ; effets **désactivables** dans les options.
- **Lien visuel avec Maya :** une ressemblance subtile est possible, sans caricature.
- **Règle narrative :** ne pas absoudre automatiquement Elias ni accuser Daniel ; le portrait ne doit pas suggérer un verdict.
- **Usages :** P06, T04, P19.

## 4. Spécifications techniques

| Élément | Valeur proposée *(à valider avec la direction technique)* |
|---|---|
| Format | WebP (avec alpha) ; PNG pour les sources |
| Taille source | 1024 × 1280 px (portrait 4:5) |
| Taille mobile | 512 × 640 px |
| Poids cible | Quelques dizaines de ko par expression en WebP (à mesurer) |
| Nommage | `TLL_CHAR_[PERSONNAGE]_[EXPRESSION]_V01` (ex. `TLL_CHAR_MAYA_FOCUS_V01`) |
| Livraison | Un dossier par personnage + fichier source éditable |
| Suivi | Une entrée par personnage dans `assets-manifest.json` (statut, crédit, licence) |

## 5. Modèle de description pour un illustrateur ou un outil de génération

> Portrait semi-réaliste en buste, trois-quarts, de **[personnage]**, **[fonction]**, expression **[code]**. Éclairage froid doux avec léger contre-jour bleuté, ambiance de centre de contrôle de mission lunaire en 2042, fond transparent. Tenue sobre avec un écusson fictif de programme international (sans logo d'agence réel). Style cohérent avec une interface de science-fiction sombre : couleurs désaturées, un seul accent orange discret. Aucun texte dans l'image. Aucune ressemblance avec une personne réelle.

## 6. Si les illustrations sont générées par IA

- Vérifier le **règlement du hackathon** et les conditions d'utilisation de l'outil (usage, droits sur le résultat).
- **Mentionner** l'usage d'outils génératifs dans les crédits.
- Interdire les prompts qui visent une personne réelle ou un style d'artiste identifiable.
- Garantir la **cohérence** entre expressions (même personnage, même éclairage) : produire une planche de référence validée avant la série complète.
- Contrôler chaque image : mains, texte parasite, symboles ou logos involontaires.

## 7. Validation

- [ ] Planche de référence des quatre membres validée (échelle, éclairage, style).
- [ ] Les 5 expressions de chaque membre produites.
- [ ] Trois versions d'Elias produites.
- [ ] Aucun logo ou symbole d'agence réel visible.
- [ ] Lisible sous les panneaux de verre en 1280 × 720 et sur mobile.
- [ ] Entrées du manifeste d'assets mises à jour (statut, crédit, licence).
