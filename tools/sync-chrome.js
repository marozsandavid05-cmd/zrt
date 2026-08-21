/* Nav+footer szétmásoló: az index.html CHROME-marker blokkjait írja át minden
   más .html oldalba, és beállítja az aria-current="page"-et.
   Futtatás:  node tools/sync-chrome.js   (a ZRT mappából vagy bárhonnan) */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MASTER = path.join(ROOT, 'index.html');

function extract(html, name){
  const re = new RegExp(`<!-- CHROME:${name}:start -->[\\s\\S]*?<!-- CHROME:${name}:end -->`);
  const m = html.match(re);
  if(!m) throw new Error(`Nincs CHROME:${name} blokk a masterben`);
  return m[0];
}

const master = fs.readFileSync(MASTER, 'utf8');
const NAV = extract(master, 'NAV');
const FOOTER = extract(master, 'FOOTER');

const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
let changed = 0;

/* aloldal -> nav-szülő: a mélyoldalakon a szekció nav-linkje halvány jelölést kap,
   így a látogató tudja, melyik fő szekcióban jár (nav__a--sect osztály) */
const PARENT = {
  'foghij.html': 'mit-epitunk.html',
  'muemlek.html': 'mit-epitunk.html',
  'projekt-erzsebetvaros.html': 'referenciak.html',
  'projekt-palotanegyed.html': 'referenciak.html',
  'kapcsolat.html': null
};

for(const page of pages){
  const file = path.join(ROOT, page);
  let html = fs.readFileSync(file, 'utf8');
  const orig = html;

  // friss chrome beírása (aria-current és szülő-jelölés nélkül indul)
  let nav = NAV.replace(/ aria-current="page"/g, '').replace(/ nav__a--sect/g, '');
  let footer = FOOTER;

  // aria-current: a saját oldalára mutató linkek jelölése
  const esc = page.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  nav = nav.replace(new RegExp(`(<a href="${esc}")`, 'g'), '$1 aria-current="page"');

  // szülő-szekció jelölése a mélyoldalakon
  const parent = PARENT[page];
  if (parent) {
    const pesc = parent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    nav = nav.replace(new RegExp(`<a href="${pesc}" class="nav__a"`, 'g'),
      `<a href="${parent}" class="nav__a nav__a--sect"`);
  }

  html = html.replace(/<!-- CHROME:NAV:start -->[\s\S]*?<!-- CHROME:NAV:end -->/, nav);
  html = html.replace(/<!-- CHROME:FOOTER:start -->[\s\S]*?<!-- CHROME:FOOTER:end -->/, footer);

  if(html !== orig || page === 'index.html'){
    if(page !== 'index.html'){ fs.writeFileSync(file, html, 'utf8'); changed++; }
  }
  if(!/CHROME:NAV:start/.test(html)) console.warn(`FIGYELEM: ${page} nem tartalmaz CHROME:NAV markert`);
}
console.log(`sync-chrome kész: ${changed} oldal frissítve (${pages.length} oldal vizsgálva).`);
