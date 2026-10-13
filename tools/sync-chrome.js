/* Nav+footer szétmásoló: az index.html CHROME-marker blokkjait írja át minden
   más .html oldalba, és beállítja az aria-current="page"-et.
   A linkek tiszta URL-ek (foghij, nem foghij.html; főoldal: ./). file:// alatt az
   app.js teszi vissza a .html-t, http(s) alatt a Cloudflare Pages szolgálja ki.
   Futtatás:  node tools/sync-chrome.js   (a projekt gyökeréből vagy bárhonnan) */
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
const slug = f => f === 'index.html' ? './' : f.replace(/\.html$/, '');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const master = fs.readFileSync(MASTER, 'utf8');
const NAV = extract(master, 'NAV');
const FOOTER = extract(master, 'FOOTER');

const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
let changed = 0;

/* aloldal -> nav-szülő: a mélyoldalakon a szekció nav-linkje halvány jelölést kap */
const PARENT = {
  'foghij.html': 'mit-epitunk.html',
  'muemlek.html': 'mit-epitunk.html',
  'projekt-erzsebetvaros.html': 'referenciak.html',
  'projekt-palotanegyed.html': 'referenciak.html'
};

for(const page of pages){
  const file = path.join(ROOT, page);
  let html = fs.readFileSync(file, 'utf8');
  const orig = html;

  let nav = NAV.replace(/ aria-current="page"/g, '').replace(/ nav__a--sect/g, '');
  /* a jogi oldalon a lábléc saját linkje is jelölt (okker, aria-current) */
  const footer = FOOTER.replace(/ aria-current="page"/g, '')
    .replace(new RegExp(`(<a class="foot__legal" href="${esc(slug(page))}")`, 'g'), '$1 aria-current="page"');

  nav = nav.replace(new RegExp(`(<a href="${esc(slug(page))}")`, 'g'), '$1 aria-current="page"');

  const parent = PARENT[page];
  if (parent) {
    nav = nav.replace(new RegExp(`<a href="${esc(slug(parent))}" class="nav__a"`, 'g'),
      `<a href="${slug(parent)}" class="nav__a nav__a--sect"`);
  }

  html = html.replace(/<!-- CHROME:NAV:start -->[\s\S]*?<!-- CHROME:NAV:end -->/, nav);
  html = html.replace(/<!-- CHROME:FOOTER:start -->[\s\S]*?<!-- CHROME:FOOTER:end -->/, footer);

  if(html !== orig && page !== 'index.html'){ fs.writeFileSync(file, html, 'utf8'); changed++; }
  if(!/CHROME:NAV:start/.test(html)) console.warn(`FIGYELEM: ${page} nem tartalmaz CHROME:NAV markert`);
}
console.log(`sync-chrome kész: ${changed} oldal frissítve (${pages.length} oldal vizsgálva).`);
