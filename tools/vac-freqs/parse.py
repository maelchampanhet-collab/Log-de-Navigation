import re, json, os, sys
KW = [  # (regex, type) — l'ordre compte : le plus spécifique d'abord
 (r'\bSTAP\b', None),
 (r'\bRAI\b', 'RAI'),
 (r'\bVDF\b', None),
 (r'\bATIS\b', 'ATIS'),
 (r'\bAFIS\b', 'AFIS'),
 (r'\bA/A\b', 'A/A'),
 (r'\bABSENCE\s+A(?:F|T)[I1]?S\b', 'A/A'),
 (r'\bFIS\b', 'FIS'),
 (r'\b(?:INFORMATION|TRANSIT|CONTR[OÔ]LE|CONTROL)\b', 'FIS~'),
 (r'\bAPP\b', 'APPROCHE'),
 (r'\b(?:APPROCHE|APPROACH|ARRIV[EÉ]ES|ARRIVALS)\b', 'APPROCHE~'),
 (r'\bTWR\b', 'TOUR'),
 (r'\b(?:TOUR|TOWER)\b', 'TOUR~'),
 (r'\b(?:GND|SOL)\b', 'SOL'),
 (r'\bGROUND\b', 'SOL~'),
 (r'\b(?:DELIVERY|PR[EÉ]VOL)\b', 'PRÉVOL'),
]
FRE = re.compile(r'(?<![\d.])(1[123]\d)[.,](\d{1,3})(?![\d])')
OK_END = {'00','05','10','15','25','30','35','40','50','55','60','65','75','80','85','90'}
def valid(f):
    mhz, dec = f
    dec = (dec+'00')[:3]
    v = float(mhz+'.'+dec)
    if not (118.0 <= v <= 136.99): return None
    if dec[1:] not in OK_END: return None
    return mhz+'.'+dec
def lines(path):
    # regroupe les morceaux OCR d'une même ligne visuelle (libellé et valeur alignés en colonnes)
    obs=[]
    for l in open(path, encoding='utf-8'):
        if '\t' not in l: continue
        pos, txt = l.rstrip('\n').split('\t',1)
        x,y = map(float,pos.split(','))
        if x < 0.66 and 0.12 < y < 0.62: obs.append((y,x,txt))
    obs.sort(key=lambda o:-o[0])
    rows=[]
    for y,x,t in obs:
        if rows and abs(rows[-1][0]-y) < 0.02: rows[-1][1].append((x,t))
        else: rows.append([y,[(x,t)]])
    return [' '.join(t for x,t in sorted(r[1])) for r in rows]
def parse(path):
    res = []  # (freq, type, secours)
    last = None  # type de la ligne précédente, pour les lignes de suite ("119.855 - 126.430 ..." sous APP)
    for t in lines(path):
        U = t.upper()
        kws = []
        for rx, ty in KW:
            for m in re.finditer(rx, U): kws.append((m.start(), ty))
        FUZZ = [(r'^\s*(?:AVA|AIA|A1A|AJA)\b', 'A/A'), (r'^\s*WR\b', 'TOUR'), (r'^\s*I?PP\b', 'APPROCHE'), (r'^\s*(?:TIS|A[L1I]IS)\b', 'ATIS')]
        for rx, ty in FUZZ:
            m0 = re.match(rx, U)
            if m0: kws.append((m0.start(), ty))
        if not kws:
            if last and re.match(r'^\s*1[123]\d[.,]\d', t): kws = [(-1, last)]
            else:
                last = None
                continue
        kws.sort()
        last = kws[-1][1].rstrip('~') if kws[-1][1] else None
        prev_end = -2
        for m in FRE.finditer(t):
            f0 = valid(m.groups())
            seg_start = prev_end; prev_end = m.end()
            if not f0: continue
            f = f0
            before = [k for k in kws if k[0] < m.start()]
            if not before: continue
            ty = before[-1][1]
            if ty and ty.endswith('~'):
                strong = [k for k in before if k[1] and not k[1].endswith('~') and k[0] > seg_start]
                ty = strong[-1][1] if strong else ty[:-1]
            if ty is None: continue
            tail = t[m.end():m.end()+5].upper()
            sec = bool(re.match(r'\s*\(S\)', tail))
            res.append((f, ty, sec))
    return res
data = {}; stats = {'ok':0,'empty':0,'mismatch':0}
mism = {}
for fn in sorted(os.listdir('ocr')):
    c = fn[:-4]
    runs = [parse(d+'/'+fn) for d in ('ocr','ocr2','ocr3') if os.path.exists(d+'/'+fn)]
    sets = [{x[0] for x in r} for r in runs]
    from collections import Counter
    cnt = Counter(f for st in sets for f in st)
    both = {f for f,n in cnt.items() if n >= 2}
    fa, fb = sets[0], sets[1]
    if set(cnt) - both: mism[c] = sorted(set(cnt) - both)
    a = [x for r in runs for x in r]; b = []
    seen = {}
    for f, ty, sec in a + b:
        if f not in both: continue
        k = (f, ty)
        # un même couple (fréquence, type) n'est gardé qu'une fois ; secours si lu comme tel au moins une fois
        seen[k] = seen.get(k, False) or sec
    # une fréquence déjà rangée sous TOUR/AFIS n'est pas redoublée en A/A (même canal, cf. "Absence ATS : A/A (118.305)")
    items = []
    main = {f for (f, ty) in seen if ty in ('TOUR','AFIS')}
    for (f, ty), sec in seen.items():
        if ty == 'A/A' and f in main: continue
        items.append({'type': ty, 'freq': f, **({'secours': True} if sec else {})})
    order = ['ATIS','AFIS','TOUR','A/A','SOL','PRÉVOL','APPROCHE','FIS','RAI']
    items.sort(key=lambda i: (order.index(i['type']), i['freq']))
    if items: data[c] = items; stats['ok'] += 1
    else: stats['empty'] += 1
    if fa ^ fb: stats['mismatch'] += 1
# corrections relues à l'œil sur l'image de la VAC (lectures OCR incomplètes/contradictoires)
data['LFLX']=[{'type':'AFIS','freq':'125.880'},{'type':'AFIS','freq':'133.805','secours':True},{'type':'TOUR','freq':'125.880'},{'type':'TOUR','freq':'133.805','secours':True},{'type':'APPROCHE','freq':'134.100'}]
data['LFMT']=[{'type':'ATIS','freq':'124.130'},{'type':'TOUR','freq':'118.200'},{'type':'TOUR','freq':'118.775'},{'type':'SOL','freq':'121.955'},{'type':'APPROCHE','freq':'120.375','secours':True},{'type':'APPROCHE','freq':'127.280'},{'type':'APPROCHE','freq':'130.855'},{'type':'APPROCHE','freq':'131.055'},{'type':'FIS','freq':'125.900'},{'type':'FIS','freq':'134.375'},{'type':'FIS','freq':'136.625'}]
json.dump(data, open('vac_freqs.json','w'), ensure_ascii=False, indent=0)
with open('vac_freqs.js','w') as fh:
    fh.write(',\n'.join('  %s:[%s]' % (c, ','.join("'%s %s%s'" % (i['type'], i['freq'], ' (S)' if i.get('secours') else '') for i in v)) for c, v in sorted(data.items())) + '\n')
print(stats); print('mismatch sample', list(mism.items())[:15])
print('empty:', [f[:-4] for f in sorted(os.listdir('ocr')) if f[:-4] not in data])
