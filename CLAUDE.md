# Log de navigation VFR

Application web mono-fichier pour préparer un vol VFR (aéroclub) : plan de vol / log de nav, gestion du hangar (flotte d'avions), masse et centrage, carburant, NOTAM/METAR, carte interactive de construction de route, tableau de bord.

## Structure du projet

Le projet tient (pour l'instant) dans un seul fichier : **`log-nav-vfr.html`** (3068 lignes). Il n'y a pas d'autre code applicatif — pas besoin d'aller chercher ailleurs.

- **Lignes 1–721** : `<head>` + `<style>` (tout le CSS — palette "cockpit" sombre, polices Titillium Web / IBM Plex Sans / IBM Plex Mono)
- **Lignes 723–1116** : corps HTML (markup)
  - Barre latérale de navigation (`sidebar`, ~727–760) : logo, liste des onglets, boutons Hangar/Mes vols/Réinitialiser
  - Modale d'onboarding (~762–790)
  - Panneau Hangar (~791–827)
  - Panneau Vols enregistrés (~828–836)
  - `tabPanel0` — Tableau de bord (~837–856)
  - `tabPanel1` — Préparation : terrains du vol, infos vol (~857–949)
  - `tabPanel2` — Log de navigation : saisie des étapes/legs (~950–984)
  - `tabPanel3` — Masse & centrage / carburant (~985–1032)
  - `tabPanel4` — NOTAM & METAR (~1033–1076)
  - `tabPanel5` — Simulation de route : carte interactive (~1077–1116)
- **Lignes 1117–3068** : `<script src="leaflet">` puis `<script>` (tout le JavaScript applicatif, pas de fichiers séparés)

## Sections du JavaScript (avec ancre de ligne)

- `newLeg`, `addLeg`, `removeLeg`, `renderLegsInputs` (1122–1178) — gestion des étapes du vol
- Helpers math/format : `toRad`, `toDeg`, `norm360`, `computeWind`, `fmtHM`, `fmtMin`, `fmtNum`, `eobtToMinutes` (1179–1224)
- `recompute()` / `renderOutput()` (1225–1341) — moteur de calcul principal du log de nav ; alimente `lastNavTotals` (global) et déclenche `renderDashboard()` si l'onglet 0 est visible
- Recherche terrain : `stripAccents`, `norm`, `searchAirports`, `vacLinks`, `findAirport` (1359–1880) — inclut la base `AIRPORTS` (~456 terrains, source Wikipédia/SIA) et `COORDS` (coordonnées GPS, source OurAirports)
- `greatCircle`, `updateRouteNote`, `updateNotamNote`, `collectRouteAirportCodes` (1881–1996) — géo, note de route directe, codes à saisir dans SOFIA Briefing (récupération NOTAM auto impossible : CORS + formulaire derrière compte, cf. commentaire in situ)
- **Carte interactive de route** (1997–2243) : fond OACI-VFR / Plan IGN (tuiles WMTS IGN, clé publique `ign_scan_ws`, pas de compte requis) ; `initPrepMap`, `setBaseLayer`, `findNearestAirportOnScreen`, `fitPrepMap` ; points de route cliquables avec bulle d'édition (nom/altitude/observations) : `addRoutePoint`, `removeRoutePoint`, `moveRoutePoint`, `renderRouteMarkers`, `renderRoutePointsList`, `airportInfoHtml` ; export vers le Log de navigation via `btnExportRoute` (pas de contournement automatique de zones — retiré, l'utilisateur trace lui-même sa route)
- **METAR** (2244–2358) : `updateMetarNote`, `fetchAvwxMetar`/`searchNearbyMetar` (API AVWX REST, clé perso, cherche aussi la station la plus proche par coordonnées si le terrain n'a pas son propre METAR)
- `updateAdNote`, `wireTerrainField` (2359–2511) — alertes AD, autocomplete terrain (onglet Préparation)
- **Stockage persistant** (2512–2731) : `storageGetSafe` / `storageSetSafe` passent par `window.storage.get/set(key, shared)`.
  - `shared:true` → Hangar (flotte commune à tous les utilisateurs de l'appli)
  - `shared:false` → profil pilote + vols enregistrés (personnels)
  - `renderHangar`, `loadHangar`, `gatherFormState`, `applyFormState`, `renderSavedLogs`, `loadSavedLogsFromStorage`
- **Onglets** (2732–2753) : `switchTab` (0 à 5, navigation par barre latérale, pas de menu déroulant)
- **Tableau de bord** (2754–2881) : `renderDashboard`, `fuelGaugeSvg` (jauge carburant SVG), `wbEnvelopeSvg` (enveloppe masse/centrage réelle, pas illustrative) — relit `lastNavTotals`/`lastWbStatus`/`lastFuelPlan` (globaux alimentés par `recompute`/`computeWB`/`computeFuelPlan`), ne recalcule jamais rien lui-même ; `updateTabValidation`
- **Masse & centrage / carburant** (2882–3025) : `populateWbAircraftSelect`, `populateFlightAircraftSelect`, `computeWB`, `computeFuelPlan`
- `initOnboarding` (3026–3068)

## Services externes utilisés

- **IGN Géoplateforme (WMTS)** : fond de carte OACI-VFR (`GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-OACI`) et Plan IGN détaillé (`GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR`), clé publique `ign_scan_ws` (pas de compte requis, usage libre documenté par l'IGN).
- **AVWX REST API** (`avwx.rest`) : recherche METAR, clé personnelle en dur dans le code.
- **aviationweather.gov** : lien direct METAR officiel (pas de compte).
- **SOFIA Briefing** (NOTAM) : pas d'API — le site bloque le cross-origin (CORS) et son formulaire est derrière un compte. L'appli se contente de préparer les codes terrain à copier-coller ; aucune tentative de contournement automatique n'a fonctionné (testé et documenté dans le code).
- ~~OpenAIP (analyse des zones réglementées)~~ : intégré puis entièrement retiré à la demande de l'utilisateur ("je n'aime pas la partie zone sur la route").

## Notes pour Claude Code

- Un seul fichier à lire/éditer : privilégier `Read log-nav-vfr.html` avec `offset`/`limit` ciblés sur la section concernée plutôt que relire tout le fichier.
- `window.storage` est une API fournie par l'environnement d'exécution de l'appli (pas définie dans ce fichier) — ne pas chercher son implémentation ici.
- Le skill `graphify` est installé (`.claude/skills/graphify/`) mais n'apporte rien tant que le projet tient en un seul fichier (le graphe généré est vide, faute de relations inter-fichiers). Il redeviendra utile si le JS est un jour éclaté en plusieurs fichiers.
- Ce fichier doit rester synchronisé avec `~/Desktop/log-nav-vfr.html`, qui est la copie de travail réelle utilisée en session — vérifier laquelle est la plus à jour avant de modifier l'une ou l'autre.
