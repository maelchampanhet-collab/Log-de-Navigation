# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Aperçu du projet

Application web mono-fichier pour préparer un vol VFR (aéroclub) : plan de vol / log de nav, gestion du hangar (flotte d'avions), masse et centrage, carburant, NOTAM/METAR, carte interactive de construction de route, tableau de bord.

## Modules fonctionnels — état d'avancement

Sept modules composent l'appli, un par onglet, tous **développés et fonctionnels** :

| # | Module | Onglet | État |
|---|--------|--------|------|
| 1 | Préparation (terrains, autocomplete OACI, liens carte VAC) | `tabPanel1` | OK |
| 2 | Log de navigation (étapes, vent, cap vrai/magnétique, temps, carburant) | `tabPanel2` | OK |
| 3 | Masse et centrage (enveloppe réelle par avion, limite avant interpolée) | `tabPanel3` | OK |
| 4 | Bilan carburant réglementaire (Part-NCO OP.125) | `tabPanel3` | OK |
| 5 | NOTAM & METAR | `tabPanel4` | OK (METAR auto via AVWX ; NOTAM en copier-coller, cf. ci-dessous) |
| 6 | Simulation de route (carte OACI-VFR interactive, points éditables, export vers le log) | `tabPanel5` | OK |
| 7 | Tableau de bord (jauge carburant SVG, enveloppe masse/centrage, synthèse route) | `tabPanel0` | OK |

Fonctions transverses (hors onglets) également en place : hangar partagé, vols enregistrés (personnels), onboarding, impression/PDF, **appli mobile installable (PWA)** avec mise en page téléphone dédiée.

**Reste à faire / limites connues :**
- **Point de non-retour (PNR)** : demandé, pas encore implémenté. Spécification retenue : carburant embarqué moins réserve finale intouchable (30 min VFR jour / 45 min VFR nuit, sélecteur à ajouter), vitesse sol aller et vitesse sol retour recalculée avec le vent inversé ; affichage en marqueur sur la carte **et** en ligne du tableau du log de nav, avec heure et position estimées.
- **`AD_NOTES` très partiel** : seuls 5 terrains (LFLQ, LFNA, LFLU, LFMV, LFHD) ont des données vérifiées à la main sur ~456 dans `AIRPORTS`. À étendre au cas par cas, uniquement avec des sources vérifiées (voir conventions).
- **NOTAM automatiques : impossible**, pas un "à faire" — SOFIA Briefing bloque le cross-origin (CORS) et son formulaire est derrière un compte. Testé, documenté dans le code, on reste sur la saisie manuelle.

## Commandes

Pas de build, pas de package.json, pas de linter ni de suite de tests — `log-nav-vfr.html` s'exécute tel quel dans un navigateur.

- **Prévisualiser** : ouvrir le fichier directement dans un navigateur, ou le servir en local pour éviter les restrictions `file://` (CORS sur les appels réseau réels — AVWX, tuiles IGN) :
  ```
  python3 -m http.server 8000
  ```
  puis ouvrir `http://localhost:8000/log-nav-vfr.html`. Le service worker (PWA) ne s'active qu'en http(s), jamais en `file://`.
- **Tester la version mobile** : skill projet `mobile-encoche` (`.claude/skills/mobile-encoche/`) — règles de mise en page téléphone et script `test-encoche.js` qui simule l'encoche / Dynamic Island / barre de geste (iPhone portrait et paysage) et signale les éléments mal placés. À lancer après toute modification visible sur mobile.
- **Vérifier la syntaxe JS** après une édition (aucun tooling dédié dans le repo) : extraire le contenu du tag `<script>` applicatif (celui qui suit le `<script src="...leaflet...">`) dans un fichier `.js` et lancer `node --check` dessus.
- **Tester une fonctionnalité** : il n'y a pas de suite de tests — vérifier manuellement dans un navigateur (via le serveur local ci-dessus) en interagissant réellement avec l'UI concernée.

## Structure du projet

L'appli tient dans un seul fichier : **`log-nav-vfr.html`** (3108 lignes). Autour, uniquement les fichiers de l'appli installable (PWA) :

- `manifest.webmanifest` — nom, icônes, couleurs, `display: standalone`, `start_url` = `log-nav-vfr.html`
- `sw.js` — service worker : appli en réseau d'abord (mises à jour), CDN (Leaflet, Phosphor, polices) en cache, tuiles IGN déjà vues en cache (1500 max) pour la carte hors ligne ; **AVWX / aviationweather jamais mis en cache** (pas de météo périmée). Changer `VERSION` à chaque mise à jour du HTML.
- `icons/` — `icon.svg` (source, reprend le logo boussole de la barre latérale) et PNG 180 (iOS), 192, 512 (Android, aussi en `maskable`)

L'installation exige un hébergement HTTPS (ex. GitHub Pages) : sur iPhone Safari → Partager → « Sur l'écran d'accueil » ; sur Android Chrome → « Installer l'application ».

(`coords-terrains-france.json` est l'archive de la source des coordonnées GPS — données déjà intégrées dans l'objet `COORDS` du HTML, l'appli ne lit jamais ce fichier.)

- **Lignes 1–722** : `<head>` (méta PWA/iOS, manifest, apple-touch-icon) + `<style>` (tout le CSS — palette "cockpit" sombre, polices Titillium Web / IBM Plex Sans / IBM Plex Mono ; icônes via Phosphor Icons chargé en CDN, `<i class="ph-bold ph-...">`, jamais d'emoji comme icône). Le bloc `@media (max-width:760px), (max-height:500px) and (pointer:coarse)` en fin de `<style>` est la **version téléphone** (portrait et paysage) : barre latérale transformée en barre d'onglets fixée en bas (libellés courts `.lbl-short`), barre d'appli collante en haut (`.appbar-title` + boutons icônes `.mobile-only`), champs à 16 px (sinon zoom iOS), cibles tactiles ≥ 40 px, table de nav avec colonne « Étape » figée, carte plein écran, zones d'encoche via les variables `--sat/--sar/--sab/--sal` (jamais `env()` directement, cf. skill `mobile-encoche`), barre du haut qui s'efface au défilement.
- **Lignes 724–1121** : corps HTML (markup)
  - Barre latérale de navigation (`sidebar`, ~728–753) : logo, liste des onglets (chaque `navitem` porte `data-title`, titre affiché dans la barre d'appli mobile), boutons Hangar/Mes vols/Réinitialiser
  - Barre `main-top` (~756–765) : Enregistrer / Imprimer ; sur mobile s'y ajoutent le titre d'onglet et des boutons `data-proxy="btnXxx"` qui cliquent les boutons de la barre latérale (masquée)
  - Modale d'onboarding (~768–796)
  - Panneau Hangar (~797–833)
  - Panneau Vols enregistrés (~834–842)
  - `tabPanel0` — Tableau de bord (843–861)
  - `tabPanel1` — Préparation : terrains du vol, infos vol (863–954)
  - `tabPanel2` — Log de navigation : saisie des étapes/legs (956–989)
  - `tabPanel3` — Masse & centrage / carburant (991–1037)
  - `tabPanel4` — NOTAM & METAR (1039–1081)
  - `tabPanel5` — Simulation de route : carte interactive (1083–1117)
- **Lignes 1123–3106** : `<script src="leaflet">` puis `<script>` (tout le JavaScript applicatif, pas de fichiers séparés)

## Sections du JavaScript (avec ancre de ligne)

- `newLeg`, `addLeg`, `removeLeg`, `renderLegsInputs` (1128–1184) — gestion des étapes du vol
- Helpers math/format : `toRad`, `toDeg`, `norm360`, `computeWind`, `fmtHM`, `fmtMin`, `fmtNum`, `eobtToMinutes` (1185–1230) — `greatCircle` (1887) réutilise `toRad`/`toDeg`, pas de doublon
- `recompute()` / `renderOutput()` (1231–1346) — moteur de calcul principal du log de nav ; alimente `lastNavTotals` (global) et déclenche `renderDashboard()` si l'onglet 0 est visible
- Recherche terrain : `stripAccents`, `norm`, `searchAirports`, `vacLinks`, `findAirport` (1365–1886) — inclut la base `AIRPORTS` (~456 terrains, source Wikipédia/SIA) et `COORDS` (coordonnées GPS, source OurAirports)
- `greatCircle`, `updateRouteNote`, `updateNotamNote`, `collectRouteAirportCodes` (1887–1994) — géo, note de route directe, codes à saisir dans SOFIA Briefing (récupération NOTAM auto impossible : CORS + formulaire derrière compte, cf. commentaire in situ)
- **Carte interactive de route** (1995–2246) : fond OACI-VFR / Plan IGN (tuiles WMTS IGN, clé publique `ign_scan_ws`, pas de compte requis) ; `initPrepMap`, `setBaseLayer`, `findNearestAirportOnScreen`, `fitPrepMap` ; points de route cliquables avec bulle d'édition (nom/altitude/observations) : `addRoutePoint`, `removeRoutePoint`, `moveRoutePoint`, `renderRouteMarkers`, `renderRoutePointsList`, `airportInfoHtml` ; export vers le Log de navigation via `btnExportRoute` (pas de contournement automatique de zones — retiré, l'utilisateur trace lui-même sa route)
- **METAR** (2247–2361) : `updateMetarNote`, `fetchAvwxMetar`/`searchNearbyMetar` (API AVWX REST, clé perso, cherche aussi la station la plus proche par coordonnées si le terrain n'a pas son propre METAR)
- `updateAdNote`, `wireTerrainField` (2362–2514) — alertes AD, autocomplete terrain (onglet Préparation)
- **Stockage persistant** (2515–2758) : `storageGetSafe` / `storageSetSafe` passent par `window.storage.get/set(key, shared)`. Si `window.storage` n'existe pas (`HAS_WINDOW_STORAGE` faux : appli installée, navigateur), repli sur `localStorage` avec des clés `logvfr:shared:*` / `logvfr:perso:*` — tout est alors local à l'appareil, hangar compris (le libellé du hangar passe à « enregistré sur cet appareil »).
  - `shared:true` → Hangar (flotte commune à tous les utilisateurs de l'appli)
  - `shared:false` → profil pilote + vols enregistrés (personnels)
  - `renderHangar`, `loadHangar`, `gatherFormState`, `applyFormState`, `renderSavedLogs`, `loadSavedLogsFromStorage`
- **Onglets** (2759–2782) : `switchTab` (0 à 5, navigation par barre latérale — barre d'onglets du bas sur mobile —, pas de menu déroulant ; met aussi à jour `appbarTitle` et remonte en haut de page)
- **Tableau de bord** (2783–2910) : `renderDashboard`, `fuelGaugeSvg` (jauge carburant SVG), `wbEnvelopeSvg` (enveloppe masse/centrage réelle, pas illustrative) — relit `lastNavTotals`/`lastWbStatus`/`lastFuelPlan` (globaux alimentés par `recompute`/`computeWB`/`computeFuelPlan`), ne recalcule jamais rien lui-même ; `updateTabValidation`
- **Masse & centrage / carburant** (2911–3057) : `populateWbAircraftSelect`, `populateFlightAircraftSelect`, `computeWB`, `computeFuelPlan` — `computeWB` est déclenché par les champs de l'onglet 3 ET par `f_fuel` (onglet 1, "Carburant emporté"), qui l'alimente par défaut
- `initOnboarding` (3058–3100) — le bouton "Commencer" préremplit aussi le terrain de départ (`t_dep`) si un "terrain de rattachement" a été saisi
- Enregistrement du service worker `sw.js` (3102–3105), seulement en http(s)

## Services externes utilisés

- **IGN Géoplateforme (WMTS)** : fond de carte OACI-VFR (`GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-OACI`) et Plan IGN détaillé (`GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR`), clé publique `ign_scan_ws` (pas de compte requis, usage libre documenté par l'IGN).
- **AVWX REST API** (`avwx.rest`) : recherche METAR, clé personnelle en dur dans le code.
- **aviationweather.gov** : lien direct METAR officiel (pas de compte).
- **SOFIA Briefing** (NOTAM) : pas d'API — le site bloque le cross-origin (CORS) et son formulaire est derrière un compte. L'appli se contente de préparer les codes terrain à copier-coller ; aucune tentative de contournement automatique n'a fonctionné (testé et documenté dans le code).
- ~~OpenAIP (analyse des zones réglementées)~~ : intégré puis entièrement retiré à la demande de l'utilisateur ("je n'aime pas la partie zone sur la route").

## Conventions de code

- **Vanilla JS, pas de framework, pas de build** : fonctions déclarées au niveau global dans un unique `<script>`, pas de modules ES, pas de classes. Seules dépendances externes : Leaflet et Phosphor Icons, chargés en CDN.
- **État en variables globales de module** : `legs`/`legId`, `routePoints`, `fleet`, `savedLogs`, plus trois caches de résultats (`lastNavTotals`, `lastWbStatus`, `lastFuelPlan`) alimentés respectivement par `recompute()`, `computeWB()` et `computeFuelPlan()`.
- **Un seul sens de calcul** : les modules de calcul écrivent dans ces globales ; le tableau de bord (`renderDashboard`) ne fait que les relire. Ne jamais recalculer une valeur dans l'affichage, sinon les onglets divergent.
- **Rendu par template strings + `innerHTML`**, puis re-câblage des écouteurs via `querySelectorAll(...).forEach(addEventListener)` après chaque rendu (pas de délégation d'événements). Si tu régénères un bloc, re-câble ses boutons.
- **Nommage des `id` par préfixe** : `t_` terrains, `f_` infos vol, `hg_` hangar, `wb_` masse et centrage, `fuel_` bilan carburant, `ob_` onboarding, `btn` boutons, `ac_`/`hint_`/`links_` autocomplete terrain.
- **CSS** : variables `--navy-*`, `--amber`, `--cyan`, `--ink*`, `--rule*`, `--alert`, `--grass` définies dans `:root`. Pas de framework CSS. Valeurs numériques toujours en `IBM Plex Mono`.
- **Icônes** : Phosphor uniquement (`<i class="ph-bold ph-...">`). Jamais d'emoji comme icône.
- **Langue** : interface, commentaires et messages en français.
- **Indentation** : 2 espaces.
- **Données aéronautiques : jamais inventées.** Fréquences, altitudes terrain et particularités ne sont affichées que si elles sont dans `AD_NOTES`, renseignées à la main depuis une source vérifiée (carte VAC officielle, AIP, Légifrance) et datées dans le champ `special` quand la fraîcheur est incertaine. Sinon on affiche explicitement "non vérifiées ici — voir la carte VAC". Cette règle prime sur toute volonté de "compléter" l'affichage.
- **L'appli est une aide à la préparation, pas une source certifiée** : les avertissements en ce sens dans l'UI (footnote du tableau, mentions carte VAC/NOTAM) font partie du produit, ne pas les retirer.

## Notes pour Claude Code

- Un seul fichier à lire/éditer : privilégier `Read log-nav-vfr.html` avec `offset`/`limit` ciblés sur la section concernée plutôt que relire tout le fichier. Les tableaux `AIRPORTS` et `COORDS` (lignes 1353–1886) sont chacun sur une seule ligne très longue — éviter de les lire en entier, chercher par grep sur le code OACI voulu.
- `window.storage` est une API fournie par l'environnement d'exécution de l'appli (pas définie dans ce fichier) — ne pas chercher son implémentation ici.
- Le skill `graphify` est installé (`.claude/skills/graphify/`) mais n'apporte rien tant que le projet tient en un seul fichier (le graphe généré est vide, faute de relations inter-fichiers). Il redeviendra utile si le JS est un jour éclaté en plusieurs fichiers.
- **Ce dépôt est la seule copie du projet.** Il a existé un temps un doublon dans `~/Desktop/` qui prenait silencieusement du retard ; il a été supprimé. Ne pas recréer de copie de travail ailleurs : éditer `log-nav-vfr.html` directement ici.
- Jamais d'emoji comme icône (nav, boutons, alertes) : utiliser Phosphor Icons (`<i class="ph-bold ph-...">`, déjà chargé en CDN dans le `<head>`).
