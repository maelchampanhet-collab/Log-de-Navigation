// Test de mise en page avec encoche simulée (iPhone) pour log-nav-vfr.html.
// Chromium ne sait pas émuler env(safe-area-inset-*) : on surcharge les variables
// --sat/--sar/--sab/--sal de l'appli avec les vraies valeurs de chaque iPhone,
// on dessine par-dessus l'encoche/Dynamic Island et la barre de geste,
// puis on vérifie qu'aucun élément tactile fixe ne tombe dans ces zones.
//
// Chromium : CHROMIUM_PATH (sur Mac : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome").
// Usage (serveur local lancé : python3 -m http.server 8000) :
//   NODE_PATH=$(npm root -g) node .claude/skills/mobile-encoche/test-encoche.js [url] [dossier_captures]
let chromium;
try{ ({ chromium } = require('playwright')); }catch(e){ ({ chromium } = require('playwright-core')); }
const fs = require('fs');

const URL = process.argv[2] || 'http://localhost:8000/log-nav-vfr.html';
const OUT = process.argv[3] || 'captures-encoche';
const CHROME = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// Valeurs safe-area réelles (points CSS) relevées sur les appareils Apple
const DEVICES = [
  { name:'iphone15pro-portrait',  w:393, h:852, top:59, right:0,  bottom:34, left:0,  island:'top' },
  { name:'iphone15pro-paysage',   w:852, h:393, top:0,  right:59, bottom:21, left:59, island:'left' },
  { name:'iphoneSE-portrait',     w:375, h:667, top:20, right:0,  bottom:0,  left:0,  island:null },
  { name:'iphone15promax-portrait', w:430, h:932, top:59, right:0, bottom:34, left:0, island:'top' },
];

// Surcouche : zones interdites en rouge translucide + îlot + barre de geste
function overlayScript(d){
  return `(() => {
    const st = document.createElement('style');
    st.textContent = ':root{--sat:${d.top}px;--sar:${d.right}px;--sab:${d.bottom}px;--sal:${d.left}px;}';
    document.head.appendChild(st);
    const layer = document.createElement('div');
    layer.id = '__encoche';
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;';
    const zone = (css) => { const z = document.createElement('div'); z.style.cssText = 'position:absolute;background:rgba(255,0,0,.18);' + css; layer.appendChild(z); };
    if(${d.top}) zone('top:0;left:0;right:0;height:${d.top}px;');
    if(${d.bottom}) zone('bottom:0;left:0;right:0;height:${d.bottom}px;');
    if(${d.left}) zone('top:0;bottom:0;left:0;width:${d.left}px;');
    if(${d.right}) zone('top:0;bottom:0;right:0;width:${d.right}px;');
    const isl = document.createElement('div');
    ${d.island === 'top' ? "isl.style.cssText='position:absolute;top:11px;left:50%;transform:translateX(-50%);width:126px;height:37px;border-radius:20px;background:#000;';" : ''}
    ${d.island === 'left' ? "isl.style.cssText='position:absolute;left:11px;top:50%;transform:translateY(-50%);width:37px;height:126px;border-radius:20px;background:#000;';" : ''}
    layer.appendChild(isl);
    if(${d.bottom}){
      const home = document.createElement('div');
      home.style.cssText = 'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:134px;height:5px;border-radius:3px;background:#fff;';
      layer.appendChild(home);
    }
    document.body.appendChild(layer);
  })()`;
}

// Éléments tactiles fixes/collants (barres de l'appli) qui empiètent sur une zone interdite.
// La barre de geste tolère un chevauchement (Apple la superpose aux barres d'onglets),
// mais pas l'îlot / l'encoche ni les bords latéraux en paysage.
function checkScript(d){
  return `(() => {
    const bad = [];
    const W = innerWidth, H = innerHeight;
    // Barres et éléments FIXES seulement : ici la carte est dans le flux de la page (sous le texte
    // d'aide), ses boutons Leaflet défilent normalement sous la bande d'encoche — pas un défaut.
    const sel = '.mobile-topbar, .mobile-tabbar .navitem, .galons-toast.show';
    document.querySelectorAll(sel).forEach(el => {
      let r = el.getBoundingClientRect();
      if(!r.width || !r.height) return;
      const cs = getComputedStyle(el);
      if(cs.visibility === 'hidden' || cs.display === 'none') return;
      // barre du haut masquée (translateY) : hors écran, pas concernée
      if(r.bottom <= 0) return;
      // élément qui défile avec la page (ex. .mobile-topbar, titre en flux) : il passe normalement
      // sous la bande d'encoche une fois la page défilée ; on ne le contrôle qu'en haut de page
      let fixedAnc = false;
      for(let a = el; a; a = a.parentElement){ const ps = getComputedStyle(a).position; if(ps === 'fixed' || ps === 'sticky'){ fixedAnc = true; break; } }
      if(!fixedAnc && window.scrollY > 0) return;
      // onglets de la barre défilante : seule la partie visible (rognée par la barre) compte
      const nav = el.closest('.mobile-tabbar');
      if(nav){
        const n = nav.getBoundingClientRect();
        const left = Math.max(r.left, n.left), right = Math.min(r.right, n.right);
        if(right - left < 1) return;
        r = { top:r.top, bottom:r.bottom, left, right };
      }
      const label = (el.dataset.title || el.getAttribute('aria-label') || el.textContent || el.className).trim().slice(0,30);
      if(r.top < ${d.top} - 0.5) bad.push(label + ' : sous l\\'encoche (haut ' + Math.round(r.top) + ' < ' + ${d.top} + ')');
      if(r.left < ${d.left} - 0.5) bad.push(label + ' : dans la zone gauche (' + Math.round(r.left) + ')');
      if(r.right > W - ${d.right} + 0.5) bad.push(label + ' : dans la zone droite (' + Math.round(r.right) + ')');
      if(r.bottom > H + 0.5) bad.push(label + ' : coupé par le bas de l\\'écran (' + Math.round(r.bottom) + ' > ' + H + ')');
    });
    if(document.documentElement.scrollWidth > W) bad.push('défilement horizontal de la page (' + document.documentElement.scrollWidth + ' > ' + W + ')');
    return bad;
  })()`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive:true });
  const browser = await chromium.launch({ executablePath: CHROME });
  let total = 0;
  for(const d of DEVICES){
    const ctx = await browser.newContext({ viewport:{ width:d.w, height:d.h }, deviceScaleFactor:2, isMobile:true, hasTouch:true });
    const p = await ctx.newPage();
    await p.goto(URL, { waitUntil:'load' });
    await p.waitForTimeout(800);
    await p.evaluate(() => { const m = document.getElementById('onboardModal'); if(m) m.style.display = 'none'; });
    await p.evaluate(overlayScript(d));
    // notification « galons » affichée en permanence pour vérifier qu'elle évite l'encoche
    await p.evaluate(() => { const t = document.getElementById('galonsToast'); if(t){ t.textContent = 'Test notification'; t.classList.add('show'); t.style.transition = 'none'; } });
    for(const tab of [0,1,2,3,4,5,6,7,8,9,10,11,12]){
      // la carte (Leaflet, CDN) peut être indisponible hors ligne : on teste quand même la mise en page
      const err = await p.evaluate(t => { try{ switchTab(t); return ''; }catch(e){ return e.message; } }, tab);
      if(err) console.log(`        (onglet ${tab} : ${err} — carte non chargée, mise en page testée sans elle)`);
      await p.waitForTimeout(tab === 5 ? 1200 : 300);
      const shot = `${OUT}/${d.name}-onglet${tab}.png`;
      await p.screenshot({ path:shot });
      const bad = await p.evaluate(checkScript(d));
      // état défilé : barre du haut masquée, contenu sous l'encoche
      await p.evaluate(() => window.scrollTo(0, 400));
      await p.evaluate(() => window.dispatchEvent(new Event('scroll')));
      await p.waitForTimeout(350);
      await p.screenshot({ path:`${OUT}/${d.name}-onglet${tab}-defile.png` });
      const bad2 = await p.evaluate(checkScript(d));
      await p.evaluate(() => window.scrollTo(0, 0));
      const all = [...new Set([...bad, ...bad2])];
      total += all.length;
      console.log(`${all.length ? 'ÉCHEC' : 'OK   '}  ${d.name}  onglet ${tab}` + (all.length ? '\n        - ' + all.join('\n        - ') : ''));
    }
    await ctx.close();
  }
  await browser.close();
  console.log(total ? `\n${total} problème(s) — captures dans ${OUT}/` : `\nAucun problème — captures dans ${OUT}/`);
  process.exit(total ? 1 : 0);
})();
