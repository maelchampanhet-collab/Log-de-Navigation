#!/bin/bash
# Régénère la table VAC_FREQS de log-nav-vfr.html à partir des cartes VAC du SIA (macOS : Vision + PDFKit).
# Usage : ./run.sh 01_OCT_2026   (dossier eAIP du cycle AIRAC, même valeur que airacAtlas().folder dans l'appli)
# Sortie : vac_freqs.js (lignes à coller dans VAC_FREQS) + la liste des désaccords OCR à relire à l'œil
# (./stack out.png LFXX LFYY … empile les en-têtes VAC pour les vérifier).
set -e
CYCLE=${1:?cycle AIRAC attendu, ex. 03_SEP_2026}
cd "$(dirname "$0")"
swiftc -O vacocr.swift -o vacocr; swiftc -O stack.swift -o stack
# Repart de zéro : parse.py lit tout ce qui traîne dans ocr/ocr2/ocr3, une lecture d'un cycle précédent
# (terrain sans VAC ce cycle-ci, 3e lecture ocr3) se mélangerait sinon aux nouvelles.
rm -rf vac ocr ocr2 ocr3
mkdir -p vac ocr ocr2 ocr3
python3 -c "import re;s=open('../../log-nav-vfr.html',encoding='utf-8').read();i=s.index('const AIRPORTS');j=s.index('\n',i);print('\n'.join(sorted(set(re.findall(r'\"icao\":\"([A-Z0-9]{4})\"',s[i:j])))))" > codes.txt
export B="https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_${CYCLE}/Atlas-VAC/PDF_AIPparSSection/VAC/AD"
# Code OACI passé en argument ($1) et non via xargs -I{} : sur macOS, -I limite la commande remplacée
# à 255 octets (« command line cannot be assembled, too long ») et l'URL du SIA la fait déborder.
cat codes.txt | xargs -P 6 -n 1 sh -c 'curl -s -m 60 -A Mozilla/5.0 -o "vac/$1.pdf" -w "%{http_code}" "$B/AD-2.$1.pdf" > "vac/$1.code"; [ "$(cat "vac/$1.code")" = 200 ] && ./vacocr "vac/$1.pdf" 4 > "ocr/$1.txt" && ./vacocr "vac/$1.pdf" 3 > "ocr2/$1.txt" || rm -f "vac/$1.pdf"' _
echo "VAC téléchargées : $(ls vac/*.pdf 2>/dev/null | wc -l | tr -d ' ') / $(wc -l < codes.txt | tr -d ' ') (codes HTTP : $(for f in vac/*.code; do cat "$f"; echo; done | sort | uniq -c | tr -s ' \n' ' '))"
python3 parse.py
echo "Terrains en désaccord : relancer une 3e lecture (./vacocr vac/X.pdf 5 > ocr3/X.txt), puis python3 parse.py, et relire à l'œil."
echo "Penser à reporter les corrections manuelles en fin de parse.py (LFLX, LFMT, ...) si elles sont toujours valables."
