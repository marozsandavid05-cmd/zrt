/* Minden oldalon megkeresi a 2+ hasábos grid konténereket, ahol a hasábok
   magasságkülönbsége nagy (>260px) → ott "nagy üres tér" van. */
const { chromium } = require('playwright');
const pages = ['index','mit-epitunk','hogyan-epitunk','foghij','muemlek',
  'referenciak','szamok','rolunk','kapcsolat','projekt-erzsebetvaros','projekt-palotanegyed'];
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
  for (const p of pages) {
    await page.goto(`file:///C:/Users/szonj/OneDrive/Desktop/David/ZRT/weboldal%202/${p}.html`);
    await page.waitForTimeout(1800);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(600);
    const rep = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('*').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.display !== 'grid') return;
        const cols = cs.gridTemplateColumns.split(' ').filter(x => x !== '0px').length;
        if (cols < 2) return;
        const kids = [...el.children].filter(k => getComputedStyle(k).position !== 'sticky');
        if (kids.length < 2 || kids.length > 4) return;
        const hs = kids.map(k => k.getBoundingClientRect().height);
        const diff = Math.max(...hs) - Math.min(...hs);
        if (diff > 260) {
          const cls = (el.className || '').toString().trim().split(/\s+/).slice(0, 2).join('.');
          out.push(cls + ' | hasábok: ' + hs.map(h => Math.round(h)).join(' vs ') + ' | diff ' + Math.round(diff));
        }
      });
      return out;
    });
    console.log('== ' + p + (rep.length ? '\n  ' + rep.join('\n  ') : '  OK'));
  }
  await b.close();
})();
