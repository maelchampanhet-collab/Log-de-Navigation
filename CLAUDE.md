# Log de navigation VFR

Application web mono-fichier pour préparer un vol VFR (aéroclub) : plan de vol / log de nav, gestion du hangar (flotte d'avions), masse et centrage, carburant, NOTAM/AD.

## Structure du projet

Le projet tient (pour l'instant) dans un seul fichier : **`log-nav-vfr.html`** (1858 lignes). Il n'y a pas d'autre code applicatif — pas besoin d'aller chercher ailleurs.

- **Lignes 1–616** : `<head>` + `<style>` (tout le CSS)
- **Lignes 618–912** : corps HTML (markup)
  - Modale d'onboarding (~646–670)
  - Panneau Hangar (~675–710)
  - Panneau Vols enregistrés (~712–719)
  - Onglets (~720+)
  - Saisie des étapes / legs (~852–870)
  - Formulaires masse & centrage / carburant (~872–912)
- **Lignes 913–1856** : `<script>` (tout le JavaScript, pas de fichiers séparés)

## Sections du JavaScript (avec ancre de ligne)

- `newLeg`, `addLeg`, `removeLeg`, `renderLegsInputs` (917–971) — gestion des étapes du vol
- Helpers math/format : `toRad`, `toDeg`, `computeWind`, `fmtHM`, `fmtMin`, `fmtNum`, `eobtToMinutes` (974–1018)
- `recompute()` / `renderOutput()` (1020–1148) — moteur de calcul principal du log de nav
- Recherche terrain : `stripAccents`, `norm`, `searchAirports`, `vacLinks`, `findAirport` (1150–1221)
- `greatCircle`, `updateRouteNote`, `updateNotamNote`, `updateAdNote`, `wireTerrainField` (1222–1449) — géo, notes de route, alertes NOTAM/AD, autocomplete terrain
- **Stockage persistant** (1450–1665) : `storageGetSafe` / `storageSetSafe` passent par `window.storage.get/set(key, shared)`.
  - `shared:true` → Hangar (flotte commune à tous les utilisateurs de l'appli)
  - `shared:false` → profil pilote + vols enregistrés (personnels)
  - `renderHangar`, `loadHangar`, `gatherFormState`, `applyFormState`, `renderSavedLogs`, `loadSavedLogsFromStorage`
- **Onglets** (1666–1695) : `switchTab`, `updateTabValidation`
- **Masse & centrage / carburant** (1696–1815) : `populateWbAircraftSelect`, `computeWB`, `computeFuelPlan`
- `initOnboarding` (1817–1856)

## Notes pour Claude Code

- Un seul fichier à lire/éditer : privilégier `Read log-nav-vfr.html` avec `offset`/`limit` ciblés sur la section concernée plutôt que relire tout le fichier.
- `window.storage` est une API fournie par l'environnement d'exécution de l'appli (pas définie dans ce fichier) — ne pas chercher son implémentation ici.
- Le skill `graphify` est installé (`.claude/skills/graphify/`) mais n'apporte rien tant que le projet tient en un seul fichier (le graphe généré est vide, faute de relations inter-fichiers). Il redeviendra utile si le JS est un jour éclaté en plusieurs fichiers.
