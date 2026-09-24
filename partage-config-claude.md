# Prompt à envoyer pour reproduire ma configuration Claude Code

À copier-coller tel quel dans Claude Code (dans n'importe quel dossier) :

---

```
Configure mon Claude Code avec les préférences suivantes. Crée (ou complète sans
écraser l'existant) le fichier ~/.claude/CLAUDE.md, qui s'applique à tous mes
projets, avec ce contenu :

# Préférences globales

## Langue
- Réponds-moi en français. Interface, commentaires de code et messages de commit
  en français aussi, sauf si le projet est déjà dans une autre langue.

## Façon de travailler
- Avant de modifier un fichier, lis seulement la partie utile (offset/limit, grep)
  plutôt que tout le fichier quand il est gros.
- Une seule copie de travail par projet : ne crée jamais de doublon du projet
  ailleurs (Bureau, dossier "backup"...). Édite directement dans le dépôt.
- Écris du code qui ressemble au code existant : même indentation (2 espaces par
  défaut), même nommage, même densité de commentaires.
- Préfère la solution la plus simple : pas de framework ni d'étape de build si le
  projet n'en a pas besoin.
- Après une modification JavaScript, vérifie au minimum la syntaxe (node --check).
- Ne commit et ne push que si je le demande.

## Données et fiabilité
- N'invente jamais de données factuelles (chiffres, fréquences, adresses, dates,
  références officielles...). Si une donnée n'est pas vérifiée, affiche
  explicitement "non vérifié" et indique où la trouver.
- Ne retire jamais les avertissements du type "aide à la préparation, pas une
  source certifiée" dans les applis que je construis.

## Interface
- Jamais d'emoji comme icône dans une interface (navigation, boutons, alertes) :
  utilise une vraie bibliothèque d'icônes (par ex. Phosphor Icons en CDN).
- Valeurs numériques affichées dans une police à chasse fixe.

## Documentation du projet
- Dans chaque projet, tiens à jour un CLAUDE.md qui décrit : l'aperçu, les
  modules et leur état d'avancement, ce qui reste à faire, les commandes
  (prévisualiser, vérifier), la structure des fichiers et les conventions.
  Mets-le à jour quand la structure change.

Ensuite :
1. Montre-moi le fichier ~/.claude/CLAUDE.md final.
2. Rappelle-moi d'activer les skills Anthropic (Word, Excel, PowerPoint, PDF,
   Skill Creator) dans les paramètres de mon compte claude.ai, et de lancer
   /init dans chaque nouveau projet pour générer son CLAUDE.md.
```

---

## Notes pour moi

- Les skills docx / xlsx / pptx / pdf / skill-creator / docs / morning /
  import-memory / setup-writing-style sont les skills officiels d'Anthropic
  synchronisés avec le compte : il n'y a rien à copier, ton amie les active
  depuis ses propres paramètres claude.ai.
- Le skill `graphify` est installé sur mon Mac (`.claude/skills/graphify/`) mais
  n'est pas dans ce dépôt. Pour le partager : lui envoyer ce dossier à placer
  dans `~/.claude/skills/graphify/` chez elle.
- Les règles propres au log de nav VFR (AD_NOTES, onglets, AVWX...) restent dans
  le `CLAUDE.md` de ce dépôt : elles ne concernent que ce projet.
