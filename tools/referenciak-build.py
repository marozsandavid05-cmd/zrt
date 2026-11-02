"""Referenciák oldal építése Csaba táblázatából.

A _forras/referenciak-csaba-*.xlsx (legújabb) 1. lapját olvassa, és a referenciak.html
REF:* jelölők közötti részeit írja újra: fej-szöveg, szűrők, a projektlista statikus
HTML-ként, a szakterületi bontás és a JSON-LD projektlista. A szűrés JS nélkül is
olvasható listát kap, a szűrők csak JS alatt jelennek meg.

Futtatás a projekt gyökeréből:
  python tools/fb-elonezet.py     (csak ha új Facebook-album jött, letölti az előnézetet)
  python tools/referenciak-build.py
Kell hozzá: openpyxl.
"""
import html, json, re, sys, unicodedata, pathlib
from collections import Counter, OrderedDict
import openpyxl

sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = ROOT / "referenciak.html"
FB = json.loads((ROOT / "tools" / "fb-elonezet.json").read_text(encoding="utf-8"))

KATEGORIAK = OrderedDict([
    ("Generálkivitelezés", "general"),
    ("Társasházak és lakóépületek", "lakohaz"),
    ("Tetőtér-beépítés, ráépítés", "tetoter"),
    ("Homlokzat- és épületfelújítás", "homlokzat"),
    ("Szerkezetépítés", "szerkezet"),
    ("Ipari, kereskedelmi és sportlétesítmények", "ipari"),
    ("Projektmenedzsment és tervezés", "pm"),
    ("Műemléki munkák és kiemelt épületek", "muemlek"),
])

# Ha egy projekthez nincs saját fotó, a szakterület egy másik projektjének fotója áll az
# előnézetben, felirat nélkül (album-azonosító).
KAT_KEP = {
    "general": "103492612339884", "lakohaz": "103516372337508", "tetoter": "606012888845375",
    "homlokzat": "242148581898476", "szerkezet": "241802765266391", "ipari": "103513619004450",
    "pm": "103532975669181", "muemlek": "242729281840406",
}

# Ugyanaz a projekt két néven: a második név az elsőbe olvad.
OSSZEVON = {"Puskás Ferenc Stadion": "Puskás Ferenc Stadion \u2013 szerkezetépítési- és falazási részmunkák"}

# Nyilvánvaló elírások javítása (a tartalom nem változik).
JAVIT = [
    ("feltlöltött", "feltöltött"), ("groutiong", "grouting"), ("oranizálási", "organizálási"),
    ("rendzserének", "rendszerének"), ("korszerűsíésének", "korszerűsítésének"),
    ("termlés", "termelés"), ("hűközpont", "hűtőközpont"), ("üzlethelység", "üzlethelyiség"),
    ("helységekkel", "helyiségekkel"), ("szervízek", "szervizek"), ("plattform", "platform"),
    ("többszázéves", "több száz éves"), ("omladozó - néhol", "omladozó, néhol"),
    ("gyógyfürdő kp a szomszédságban,m ", "gyógyfürdőközpont a szomszédságban, "),
    ("részére,speciális", "részére, speciális"), ("250m2", "250 m²"), ("14m ", "14 m "),
    ("7m ", "7 m "), ("alátámasztás nélküli,látszó", "alátámasztás nélküli, látszó"),
]

# Projektnév: gondolatjel helyett középpont, aláhúzás helyett olvasható tagolás.
NEV = {
    "Veresegyház_Sportföld u_30 lakásos": "Veresegyház, Sportföld u., 30 lakásos",
    "Homoktövis Lakópark_24+12+3x9 lakás": "Homoktövis Lakópark, 24 + 12 + 3 × 9 lakás",
    "Bagaria u_51lakásos+9 lakásos sorház": "Bagaria u., 51 lakásos + 9 lakásos sorház",
    "Szív u_31 lakásos": "Szív u., 31 lakásos",
    "Élessarok_100 lakásos": "Élessarok, 100 lakásos",
    "villaépület Turista utca": "Villaépület, Turista utca",
    "400 szobás szálloda wellnessel, 3 étteremmel, TV-s konferenciateremmel,  államfői fogadó szárnnyal, védelmi útvonalakkal ASTANA":
        "400 szobás szálloda wellnessel, 3 étteremmel, TV-s konferenciateremmel, államfői fogadó szárnnyal, védelmi útvonalakkal · Astana",
}

# Keresőkulcsok egységesítése (alsó index: oszlop). None = kimarad.
KULCS_MAP = {
    "funkcio": {"wellnes-fitness": "wellness és fitness", "fitness vendéglátás": "fitness, vendéglátás",
                "fitness": "wellness és fitness", "spa": "wellness és fitness",
                "vendéglátó": "vendéglátás", "iroda": "irodaépület"},
    "beepites": {"szabadonálló": "szabadon álló", "zártsorú foghíjbeépítés": "zártsorú, foghíjbeépítés"},
    "terulet": {"tetőtér beépítés, ráépítés": "tetőtér-beépítés és ráépítés"},
    "vedettseg": {},
    "munka": {"homloklzat": "homlokzat", "mélyéptés": "mélyépítés", "proj. man.": "projektmenedzsment",
              "vb. szerkezet": "vasbeton szerkezet", "h-m burkolás": "hideg-meleg burkolás",
              "generál mv.": "generál"},
    "tipus": {},
}
KULCSOK = [  # (kulcs, oszlop, címke a szűrőn)
    ("funkcio", 3, "Funkció"), ("beepites", 4, "Beépítési mód"), ("terulet", 5, "Terület jellege"),
    ("vedettseg", 6, "Védettség"), ("munka", 7, "Munka jellege"), ("tipus", 8, "Jelleg"),
]
NEM_BONTHATO = {"tetőtér-beépítés és ráépítés"}


def slug(s):
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def esc(s):
    return html.escape(s, quote=True)


def javit(s):
    for a, b in JAVIT:
        s = s.replace(a, b)
    return s


def kulcs_ertekek(kulcs, nyers):
    if nyers is None or not str(nyers).strip():
        return []
    s = str(nyers).strip()
    m = KULCS_MAP[kulcs]
    if s in m:
        s = m[s]
    if s in NEM_BONTHATO and kulcs == "terulet":
        return [s]
    out = []
    for part in re.split(r"\n|,\s*", s):
        part = part.strip()
        if not part:
            continue
        part = m.get(part, part)
        for p in re.split(r",\s*", part):
            p = m.get(p.strip(), p.strip())
            if p and p not in out:
                out.append(p)
    return out


def forras():
    files = sorted((ROOT / "_forras").glob("referenciak-csaba-*.xlsx"))
    if not files:
        sys.exit("Nincs forrás-táblázat a _forras mappában.")
    return files[-1]


def beolvas():
    ws = openpyxl.load_workbook(forras()).worksheets[0]
    projektek = OrderedDict()
    kat = None
    for row in ws.iter_rows(min_row=3):
        v = [c.value for c in row]
        if v[1] and str(v[1]).strip():
            kat = str(v[1]).strip()
        if not v[2] or not str(v[2]).strip():
            continue
        if kat not in KATEGORIAK:
            sys.exit(f"Ismeretlen kategória: {kat!r}")
        nyers_nev = re.sub(r"\s+", " ", str(v[2])).strip()
        nyers_nev = OSSZEVON.get(nyers_nev, nyers_nev)
        kulcs_nev = nyers_nev.lower()
        p = projektek.get(kulcs_nev)
        if p is None:
            nev = NEV.get(str(v[2]).strip(), NEV.get(nyers_nev, nyers_nev))
            nev = javit(nev).replace(" \u2013 ", " · ").replace("\u2013", "·")
            p = {"nev": nev, "kat": [], "kulcs": {k: [] for k, _, _ in KULCSOK},
                 "kihivas": None, "link": None, "album": None}
            projektek[kulcs_nev] = p
        if KATEGORIAK[kat] not in p["kat"]:
            p["kat"].append(KATEGORIAK[kat])
        for k, col, _ in KULCSOK:
            for e in kulcs_ertekek(k, v[col]):
                if e not in p["kulcs"][k]:
                    p["kulcs"][k].append(e)
        if v[12] and str(v[12]).strip() and not p["kihivas"]:
            p["kihivas"] = javit(str(v[12]).strip())
        n = v[13]
        if isinstance(n, str) and "facebook.com/media/set" in n and not p["link"]:
            p["link"] = n.strip()
            p["album"] = re.search(r"set=a\.(\d+)", n).group(1)
    return list(projektek.values())


def nagybetu(s):
    return s[:1].upper() + s[1:] if s else s


def tagol(s):
    """Vesszővel elválasztott felsorolás, a zárójelen belüli vesszőt nem bontja."""
    out, buf, d = [], "", 0
    i = 0
    while i < len(s):
        c = s[i]
        if c == "(":
            d += 1
        elif c == ")":
            d -= 1
        if c == "," and d == 0 and s[i + 1:i + 2] == " ":
            out.append(buf.strip())
            buf = ""
            i += 2
            continue
        buf += c
        i += 1
    if buf.strip():
        out.append(buf.strip())
    return out


def kihivas_html(s):
    if not s:
        return ""
    sorok = [x.strip() for x in s.split("\n") if x.strip()]
    lista = [x[1:].strip() for x in sorok if x.startswith("-")]
    szoveg = " ".join(x for x in sorok if not x.startswith("-"))
    szoveg = nagybetu(szoveg)
    nyito = '<div class="ref__k"><p class="lab ref__kl">Kihívás</p>'
    if lista:
        fej = szoveg
        return (nyito + f'<p class="ref__kx">{esc(fej)}</p>'
                + '<details class="ref__more"><summary>További részletek</summary><ul>'
                + "".join(f"<li>{esc(x)}</li>" for x in lista) + "</ul></details></div>")
    if len(szoveg) <= 170:
        return nyito + f'<p class="ref__kx">{esc(szoveg)}</p></div>'
    reszek = tagol(szoveg)
    elol, hossz = [], 0
    for r in reszek:
        if elol and hossz + len(r) > 110:
            break
        elol.append(r)
        hossz += len(r) + 2
    hatul = reszek[len(elol):]
    if not hatul:
        return nyito + f'<p class="ref__kx">{esc(szoveg)}</p></div>'
    return (nyito + f'<p class="ref__kx">{esc(", ".join(elol))},</p>'
            + '<details class="ref__more"><summary>További részletek</summary>'
            + f'<p>{esc(", ".join(hatul))}</p></details></div>')


def kep(album):
    r = FB.get(album or "", {})
    return r if r.get("fajl") else None


def build():
    P = beolvas()
    nevek = {v: k for k, v in KATEGORIAK.items()}
    n = len(P)

    # előnézeti képek (egyedi lista a dokkolt keretbe)
    kepek = []
    for p in P:
        r = kep(p["album"])
        if r:
            p["peek"], p["cap"], p["sajat"] = r["fajl"], p["nev"] + (" · látványterv" if r.get("latvanyterv") else ""), r
        else:
            f = kep(KAT_KEP[p["kat"][0]])
            p["peek"], p["cap"], p["sajat"] = f["fajl"], "", None
        if p["peek"] not in kepek:
            kepek.append(p["peek"])

    sorok = []
    for i, p in enumerate(P, 1):
        attrs = [f'data-cat="{" ".join(p["kat"])}"']
        for k, _, _ in KULCSOK:
            attrs.append(f'data-{k}="{" ".join(slug(x) for x in p["kulcs"][k])}"')
        attrs.append(f'data-peek="{p["peek"]}" data-peekcap="{esc(p["cap"])}"')
        katok = " · ".join(nevek[c] for c in p["kat"])
        kul = [x for k, _, _ in KULCSOK for x in p["kulcs"][k]]
        kul_html = "".join(f"<li>{esc(x)}</li>" for x in OrderedDict.fromkeys(kul))
        oldal = ""
        if p["sajat"]:
            r = p["sajat"]
            alt = p["nev"] + (", látványterv" if r.get("latvanyterv") else ", fotó a helyszínről")
            img = (f'<img class="ref__img" src="{r["kis"]}" width="96" height="{round(96 * r["h"] / r["w"])}" '
                   f'alt="{esc(alt)}" loading="lazy" decoding="async">')
            # a kis kép is az albumra visz; billentyűvel a cím-link éri el, ezért ez nem kap fókuszt
            oldal += (f'<a class="ref__imgl" href="{esc(p["link"])}" target="_blank" rel="noopener" '
                      f'tabindex="-1" aria-hidden="true">{img}</a>' if p["link"] else img)
        if p["link"]:
            oldal += (f'<a class="ref__fb" href="{esc(p["link"])}" target="_blank" rel="noopener" '
                      f'aria-label="Fotók a Facebookon: {esc(p["nev"])} (új lapon nyílik)">Fotók a Facebookon<i aria-hidden="true">&#8599;</i></a>')
        sorok.append(
            f'    <article class="ref" data-ref {" ".join(attrs)} data-in>\n'
            f'      <span class="ref__n">{i:02d}</span>\n'
            f'      <div class="ref__b">\n'
            f'        <p class="lab ref__cat">{esc(katok)}</p>\n'
            + (f'        <h3 class="ref__t"><a class="ref__tl" href="{esc(p["link"])}" target="_blank" rel="noopener">'
               f'{esc(p["nev"])}<span class="sr-only"> (fotók a Facebookon, új lapon nyílik)</span></a></h3>\n'
               if p["link"] else f'        <h3 class="ref__t">{esc(p["nev"])}</h3>\n')
            + f'        <ul class="ref__keys" aria-label="Jellemzők">{kul_html}</ul>\n'
            + (f'        {kihivas_html(p["kihivas"])}\n' if p["kihivas"] else "")
            + f'      </div>\n'
            + (f'      <div class="ref__s">{oldal}</div>\n' if oldal else "")
            + '    </article>')

    elso = P[0]
    dm = next((r for r in FB.values() if r.get("fajl") == elso["peek"]), {})
    dock = [f'      <img src="{elso["peek"]}" width="{dm.get("w", 880)}" height="{dm.get("h", 660)}" '
            f'alt="" class="on" decoding="async">']
    lista = (
        '  <div class="refs">\n' + "\n\n".join(sorok)
        + '\n  <p class="ref-empty" data-empty hidden>Ehhez a szűréshez nincs projekt a listában. '
        '<button type="button" class="ref-empty__b" data-clear>Szűrők törlése</button></p>\n  </div>')
    nezet = (
        '  <aside class="idxview" aria-hidden="true">\n    <div class="idxview__frame">\n'
        + "\n".join(dock) + '\n    </div>\n'
        f'    <p class="lab idxview__cap"><span data-cap>{esc(elso["cap"])}</span><span class="lab--ok">Előnézet</span></p>\n'
        '  </aside>')

    # szűrők
    chips = ['    <button type="button" class="chip on" data-filter="all" aria-pressed="true">Mind</button>']
    for nev, s in KATEGORIAK.items():
        chips.append(f'    <button type="button" class="chip" data-filter="{s}" aria-pressed="false">{esc(nev)}</button>')
    selek = []
    for k, _, cim in KULCSOK:
        cnt = Counter(x for p in P for x in p["kulcs"][k])
        opts = "".join(f'<option value="{slug(x)}">{esc(x)}</option>' for x, _ in sorted(cnt.items(), key=lambda t: (-t[1], t[0])))
        selek.append(
            f'    <label class="rsel"><span class="lab">{cim}</span>'
            f'<span class="rsel__w"><select data-key="{k}"><option value="">Mind</option>{opts}</select></span></label>')
    szuro = (
        '<div class="rfilt" data-rf>\n'
        '  <div class="filt" role="group" aria-label="Szakterület">\n    <span class="lab filt__lab">Szakterület</span>\n'
        + "\n".join(chips) + '\n  </div>\n'
        '  <details class="rmore" open data-rmore>\n'
        '    <summary class="rmore__s">Részletes szűrés<span class="rmore__n" data-rmore-n></span></summary>\n'
        '  <div class="rsels">\n' + "\n".join(selek) + '\n  </div>\n  </details>\n</div>')

    # fej
    fej = (f'  <p class="phero__x" data-in data-d="1">{n} projekt nyolc szakterületen, a generálkivitelezéstől '
           'a műemléki munkákig. Mindegyiknél leírtuk, mi volt a munka nehézsége, és ahol van, a fotók a '
           'Facebook-albumban nézhetők meg.</p>')
    szam = f'<span data-count>{n}</span> projekt'

    # bontás
    tsor = []
    for nev, s in KATEGORIAK.items():
        bent = [p for p in P if s in p["kat"]]
        top = [x for x, _ in Counter(x for p in bent for x in p["kulcs"]["munka"]).most_common(3)]
        tsor.append(f'            <tr><th scope="row"><a href="#szakterulet={s}">{esc(nev)}</a></th>\n'
                    f'              <td class="num">{len(bent)} <b>projekt</b></td><td class="lab">{esc(", ".join(top))}</td></tr>')
    bontas = (
        '        <table class="dat" data-in>\n'
        f'          <caption class="lab">Projektek szakterületenként · {n} projekt</caption>\n'
        '          <thead>\n            <tr><th scope="col">Szakterület</th><th scope="col">Tétel</th><th scope="col">Jellemző munka</th></tr>\n'
        '          </thead>\n          <tbody>\n' + "\n".join(tsor) + '\n          </tbody>\n        </table>')

    ld = {"@context": "https://schema.org", "@type": "ItemList",
          "@id": "https://vacteam.hu/referenciak#projektek", "name": "A VAC-Team Építő Zrt. referenciái",
          "numberOfItems": n,
          "itemListElement": [dict({"@type": "ListItem", "position": i, "name": p["nev"]},
                                   **({"url": p["link"]} if p["link"] else {})) for i, p in enumerate(P, 1)]}
    ld_html = '<script type="application/ld+json">\n' + json.dumps(ld, ensure_ascii=False, indent=1) + '\n</script>'

    t = PAGE.read_text(encoding="utf-8")
    desc = (f"A VAC-Team Építő Zrt. {n} referenciája: társasház, tetőtér-beépítés, homlokzat-felújítás, "
            "szerkezetépítés és műemlék, a munka nehézségével.")
    t = re.sub(r'(<meta name="description" content=")[^"]*(")',
               lambda m: m.group(1) + desc + m.group(2), t)
    t = re.sub(r'("@id": "https://vacteam.hu/referenciak#oldal",[\s\S]*?"description": ")[^"]*(")',
               lambda m: m.group(1) + desc + m.group(2), t, count=1)
    for jel, tart in [("FEJ", fej), ("SZAM", szam), ("SZURO", szuro), ("LISTA", lista), ("NEZET", nezet),
                      ("BONTAS", bontas), ("LD", ld_html)]:
        rx = re.compile(rf"(<!-- REF:{jel}:start -->)(.*?)(<!-- REF:{jel}:end -->)", re.S)
        if not rx.search(t):
            sys.exit(f"Hiányzik a REF:{jel} jelölő a referenciak.html-ből")
        t = rx.sub(lambda m: m.group(1) + "\n" + tart + "\n" + m.group(3), t)
    PAGE.write_text(t, encoding="utf-8", newline="\n")
    tobbi_oldal(P)

    print(f"{n} projekt, {sum(1 for p in P if p['link'])} Facebook-link, "
          f"{sum(1 for p in P if p['sajat'])} saját előnézet, {len(kepek)} kép a keretben")
    for p in P:
        if not p["sajat"]:
            print("  saját kép nélkül:", p["nev"])


def tobbi_oldal(P):
    """A főoldal, a foghíj és a műemlék oldal referencia-blokkja ugyanebből az adatból."""
    n = len(P)
    fog = [p for p in P if "foghíjbeépítés" in p["kulcs"]["beepites"]]
    tet = [p for p in P if "tetoter" in p["kat"]]
    mue = [p for p in P if "muemlek" in p["kat"]]
    hom = [p for p in P if "homlokzat" in p["kat"]]
    tel = '<a href="tel:+36704037217">Telefon<b>+36 70 403 7217</b></a>'
    blokkok = {
        "index.html": (
            f"{n} projekt nyolc szakterületen, a generálkivitelezéstől a műemléki munkákig. "
            "Mindegyiknél leírtuk, mi volt a munka nehézsége.",
            '<a href="referenciak#lista">A referenciák listája</a>' + tel),
        "foghij.html": (
            f"A referenciák között {len(fog)} foghíjbeépítés és {len(tet)} tetőtér-beépítés, ráépítés "
            "szerepel, mindegyiknél leírtuk, mi volt a munka nehézsége.",
            '<a href="referenciak#beepites=foghijbeepites">Foghíjbeépítések</a>'
            '<a href="referenciak#szakterulet=tetoter">Tetőtér-beépítések, ráépítések</a>'),
        "muemlek.html": (
            f"A referenciák között {len(mue)} műemléki munka és kiemelt épület, valamint {len(hom)} homlokzat- "
            "és épületfelújítás szerepel, mindegyiknél leírtuk, mi volt a munka nehézsége.",
            '<a href="referenciak#szakterulet=muemlek">Műemléki munkák</a>'
            '<a href="referenciak#szakterulet=homlokzat">Homlokzat-felújítások</a>'),
    }
    for fajl, (szoveg, utak) in blokkok.items():
        f = ROOT / fajl
        t = f.read_text(encoding="utf-8")
        tart = (f'    <p class="lab lab--ok">Referenciák</p>\n    <div>\n'
                f'      <p class="soon__t">{esc(szoveg)}</p>\n'
                f'      <p class="soon__ways">{utak}</p>\n    </div>')
        rx = re.compile(r"(<!-- REF:BLOKK:start -->)(.*?)(<!-- REF:BLOKK:end -->)", re.S)
        if not rx.search(t):
            sys.exit(f"Hiányzik a REF:BLOKK jelölő: {fajl}")
        t = rx.sub(lambda m: m.group(1) + "\n" + tart + "\n" + m.group(3), t)
        f.write_text(t, encoding="utf-8", newline="\n")

    llms = ROOT / "llms.txt"
    t = llms.read_text(encoding="utf-8")
    sor = (f"- [Referenciák](https://vacteam.hu/referenciak): {n} projekt nyolc szakterületen, "
           "a munka nehézségével és a Facebook-albumok linkjével")
    if re.search(r"^- \[Referenciák\]", t, flags=re.M):
        t = re.sub(r"^- \[Referenciák\].*$", sor, t, flags=re.M)
    else:
        t = re.sub(r"^(- \[Számok\])", sor + "\n" + r"\1", t, count=1, flags=re.M)
    t = t.replace("A referencia-adatlapokat most állítjuk össze. Kérdés esetén telefonon (+36 70 403 7217) "
                  "vagy a kapcsolati űrlapon érhetők el.",
                  "Kérdés esetén a cég telefonon (+36 70 403 7217) vagy a kapcsolati űrlapon érhető el.")
    llms.write_text(t, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    build()
