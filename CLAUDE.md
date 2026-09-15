# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Aperçu du projet

Application web mono-fichier pour préparer un vol VFR (aéroclub) : plan de vol / log de nav, gestion du hangar (flotte d'avions), masse et centrage, carburant, NOTAM/METAR, carte interactive de construction de route, tableau de bord.

## Commandes

Pas de build, pas de package.json, pas de linter ni de suite de tests — `log-nav-vfr.html` s'exécute tel quel dans un navigateur.

- **Prévisualiser** : ouvrir le fichier directement dans un navigateur, ou le servir en local pour éviter les restrictions `file://` (CORS sur les appels réseau réels — AVWX, tuiles IGN) :
  ```
  python3 -m http.server 8000
  ```
  puis ouvrir `http://localhost:8000/log-nav-vfr.html`.
- **Vérifier la syntaxe JS** après une édition (aucun tooling dédié dans le repo) : extraire le contenu du tag `<script>` applicatif (celui qui suit le `<script src="...leaflet...">`) dans un fichier `.js` et lancer `node --check` dessus.
- **Tester une fonctionnalité** : il n'y a pas de suite de tests — vérifier manuellement dans un navigateur (via le serveur local ci-dessus) en interagissant réellement avec l'UI concernée.

## Structure du projet

Le projet tient (pour l'instant) dans un seul fichier : **`log-nav-vfr.html`** (2961 lignes). Il n'y a pas d'autre code applicatif — pas besoin d'aller chercher ailleurs.

- **Lignes 1–611** : `<head>` + `<style>` (tout le CSS — palette "cockpit" sombre, polices Titillium Web / IBM Plex Sans / IBM Plex Mono ; icônes via Phosphor Icons chargé en CDN, `<i class="ph-bold ph-...">`, jamais d'emoji comme icône)
- **Lignes 613–1005** : corps HTML (markup)
  - Barre latérale de navigation (`sidebar`, ~615–642) : logo, liste des onglets, boutons Hangar/Mes vols/Réinitialiser
  - Modale d'onboarding (~652–680)
  - Panneau Hangar (~681–717)
  - Panneau Vols enregistrés (~718–726)
  - `tabPanel0` — Tableau de bord (727–745)
  - `tabPanel1` — Préparation : terrains du vol, infos vol (747–838)
  - `tabPanel2` — Log de navigation : saisie des étapes/legs (840–873)
  - `tabPanel3` — Masse & centrage / carburant (875–921)
  - `tabPanel4` — NOTAM & METAR (923–965)
  - `tabPanel5` — Simulation de route : carte interactive (967–1001)
- **Lignes 1007–2959** : `<script src="leaflet">` puis `<script>` (tout le JavaScript applicatif, pas de fichiers séparés)

## Sections du JavaScript (avec ancre de ligne)

- `newLeg`, `addLeg`, `removeLeg`, `renderLegsInputs` (1012–1068) — gestion des étapes du vol
- Helpers math/format : `toRad`, `toDeg`, `norm360`, `computeWind`, `fmtHM`, `fmtMin`, `fmtNum`, `eobtToMinutes` (1069–1114) — `greatCircle` (1771) réutilise `toRad`/`toDeg`, pas de doublon
- `recompute()` / `renderOutput()` (1115–1230) — moteur de calcul principal du log de nav ; alimente `lastNavTotals` (global) et déclenche `renderDashboard()` si l'onglet 0 est visible
- Recherche terrain : `stripAccents`, `norm`, `searchAirports`, `vacLinks`, `findAirport` (1249–1770) — inclut la base `AIRPORTS` (~456 terrains, source Wikipédia/SIA) et `COORDS` (coordonnées GPS, source OurAirports)
- `greatCircle`, `updateRouteNote`, `updateNotamNote`, `collectRouteAirportCodes` (1771–1878) — géo, note de route directe, codes à saisir dans SOFIA Briefing (récupération NOTAM auto impossible : CORS + formulaire derrière compte, cf. commentaire in situ)
- **Carte interactive de route** (1879–2130) : fond OACI-VFR / Plan IGN (tuiles WMTS IGN, clé publique `ign_scan_ws`, pas de compte requis) ; `initPrepMap`, `setBaseLayer`, `findNearestAirportOnScreen`, `fitPrepMap` ; points de route cliquables avec bulle d'édition (nom/altitude/observations) : `addRoutePoint`, `removeRoutePoint`, `moveRoutePoint`, `renderRouteMarkers`, `renderRoutePointsList`, `airportInfoHtml` ; export vers le Log de navigation via `btnExportRoute` (pas de contournement automatique de zones — retiré, l'utilisateur trace lui-même sa route)
- **METAR** (2131–2245) : `updateMetarNote`, `fetchAvwxMetar`/`searchNearbyMetar` (API AVWX REST, clé perso, cherche aussi la station la plus proche par coordonnées si le terrain n'a pas son propre METAR)
- `updateAdNote`, `wireTerrainField` (2246–2398) — alertes AD, autocomplete terrain (onglet Préparation)
- **Stockage persistant** (2399–2618) : `storageGetSafe` / `storageSetSafe` passent par `window.storage.get/set(key, shared)`.
  - `shared:true` → Hangar (flotte commune à tous les utilisateurs de l'appli)
  - `shared:false` → profil pilote + vols enregistrés (personnels)
  - `renderHangar`, `loadHangar`, `gatherFormState`, `applyFormState`, `renderSavedLogs`, `loadSavedLogsFromStorage`
- **Onglets** (2619–2640) : `switchTab` (0 à 5, navigation par barre latérale, pas de menu déroulant)
- **Tableau de bord** (2641–2768) : `renderDashboard`, `fuelGaugeSvg` (jauge carburant SVG), `wbEnvelopeSvg` (enveloppe masse/centrage réelle, pas illustrative) — relit `lastNavTotals`/`lastWbStatus`/`lastFuelPlan` (globaux alimentés par `recompute`/`computeWB`/`computeFuelPlan`), ne recalcule jamais rien lui-même ; `updateTabValidation`
- **Masse & centrage / carburant** (2769–2915) : `populateWbAircraftSelect`, `populateFlightAircraftSelect`, `computeWB`, `computeFuelPlan` — `computeWB` est déclenché par les champs de l'onglet 3 ET par `f_fuel` (onglet 1, "Carburant emporté"), qui l'alimente par défaut
- `initOnboarding` (2916–2959) — le bouton "Commencer" préremplit aussi le terrain de départ (`t_dep`) si un "terrain de rattachement" a été saisi

## Services externes utilisés

- **IGN Géoplateforme (WMTS)** : fond de carte OACI-VFR (`GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-OACI`) et Plan IGN détaillé (`GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR`), clé publique `ign_scan_ws` (pas de compte requis, usage libre documenté par l'IGN).
- **AVWX REST API** (`avwx.rest`) : recherche METAR, clé personnelle en dur dans le code.
- **aviationweather.gov** : lien direct METAR officiel (pas de compte).
- **SOFIA Briefing** (NOTAM) : pas d'API — le site bloque le cross-origin (CORS) et son formulaire est derrière un compte. L'appli se contente de préparer les codes terrain à copier-coller ; aucune tentative de contournement automatique n'a fonctionné (testé et documenté dans le code).
- ~~OpenAIP (analyse des zones réglementées)~~ : intégré puis entièrement retiré à la demande de l'utilisateur ("je n'aime pas la partie zone sur la route").

## Notes pour Claude Code

- Un seul fichier à lire/éditer : privilégier `Read log-nav-vfr.html` avec `offset`/`limit` ciblés sur la section concernée plutôt que relire tout le fichier. Les tableaux `AIRPORTS` et `COORDS` (lignes 1237–1770) sont chacun sur une seule ligne très longue — éviter de les lire en entier, chercher par grep sur le code OACI voulu.
- `window.storage` est une API fournie par l'environnement d'exécution de l'appli (pas définie dans ce fichier) — ne pas chercher son implémentation ici.
- Le skill `graphify` est installé (`.claude/skills/graphify/`) mais n'apporte rien tant que le projet tient en un seul fichier (le graphe généré est vide, faute de relations inter-fichiers). Il redeviendra utile si le JS est un jour éclaté en plusieurs fichiers.
- Ce fichier doit rester synchronisé avec `~/Desktop/log-nav-vfr.html`, qui est la copie de travail réelle utilisée en session — vérifier laquelle est la plus à jour avant de modifier l'une ou l'autre (comparer avec `diff` ou le nombre de lignes).
- Jamais d'emoji comme icône (nav, boutons, alertes) : utiliser Phosphor Icons (`<i class="ph-bold ph-...">`, déjà chargé en CDN dans le `<head>`).
