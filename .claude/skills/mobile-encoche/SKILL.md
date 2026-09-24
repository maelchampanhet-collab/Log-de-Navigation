---
name: mobile-encoche
description: Mise en page téléphone de log-nav-vfr.html (appli installée PWA, iPhone avec encoche / Dynamic Island / barre de geste, portrait et paysage). À utiliser pour toute modification du CSS ou du markup visible sur mobile (barre du haut, barre d'onglets du bas, carte, modales, nouveaux panneaux), ou quand l'utilisateur signale un problème d'affichage, de place perdue ou d'élément caché sur son téléphone. Contient les règles de l'appli et un test qui simule l'encoche.
---

# Mise en page téléphone avec encoche — log-nav-vfr.html

L'utilisateur se sert de l'appli **installée sur iPhone** (plein écran, `black-translucent` : la page s'affiche aussi sous la barre d'état et l'encoche). Il veut que **chaque pixel serve**, sans que rien ne soit caché par l'encoche, la Dynamic Island ou la barre de geste.

## Règles de l'appli

### Zones de sécurité : toujours les variables, jamais `env()`
`:root` définit `--sat`, `--sar`, `--sab`, `--sal` (= `env(safe-area-inset-top/right/bottom/left, 0px)`).
- Dans le CSS, **utiliser uniquement `var(--sat)` etc.** Un `env(safe-area-inset-*)` direct échappe au test (Chromium ne l'émule pas) : le bug ne sera vu que sur le téléphone de l'utilisateur.
- `--home-gap` = marge sous la barre d'onglets, réduite à `--sab − 16px` (min 2 px) : la barre de geste peut chevaucher le bas de la barre d'onglets, comme dans les applis iOS natives.

### Bloc mobile
- Un seul bloc : `@media (max-width:760px), (max-height:500px) and (pointer:coarse)` — la 2e condition couvre **le paysage** (un iPhone couché fait plus de 760 px de large). Le JS qui dépend du mobile (`matchMedia`) doit utiliser **exactement la même requête**.
- Hauteurs de référence : barre du haut `44px + var(--sat)`, barre d'onglets `50px + var(--home-gap)`. Tout calcul de hauteur plein écran (ex. `#routeMap`) part de `100dvh` (pas `100vh`, faux sur iOS quand la barre Safari bouge) moins ces deux barres.

### Utiliser l'encoche
- La **barre du haut** (`.main-top`) commence à `top:0` avec `padding-top: var(--sat)` : son fond passe sous l'encoche, son contenu juste en dessous.
- Elle **s'efface en défilant vers le bas** (`body.bar-hidden`, posé par le JS) et revient en remontant, en haut de page ou au changement d'onglet (`switchTab`).
- `body::before` : bande fixe de hauteur `var(--sat)` derrière l'heure/la batterie, pour que le contenu qui défile sous l'encoche ne se mélange pas à la barre d'état.
- En paysage : `.main`, `.main-top` et la barre d'onglets prennent `var(--sal)` / `var(--sar)` en marge latérale (l'îlot est sur le côté).

### Superpositions
- Barre d'onglets `z-index:50`, barre du haut `40`, bande d'encoche `60`, modales `100`.
- Leaflet empile ses calques jusqu'à `z-index:1000` : `.leaflet-container` est confiné (`position:relative; z-index:0; isolation:isolate`). Toute nouvelle carte ou bibliothèque qui crée ses propres calques doit être confinée de la même façon.

### Tactile
- Champs de saisie en **16 px minimum** (sinon iOS zoome à chaque saisie).
- Cibles tactiles ≥ 36–44 px. La barre d'onglets **défile horizontalement** (onglets de 70 px min) : ne jamais la rendre non défilante, sinon des onglets deviennent inaccessibles sur petit écran.

## Procédure pour toute modification de mise en page mobile

1. Modifier le CSS/markup en respectant les règles ci-dessus.
2. Vérifier la syntaxe JS (cf. CLAUDE.md, `node --check`).
3. Lancer le serveur local puis le test d'encoche :
   ```
   python3 -m http.server 8000   # à la racine du dépôt, en arrière-plan
   NODE_PATH=$(npm root -g) node .claude/skills/mobile-encoche/test-encoche.js http://localhost:8000/log-nav-vfr.html <dossier_captures>
   ```
   Le test simule iPhone 15 Pro (portrait et paysage), iPhone 15 Pro Max et iPhone SE avec leurs vraies zones de sécurité, parcourt les 6 onglets, en haut de page et après défilement, et signale tout bouton de barre ou onglet qui tombe sous l'encoche, dans une zone latérale ou hors écran, ainsi que tout défilement horizontal. Code de sortie 1 en cas de problème.
   - Chromium : `CHROMIUM_PATH` sinon `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
   - Mettre `<dossier_captures>` hors du dépôt (scratchpad) ; `captures-encoche/` est ignoré par git sinon.
4. **Regarder les captures** (au moins portrait onglet actif, paysage, et un état `-defile`) : zones interdites en rouge translucide, îlot en noir, barre de geste en blanc. Le test automatique ne voit pas tout (texte tronqué, place perdue, éléments serrés).
5. Incrémenter `VERSION` dans `sw.js` pour que le téléphone reçoive la mise à jour.

## Limites connues
- Sans accès aux CDN (bac à sable), Leaflet et les icônes Phosphor ne chargent pas : l'onglet Carte est testé sans la carte, les icônes apparaissent comme des cases vides. Le signaler à l'utilisateur plutôt que de le présenter comme vérifié.
- Valeurs d'encoche relevées sur les appareils Apple ; un nouvel iPhone peut différer — ajouter une entrée à `DEVICES` dans le script.
