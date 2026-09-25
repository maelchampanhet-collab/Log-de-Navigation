#!/bin/bash
# Régénère la table VAC_FREQS de log-nav-vfr.html à partir des cartes VAC du SIA (macOS : Vision + PDFKit).
# Usage : ./run.sh 01_OCT_2026   (dossier eAIP du cycle AIRAC, même valeur que AIRAC_ATLAS.base)
# Sortie : vac_freqs.js (lignes à coller dans VAC_FREQS) + la liste des désaccords OCR à relire à l'œil
# (./stack out.png LFXX LFYY … empile les en-têtes VAC pour les vérifier).
set -e
CYCLE=${1:?cycle AIRAC attendu, ex. 03_SEP_2026}
cd "$(dirname "$0")"
swiftc -O vacocr.swift -o vacocr; swiftc -O stack.swift -o stack
mkdir -p vac ocr ocr2 ocr3
python3 -c "import re;s=open('../../log-nav-vfr.html',encoding='utf-8').read();i=s.index('const AIRPORTS');j=s.index('\n',i);print('\n'.join(sorted(set(re.findall(r'\"icao\":\"([A-Z0-9]{4})\"',s[i:j])))))" > codes.txt
B="https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_${CYCLE}/Atlas-VAC/PDF_AIPparSSection/VAC/AD"
cat codes.txt | xargs -P 6 -I{} sh -c "curl -s -m 60 -A Mozilla/5.0 -o vac/{}.pdf -w '%{http_code}' $B/AD-2.{}.pdf > vac/{}.code; [ \"\$(cat vac/{}.code)\" = 200 ] && ./vacocr vac/{}.pdf 4 > ocr/{}.txt && ./vacocr vac/{}.pdf 3 > ocr2/{}.txt || rm -f vac/{}.pdf"
python3 parse.py
echo "Terrains en désaccord : relancer une 3e lecture (./vacocr vac/X.pdf 5 > ocr3/X.txt), puis python3 parse.py, et relire à l'œil."
echo "Penser à reporter les corrections manuelles en fin de parse.py (LFLX, LFMT, ...) si elles sont toujours valables."
