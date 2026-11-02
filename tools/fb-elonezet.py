"""Facebook-album előnézeti képek a referencialistához.

Minden albumhoz egy kiválasztott fotó (VALASZTAS: album-azonosító -> fotó-fájlnév) kerül
a media/referenciak/ mappába két méretben: fb-<album>.webp (legfeljebb 880 px széles, az
oldalon legfeljebb 440 CSS px-en látszik) és fb-<album>-k.webp (192 px, mobil bélyegkép).
Az eredmény listája: tools/fb-elonezet.json, ezt olvassa a referenciak-build.py.

Futtatás (a projekt gyökeréből):
  python tools/fb-elonezet.py
Kell hozzá: openpyxl, Pillow. A forrás-táblázat: _forras/referenciak-csaba-*.xlsx (legújabb).
"""
import io, json, re, sys, time, html, pathlib, urllib.request
import openpyxl
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "media" / "referenciak"
LISTA = ROOT / "tools" / "fb-elonezet.json"

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")
HDR = {"User-Agent": UA, "Accept": "text/html,application/xhtml+xml",
       "Accept-Language": "hu-HU,hu;q=0.9", "Sec-Fetch-Mode": "navigate",
       "Sec-Fetch-Dest": "document", "Sec-Fetch-Site": "none"}

# látványterv (nem fotó): a felirat ezt jelzi
LATVANYTERV = {"103525652336580", "103508589004953", "103993218956490", "103532975669181"}
# album -> hányadik fotó (0-tól) az albumban (kontaktlapon átnézve). Újrafuttatáskor az
# előző futás fb-elonezet.json-jában rögzített fotó-fájlnév az erősebb, így egy új feltöltés
# nem tolja el a választást. Új album: első fotó.
SORSZAM = {
    "103492612339884": 1, "103516372337508": 2, "990148893765104": 2, "990099780436682": 2,
    "103491492339996": 0, "103500559005756": 3, "103501859005626": 1, "103509265671552": 1,
    "103515815670897": 1, "103519585670520": 2, "606012888845375": 0, "103517365670742": 3,
    "242148581898476": 2, "103512755671203": 2, "103521549003657": 0, "242391818540819": 0,
    "242729281840406": 2, "241802765266391": 2, "103524579003354": 2, "103528095669669": 1,
    "103513619004450": 0, "103514275671051": 2, "103525652336580": 0, "103508589004953": 0,
    "103993218956490": 0, "103532975669181": 0, "103998258955986": 2,
}


def get(url, hdr=HDR):
    req = urllib.request.Request(url, headers=hdr)
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read()


def album_fotok(t):
    """Az album fotói sorrendben: fájlnév -> a legnagyobb elérhető változat URL-je."""
    cover = re.search(r'"cover_photo":\{"focus":\{[^}]*\},"photo":\{"id":"\d+","image":\{"uri":"([^"]+)"', t)
    cover_name = None
    if cover:
        m = re.search(r'/(\d+_\d+_\d+_n\.jpg)', cover.group(1).replace('\\/', '/'))
        cover_name = m.group(1) if m else None
    order, variants = [], {}
    for u in re.findall(r'https:\\?/\\?/scontent[^"\s]+', t):
        u2 = html.unescape(u.replace('\\/', '/'))
        if "/t39.30808-6/" not in u2:
            continue
        m = re.search(r'/(\d+_\d+_\d+_n\.jpg)', u2)
        if not m or m.group(1) == cover_name:
            continue
        k = m.group(1)
        if k not in variants:
            order.append(k)
        variants.setdefault(k, []).append(u2)

    def area(u):
        m = re.search(r'ctp=s(\d+)x(\d+)', u)
        return int(m.group(1)) * int(m.group(2)) if m else 0
    return order, {k: max(v, key=area) for k, v in variants.items()}


def forras():
    files = sorted((ROOT / "_forras").glob("referenciak-csaba-*.xlsx"))
    if not files:
        sys.exit("Nincs forrás-táblázat a _forras mappában.")
    return files[-1]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ws = openpyxl.load_workbook(forras()).worksheets[0]
    albumok = []
    for row in ws.iter_rows(min_row=3):
        n = row[13].value
        if isinstance(n, str) and "facebook.com/media/set" in n:
            aid = re.search(r"set=a\.(\d+)", n).group(1)
            if aid not in albumok:
                albumok.append(aid)
    elozo = json.loads(LISTA.read_text(encoding="utf-8")) if LISTA.exists() else {}
    eredmeny = {}
    for aid in albumok:
        url = f"https://www.facebook.com/media/set/?set=a.{aid}&type=3"
        rec = {}
        try:
            t = get(url).decode("utf-8", "ignore")
            order, best = album_fotok(t)
            if not order:
                raise RuntimeError("az album nem adott fotót")
            k = elozo.get(aid, {}).get("foto")
            if k not in best:
                i = SORSZAM.get(aid, 0)
                k = order[i] if i < len(order) else order[0]
            im = Image.open(io.BytesIO(get(best[k], {"User-Agent": UA, "Referer": "https://www.facebook.com/"}))).convert("RGB")
            w0, h0 = im.size
            nagy = im.copy()
            if nagy.width > 880:
                nagy = nagy.resize((880, round(nagy.height * 880 / nagy.width)), Image.LANCZOS)
            nagy.save(OUT / f"fb-{aid}.webp", "WEBP", quality=80, method=6)
            kis = im.copy()
            kis.thumbnail((192, 192 * 4))
            kis.save(OUT / f"fb-{aid}-k.webp", "WEBP", quality=78, method=6)
            rec = {"fajl": f"media/referenciak/fb-{aid}.webp", "kis": f"media/referenciak/fb-{aid}-k.webp",
                   "w": nagy.width, "h": nagy.height, "eredeti": [w0, h0], "foto": k,
                   "latvanyterv": aid in LATVANYTERV}
        except Exception as e:
            rec = {"hiba": str(e)}
        eredmeny[aid] = rec
        print(aid, rec.get("fajl") or rec.get("hiba"))
        time.sleep(1.2)
    LISTA.write_text(json.dumps(eredmeny, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
