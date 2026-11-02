/* ==========================================================================
   VAC-TEAM „ARANYÓRA”, mozgásmotor
   Elv: a KÉSZ állapot az alapértelmezés. Minden rejtett kezdőállapot csak
   .js alatt él, és minden effektnek van komponált végállapota. GSAP nélkül
   is teljes az oldal: a súrolófény, a reveal és a nav natív JS-en fut.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- 0. TISZTA URL file:// ALATT ----------
     A forrásban tiszta URL áll (foghij, ./), ezt a Cloudflare Pages szolgálja ki.
     Dupla kattintásos megnyitásnál (file://) a .html kiterjesztést itt tesszük vissza. */
  if (location.protocol === 'file:') {
    [].slice.call(document.querySelectorAll('a[href]')).forEach(function (a) {
      var h = a.getAttribute('href');
      if (/^(?:[a-z]+:|#|\/)/i.test(h) || /\.[a-z0-9]+(?:#|$)/i.test(h)) return;
      var p = h.split('#');
      var base = p[0] === './' || p[0] === '' ? 'index' : p[0];
      if (p[0] === '' && p.length > 1) return;
      a.setAttribute('href', base + '.html' + (p.length > 1 ? '#' + p[1] : ''));
    });
  }

  /* ---------- 1. REVEAL: scroll-listener + biztonsági passzok ---------- */
  var ins = [].slice.call(document.querySelectorAll('[data-in]'));
  function runIn() {
    for (var i = 0; i < ins.length; i++) {
      var el = ins[i];
      if (el.classList.contains('on')) continue;
      if (el.getBoundingClientRect().top < innerHeight * 0.92) el.classList.add('on');
    }
  }
  var masks = [].slice.call(document.querySelectorAll('.mask'));
  function runMask() {
    for (var i = 0; i < masks.length; i++) {
      var el = masks[i];
      if (el.classList.contains('on')) continue;
      if (el.getBoundingClientRect().top < innerHeight * 0.94) el.classList.add('on');
    }
  }
  var shots = [].slice.call(document.querySelectorAll('.shot'));
  function runShot() {
    for (var i = 0; i < shots.length; i++) {
      var el = shots[i];
      if (el.classList.contains('on')) continue;
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.7 && r.bottom > 0) el.classList.add('on');
    }
  }
  function pass() { runIn(); runMask(); runShot(); }
  addEventListener('scroll', pass, { passive: true });
  addEventListener('resize', pass, { passive: true });
  pass();
  setTimeout(pass, 260);
  setTimeout(pass, 1200);
  addEventListener('load', pass);

  /* ---------- 2. SÚROLÓFÉNY (a signature) ----------
     Minden [data-rake] elem saját pályán fut. A pálya vagy a legközelebbi
     [data-rake-track] szülő (magas konténer + sticky gyerek), vagy maga a
     hero. A --sweep 0..100% között áll, a fénysáv a söprés élén ül.
     Reduced motion alatt a CSS 100%-on tartja: a KÉSZ homlokzat áll ott. */
  var rakes = [].slice.call(document.querySelectorAll('[data-rake]'));

  /* a pinnelt pálya csak akkor ragad, ha a hero tartalma befér a képernyőbe;
     különben a felső része a nav alá csúszna (alacsony telefon) */
  var tracks = [].slice.call(document.querySelectorAll('.herotrack[data-rake-track]'));
  function fitTracks() {
    tracks.forEach(function (t) {
      var inner = t.querySelector('.hero__in'), hero = t.querySelector('.hero');
      if (!inner || !hero) return;
      var cs = getComputedStyle(hero), nav = document.querySelector('.nav');
      var need = inner.offsetHeight + (nav ? nav.offsetHeight : 78) + 8 + parseFloat(cs.paddingBottom);
      var tall = need > innerHeight + 1;
      t.classList.toggle('is-tall', tall);
      /* alacsony ablakban is ragad: a hero előbb felgörget, amíg az alja a képernyő aljához ér,
         ott megáll, és csak a söprés végén megy tovább az oldal */
      var low = tall && !reduce;
      t.classList.toggle('is-pin-low', low);
      if (low) t.style.setProperty('--hero-h', Math.ceil(inner.offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) + 'px');
      else t.style.removeProperty('--hero-h');
    });
  }
  fitTracks();
  addEventListener('resize', fitTracks, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTracks);
  if (rakes.length && !reduce) {
    rakes.forEach(function (rk) {
      rk.classList.add('is-live');
      rk.style.setProperty('--sweep', '0%');
    });
    var rkRAF = 0;
    var rkState = rakes.map(function (rk) { return { el: rk, cur: 0, target: 0, beam: rk.querySelector('.rake__beam') }; });

    function measure() {
      for (var i = 0; i < rkState.length; i++) {
        var s = rkState[i];
        var track = s.el.closest('[data-rake-track]:not(.is-tall), [data-rake-track].is-pin-low');
        var p;
        if (track) {
          var tr = track.getBoundingClientRect();
          var span = tr.height - innerHeight;
          p = span > 0 ? (-tr.top) / span : (tr.top < 0 ? 1 : 0);
        } else {
          var hr = s.el.getBoundingClientRect();
          var hspan = hr.height || innerHeight;
          p = (-hr.top) / hspan;
        }
        var start = parseFloat(s.el.dataset.rakeStart || '0');
        s.target = Math.max(0, Math.min(1, start + p * (1 - start)));
      }
      if (!rkRAF) rkRAF = requestAnimationFrame(loop);
    }
    function loop() {
      var busy = false;
      for (var i = 0; i < rkState.length; i++) {
        var s = rkState[i];
        s.cur += (s.target - s.cur) * 0.14;
        if (Math.abs(s.target - s.cur) > 0.0015) busy = true;
        var pct = s.cur * 100;
        s.el.style.setProperty('--sweep', pct.toFixed(2) + '%');
        if (s.beam) {
          /* a fénysáv a KONTÉNER szélességéhez igazodik, nem a viewporthoz,
             így szűkebb blokkban is pontosan a söprés élén ül */
          var w = s.el.offsetWidth || innerWidth;
          s.beam.style.transform =
            'translateX(' + (s.cur * w).toFixed(1) + 'px) translateX(-50%) skewX(-9deg)';
          s.beam.style.opacity = (s.cur > 0.005 && s.cur < 0.995) ? '1' : '0';
        }
      }
      rkRAF = busy ? requestAnimationFrame(loop) : 0;
    }
    addEventListener('scroll', measure, { passive: true });
    addEventListener('resize', measure, { passive: true });
    measure();
    setTimeout(measure, 400);
    addEventListener('load', measure);
  }

  /* ---------- 3. NAV: delta-hiszterézis + tömör állapot ---------- */
  var nav = document.querySelector('.nav');
  var lastY = scrollY, dn = 0, up = 0, menuOpen = false;
  addEventListener('scroll', function () {
    if (!nav) return;
    var y = scrollY, d = y - lastY; lastY = y;
    nav.classList.toggle('is-solid', y > 40);
    if (menuOpen) return;
    if (d > 0) { dn += d; up = 0; } else if (d < 0) { up -= d; dn = 0; }
    if (y < 90) { nav.classList.remove('nav--up'); return; }
    if (dn > 30 && y > 240) nav.classList.add('nav--up');
    else if (up > 14) nav.classList.remove('nav--up');
  }, { passive: true });

  /* ---------- 4. MOBIL MENÜ ---------- */
  var burger = document.querySelector('.burger');
  var mob = document.querySelector('.mob');
  if (burger && mob) {
    burger.addEventListener('click', function () {
      menuOpen = !menuOpen;
      mob.classList.toggle('open', menuOpen);
      burger.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
      document.documentElement.style.overflow = menuOpen ? 'hidden' : '';
      if (window.__lenis) { menuOpen ? window.__lenis.stop() : window.__lenis.start(); }
      if (menuOpen) nav.classList.remove('nav--up');
    });
    mob.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menuOpen = false; mob.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        document.documentElement.style.overflow = '';
        if (window.__lenis) window.__lenis.start();
      });
    });
  }

  /* ---------- 5. DOKKOLT ELŐNÉZET a tipográfiai indexen ----------
     A kép egy ragadó keretben áll a lista mellett, sosem takar szöveget. */
  var dock = document.querySelector('.idxview__frame');
  if (dock && fine) {
    /* Hover vagy billentyűs fókusz váltja a képet és a feliratot. Ha a keretben még
       nincs meg a kép, itt jön létre, így a hosszú listák képei csak igény szerint töltődnek. */
    var dcap = document.querySelector('.idxview__cap [data-cap]');
    function dockShow(r) {
      var src = r.getAttribute('data-peek');
      var dimgs = [].slice.call(dock.querySelectorAll('img'));
      var found = dimgs.some(function (im) { return im.getAttribute('src') === src; });
      if (!found) {
        var im = document.createElement('img');
        im.alt = ''; im.decoding = 'async'; im.setAttribute('src', src);
        dock.appendChild(im);
        dimgs.push(im);
        void im.offsetWidth;
      }
      for (var i = 0; i < dimgs.length; i++) {
        dimgs[i].classList.toggle('on', dimgs[i].getAttribute('src') === src);
      }
      if (dcap) {
        if (r.hasAttribute('data-peekcap')) dcap.textContent = r.getAttribute('data-peekcap');
        else {
          var t = r.querySelector('.idx__t');
          if (t) dcap.textContent = t.textContent;
        }
      }
    }
    [].slice.call(document.querySelectorAll('[data-peek]')).forEach(function (r) {
      r.addEventListener('mouseenter', function () { dockShow(r); });
      r.addEventListener('focusin', function () { dockShow(r); });
    });
  }

  /* ---------- 5/b. SZŰRŐK a referencialistán ----------
     Szakterület-chipek (egy aktív) és legördülők a keresőkulcsokra, ÉS
     kapcsolatban. A sorok data-cat és data-<kulcs> tagek alapján rejtődnek, a
     tételszámláló követi a szűrést. Az állapot a címsor hash-ében él
     (#szakterulet=tetoter&beepites=foghijbeepites), így linkelhető. */
  var rf = document.querySelector('[data-rf]');
  if (rf) {
    var chips = [].slice.call(rf.querySelectorAll('.chip[data-filter]'));
    var sels = [].slice.call(rf.querySelectorAll('select[data-key]'));
    var frows = [].slice.call(document.querySelectorAll('[data-ref]'));
    var counter = document.querySelector('[data-count]');
    var empty = document.querySelector('[data-empty]');
    var clears = [].slice.call(document.querySelectorAll('[data-clear]'));
    var listTop = document.getElementById('lista');
    var cat = 'all';
    /* telefonon a részletes szűrők alapból csukva, asztalon mindig nyitva */
    var more = rf.querySelector('[data-rmore]');
    var moreN = rf.querySelector('[data-rmore-n]');
    var narrow = matchMedia('(max-width:640px)');
    function syncMore() { if (more) more.open = !narrow.matches || !!rf.querySelector('select.is-set'); }
    syncMore();
    if (narrow.addEventListener) narrow.addEventListener('change', syncMore);

    function has(r, key, val) {
      return (' ' + (r.getAttribute(key) || '') + ' ').indexOf(' ' + val + ' ') !== -1;
    }
    function state() {
      var s = {};
      sels.forEach(function (x) { if (x.value) s[x.getAttribute('data-key')] = x.value; });
      return s;
    }
    function match(r, c, s, skip) {
      if (c !== 'all' && !has(r, 'data-cat', c)) return false;
      for (var k in s) {
        if (k === skip) continue;
        if (!has(r, 'data-' + k, s[k])) return false;
      }
      return true;
    }
    function apply(writeHash) {
      var s = state(), shown = 0;
      frows.forEach(function (r) {
        var ok = match(r, cat, s);
        r.classList.toggle('is-hidden', !ok);
        /* a szűréssel előkerülő sor azonnal látsszon: a reveal különben csak
           a következő scroll-eventnél futna le, addig üresnek tűnne a lista */
        if (ok) { r.classList.add('on'); shown++; }
      });
      chips.forEach(function (x) {
        var on = x.getAttribute('data-filter') === cat;
        x.classList.toggle('on', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      /* az az opció, amelyik a többi szűrővel együtt üres listát adna, letiltva */
      sels.forEach(function (x) {
        var k = x.getAttribute('data-key');
        x.classList.toggle('is-set', !!x.value);
        [].slice.call(x.options).forEach(function (o) {
          if (!o.value || o.value === x.value) { o.disabled = false; return; }
          var any = false;
          for (var i = 0; i < frows.length && !any; i++) {
            if (match(frows[i], cat, s, k) && has(frows[i], 'data-' + k, o.value)) any = true;
          }
          o.disabled = !any;
        });
        if (x._sync) x._sync();
      });
      var active = cat !== 'all' || Object.keys(s).length > 0;
      if (moreN) moreN.textContent = Object.keys(s).length ? '(' + Object.keys(s).length + ')' : '';
      clears.forEach(function (b) { if (b.classList.contains('rclear')) b.disabled = !active; });
      if (counter) counter.textContent = shown;
      if (empty) empty.hidden = shown > 0;
      if (writeHash && history.replaceState) {
        var parts = [];
        if (cat !== 'all') parts.push('szakterulet=' + cat);
        for (var k in s) parts.push(k + '=' + s[k]);
        history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname + location.search);
      }
      /* a lista rövidülésével a viewportba ugró többi elem reveal-je is fusson le */
      pass();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }
    function fromHash() {
      var h = location.hash.replace(/^#/, '');
      if (!h || h.indexOf('=') === -1) return false;
      cat = 'all';
      sels.forEach(function (x) { x.value = ''; });
      h.split('&').forEach(function (p) {
        var kv = p.split('='), k = kv[0], v = decodeURIComponent(kv[1] || '');
        if (k === 'szakterulet') {
          if (chips.some(function (c) { return c.getAttribute('data-filter') === v; })) cat = v;
          return;
        }
        sels.forEach(function (x) {
          if (x.getAttribute('data-key') === k &&
              [].some.call(x.options, function (o) { return o.value === v; })) x.value = v;
        });
      });
      return true;
    }
    function toList() {
      if (!listTop) return;
      /* a szűrés után a lap rövidebb lett: a Lenis méretét frissíteni kell, mielőtt görget */
      if (window.__lenis) { window.__lenis.resize(); window.__lenis.scrollTo(listTop, { force: true }); }
      else listTop.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () { cat = c.getAttribute('data-filter'); apply(true); });
    });
    sels.forEach(function (x) { x.addEventListener('change', function () { apply(true); }); });

    /* Saját lenyíló lista egérrel használt gépen: a natív lista az operációs rendszer
       rajzolja, ezért a gomb fölé vagy a többi szűrő fölé is nyílhat. Ez mindig közvetlenül
       a mező alatt nyílik. Érintőképernyőn a natív választó marad. A valódi select a
       háttérben megmarad, az állapot és a szűrés továbbra is abból dolgozik. */
    var openDrop = null;
    function closeDrop(focusBtn) {
      if (!openDrop) return;
      var d = openDrop; openDrop = null;
      d.list.hidden = true;
      d.btn.setAttribute('aria-expanded', 'false');
      d.wrap.classList.remove('is-open');
      if (focusBtn) d.btn.focus();
    }
    if (fine) sels.forEach(function (x, idx) {
      var wrap = x.parentNode, lab = wrap.parentNode.querySelector('.lab');
      if (lab && !lab.id) lab.id = 'rsel-l-' + idx;
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'rsel__btn';
      btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
      var list = document.createElement('ul');
      list.className = 'rsel__list'; list.id = 'rsel-o-' + idx; list.hidden = true;
      list.setAttribute('role', 'listbox'); list.setAttribute('tabindex', '-1');
      list.setAttribute('data-lenis-prevent', '');
      if (lab) list.setAttribute('aria-labelledby', lab.id);
      btn.id = 'rsel-b-' + idx;
      if (lab) btn.setAttribute('aria-labelledby', lab.id + ' ' + btn.id);
      btn.setAttribute('aria-controls', list.id);
      x.tabIndex = -1; x.setAttribute('aria-hidden', 'true');
      wrap.classList.add('is-enh');
      wrap.appendChild(btn); wrap.appendChild(list);
      var d = { sel: x, btn: btn, list: list, wrap: wrap };
      x._sync = function () {
        var o = x.options[x.selectedIndex];
        btn.textContent = o ? o.textContent : '';
        btn.classList.toggle('is-set', !!x.value);
      };
      function items() { return [].slice.call(list.querySelectorAll('[role="option"]')); }
      function build() {
        list.innerHTML = '';
        [].slice.call(x.options).forEach(function (o, i) {
          var li = document.createElement('li');
          li.setAttribute('role', 'option'); li.id = list.id + '-' + i; li.tabIndex = -1;
          li.textContent = o.textContent; li.setAttribute('data-v', o.value);
          li.setAttribute('aria-selected', o.value === x.value ? 'true' : 'false');
          if (o.disabled) li.setAttribute('aria-disabled', 'true');
          list.appendChild(li);
        });
      }
      function pick(li) {
        if (!li || li.getAttribute('aria-disabled') === 'true') return;
        var v = li.getAttribute('data-v');
        closeDrop(true);
        if (x.value !== v) { x.value = v; x.dispatchEvent(new Event('change', { bubbles: true })); }
      }
      function move(from, dir) {
        var all = items().filter(function (li) { return li.getAttribute('aria-disabled') !== 'true'; });
        if (!all.length) return;
        var i = all.indexOf(from);
        var n = dir === 'first' ? all[0] : dir === 'last' ? all[all.length - 1]
          : all[Math.max(0, Math.min(all.length - 1, (i < 0 ? 0 : i + dir)))];
        n.focus({ preventScroll: true });
        n.scrollIntoView({ block: 'nearest' });
      }
      function open() {
        if (openDrop === d) return;
        closeDrop(false);
        build();
        list.hidden = false; wrap.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        openDrop = d;
        /* a lista a mező alatt nyílik; ha alul nem fér ki, az oldal annyit görget, hogy kiférjen */
        var r = btn.getBoundingClientRect();
        var want = Math.min(list.scrollHeight, 320);
        var room = innerHeight - r.bottom - 16;
        list.style.maxHeight = Math.max(180, Math.min(320, room > want ? want : Math.max(room, want))) + 'px';
        var lr = list.getBoundingClientRect();
        var over = lr.bottom - (innerHeight - 12);
        if (over > 0) {
          if (window.__lenis) window.__lenis.scrollTo(scrollY + over, { immediate: true, force: true });
          else scrollBy(0, over);
        }
        var cur = list.querySelector('[aria-selected="true"]') || items()[0];
        if (cur) { cur.focus({ preventScroll: true }); cur.scrollIntoView({ block: 'nearest' }); }
      }
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (openDrop === d) closeDrop(true); else open();
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); }
      });
      list.addEventListener('click', function (e) {
        var li = e.target.closest('[role="option"]');
        if (li) { e.preventDefault(); pick(li); }
      });
      list.addEventListener('keydown', function (e) {
        var li = document.activeElement && document.activeElement.closest('[role="option"]');
        if (e.key === 'ArrowDown') { e.preventDefault(); move(li, 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(li, -1); }
        else if (e.key === 'Home') { e.preventDefault(); move(li, 'first'); }
        else if (e.key === 'End') { e.preventDefault(); move(li, 'last'); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(li); }
        else if (e.key === 'Escape') { e.preventDefault(); closeDrop(true); }
        else if (e.key === 'Tab') closeDrop(false);
      });
      /* a címkére kattintás a saját gombot nyissa, ne a rejtett selectet fókuszálja */
      var lbl = wrap.closest('label');
      if (lbl) lbl.addEventListener('click', function (e) {
        if (!wrap.contains(e.target)) { e.preventDefault(); btn.focus(); open(); }
      });
      x._sync();
    });
    document.addEventListener('pointerdown', function (e) {
      if (openDrop && !openDrop.wrap.contains(e.target)) closeDrop(false);
    });
    addEventListener('resize', function () { closeDrop(false); });
    clears.forEach(function (b) {
      b.addEventListener('click', function () {
        cat = 'all';
        sels.forEach(function (x) { x.value = ''; });
        apply(true);
        if (chips[0]) chips[0].focus();
      });
    });
    /* oldalon belüli szűrő-linkek (szakterületi bontás) */
    [].slice.call(document.querySelectorAll('a[href^="#szakterulet="]')).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        history.replaceState(null, '', a.getAttribute('href'));
        fromHash(); apply(false); toList();
      });
    });
    if (fromHash()) {
      apply(false);
      syncMore();
      setTimeout(toList, 350);
    } else apply(false);
    addEventListener('hashchange', function () {
      if (fromHash()) { apply(false); syncMore(); toList(); }
    });
  }

  /* ---------- 5/c. FEJEZET-JELÖLŐ a ragadó indexen (GSAP-mentes) ---------- */
  var chapNav = document.querySelector('.chapx__nav');
  if (chapNav) {
    var links = [].slice.call(chapNav.querySelectorAll('a[href^="#"]'));
    var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var markRAF = 0;
    function mark() {
      markRAF = 0;
      var best = -1, bestTop = -Infinity;
      for (var i = 0; i < targets.length; i++) {
        if (!targets[i]) continue;
        var t = targets[i].getBoundingClientRect().top - innerHeight * 0.32;
        if (t <= 0 && t > bestTop) { bestTop = t; best = i; }
      }
      if (best < 0) best = 0;
      for (var j = 0; j < links.length; j++) links[j].classList.toggle('on', j === best);
    }
    addEventListener('scroll', function () { if (!markRAF) markRAF = requestAnimationFrame(mark); }, { passive: true });
    addEventListener('resize', function () { if (!markRAF) markRAF = requestAnimationFrame(mark); }, { passive: true });
    mark();
    setTimeout(mark, 600);
  }

  /* ---------- 6. LENIS (self-rAF, NEM gsap.ticker) ---------- */
  if (!reduce && typeof Lenis !== 'undefined') {
    var lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true, syncTouch: false
    });
    window.__lenis = lenis;
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })();
    lenis.on('scroll', function () {
      if (window.ScrollTrigger) ScrollTrigger.update();
    });
  }

  /* ---------- 7. GSAP: kizárólag degradálható extra ---------- */
  if (typeof gsap !== 'undefined' && !reduce) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    document.querySelectorAll('[data-par]').forEach(function (el) {
      var amt = parseFloat(el.dataset.par) || 0.1;
      gsap.to(el, {
        yPercent: amt * 100, ease: 'none',
        scrollTrigger: { trigger: el.closest('section,header,figure') || el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* vízszintes folyosó: pin + eltolás, natív fallbackkel */
    document.querySelectorAll('[data-corridor]').forEach(function (host) {
      var track = host.querySelector('[data-corridor-track]');
      if (!track) return;
      if (matchMedia('(max-width:900px)').matches) return;
      if (track.scrollWidth <= innerWidth) return;
      /* horgony-ugrás (#csarnok) vízszintesen elgörgetheti a konténert, mielőtt
         a GSAP ráteszi a saját x transzformot: nullázni kell, különben eltolódnak a panelek */
      host.scrollLeft = 0;
      host.style.overflow = 'hidden';
      gsap.to(track, {
        x: function () { return -(track.scrollWidth - innerWidth + 40); }, ease: 'none',
        scrollTrigger: {
          trigger: host, start: 'top top',
          end: function () { return '+=' + (track.scrollWidth - innerWidth + 40); },
          pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1
        }
      });
    });

    /* idle-refresh: SOHA nem görgetés közben */
    var lastScrollT = 0, tries = 0;
    addEventListener('scroll', function () { lastScrollT = performance.now(); }, { passive: true });
    function idleRefresh() {
      if (tries++ > 40) return;
      if (performance.now() - lastScrollT > 600) ScrollTrigger.refresh();
      else setTimeout(idleRefresh, 500);
    }
    addEventListener('load', function () { setTimeout(idleRefresh, 700); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(idleRefresh, 250); });
    document.querySelectorAll('img').forEach(function (im) {
      if (!im.complete) im.addEventListener('load', function () { setTimeout(idleRefresh, 200); }, { once: true });
    });
  }
})();
