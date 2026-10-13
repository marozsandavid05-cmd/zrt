/* ==========================================================================
   VAC-TEAM „ARANYÓRA" — mozgásmotor
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
      t.classList.toggle('is-tall', need > innerHeight + 1);
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
        var track = s.el.closest('[data-rake-track]:not(.is-tall)');
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
     A kép egy ragadó keretben áll a lista mellett, sosem takar szöveget.
     Hover váltja a képet és a feliratot; az utolsó kép bent marad. */
  var dock = document.querySelector('.idxview__frame');
  if (dock && fine) {
    var dimgs = [].slice.call(dock.querySelectorAll('img'));
    var dcap = document.querySelector('.idxview__cap [data-cap]');
    [].slice.call(document.querySelectorAll('[data-peek]')).forEach(function (r) {
      r.addEventListener('mouseenter', function () {
        var src = r.getAttribute('data-peek');
        for (var i = 0; i < dimgs.length; i++) {
          dimgs[i].classList.toggle('on', dimgs[i].getAttribute('src') === src);
        }
        if (dcap) {
          var t = r.querySelector('.idx__t');
          if (t) dcap.textContent = t.textContent;
        }
      });
    });
  }

  /* ---------- 5/b. SZŰRŐ CHIPEK a referencialistán ----------
     Egy aktív chip; a sorok data-cat tagek alapján rejtődnek. A tételszámláló
     követi a szűrést. */
  var chips = [].slice.call(document.querySelectorAll('.chip[data-filter]'));
  if (chips.length) {
    var frows = [].slice.call(document.querySelectorAll('.idx__row[data-cat]'));
    var counter = document.querySelector('[data-count]');
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        chips.forEach(function (x) { x.classList.toggle('on', x === c); });
        var f = c.getAttribute('data-filter');
        var shown = 0;
        frows.forEach(function (r) {
          var ok = f === 'all' || (' ' + r.getAttribute('data-cat') + ' ').indexOf(' ' + f + ' ') !== -1;
          r.classList.toggle('is-hidden', !ok);
          /* a szűréssel előkerülő sor azonnal látsszon: a reveal különben csak
             a következő scroll-eventnél futna le, addig üresnek tűnne a lista */
          if (ok) { r.classList.add('on'); shown++; }
        });
        if (counter) counter.textContent = shown;
        /* a lista rövidülésével a viewportba ugró többi elem reveal-je is fusson le */
        pass();
      });
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
