# VAC-Team, koncepció 2: „ARANYÓRA"

Statikus, build-mentes, `file://`-ből dupla kattra nyíló oldal. Ez a MÁSODIK koncepció; az első (a `ZRT\` gyökérben) nem érte el az elvárásokat. Ez prémium ügynökségi pitch-szint.

## Miért ez a paletta (mérés, nem ízlés)

A cég saját fotóit kvantálva az árnyékuk `#1E1C1A`, vagyis **30 fokos meleg** tónus, és a képeken ott van a budapesti szecessziós okker `#AE762B` (telítettség ~60%). A koncepció 1 alapja `#15171A` volt, ami **210 fokos hideg** feketés, az accentje pedig `#E4B400` munkavédelmi sárga (telítettség 100%). A hideg alap és a meleg fotó a színkör két oldalán állt, ezért hatottak a képek beillesztett stocknak. Itt az alap a fotók saját árnyéka, az accent a fotókon már meglévő okker.

| Token | Érték | Szerep |
|---|---|---|
| `--kova` | `#1A1714` | meleg majdnem-fekete alap |
| `--vakolat` | `#EDE4D6` | világos „vakolat" világ |
| `--ink` / `--ink-2` | `#F2EADC` / `#B9AC9B` | szöveg, meleg másodlagos (SOHA nem semleges szürke) |
| `--okker` | `#AE762B` | az EGYETLEN accent |
| `--terrakotta` | `#BF8764` | vonal-kiegészítő |

Alfa-értékek előre kevert tokenek (`--line`, `--okker-a`), nem `opacity` a rétegen.

## Tipográfia

Zodiak (display, Fontshare) / Switzer (body, Fontshare) / Martian Mono (adat, Google). A koncepció 1 Archivo + IBM Plex párosa itt TILOS. A mono kizárólag címke, mértékegység és adat, sosem folyószöveg.

Szám-tipográfia: `.fig` a display arccal, könnyű súllyal (a félkövér szám hirdetésnek olvas, a könnyű jelentésnek). Az egység `.fig__unit` külön elem okker színnel, a közelítő jel `.fig__pre` megmarad (`~`, `+`). A `vertical-align` em-je a SAJÁT kis fontméretre vonatkozik, ezért kell rá nagy szorzó (1.5-2em).

## A signature: súrolófény

Két valódi fotó egymáson (`ba-homlokzat-elotte/utana`), a felső `mask-image` linear-gradientje görgetésre söpör végig, a söprés élén meleg fénysáv fut. `--sweep` custom property hajtja, natív JS-ből, rAF-lerp 0.14. **Az alapértelmezés `--sweep:100%`**, vagyis a KÉSZ homlokzat, így JS nélkül és reduced-motion alatt is komponált végállapot áll ott. A fénysáv a konténer tényleges szélességéhez igazodik (px), nem `vw`-hez.

## Kőbe vésett szabályok

1. **ZÉRÓ rajzolt SVG.** Nincs metszet, diagram, rajzolt térkép, kör, pecséttábla. Adat = tipográfia, hely = fotó, wow = fény és mozgás. (Ügyfél: „a kreatív nem azt jelenti hogy rajzolsz egy csúnya szar kört".)
2. **Nincs count-up.** A számokat szedjük, nem animáljuk. Az animált számláló crawlernek és reduced-motion alatt nullát mutat.
3. **A végállapot az alapértelmezés.** Minden rejtett kezdőállapot csak `.js` alatt él. Ha egy JS sor nem fut le, a tartalom akkor is látszik.
4. **Nav és lábléc mestere az `index.html`** a `CHROME:NAV` és `CHROME:FOOTER` markerek között. Módosítás után `node tools/sync-chrome.js`.
5. **Oldalanként MÁS szerkezet.** Vízszintes folyosó (mit-epitunk), sticky fejezet-index (hogyan-epitunk), fotótábla-ritmus (foghij), súrolófény-gerinc (muemlek), tipográfiai index kurzor-előnézettel (referenciak), dosszié-táblák (szamok), idővonal (rolunk), egy képernyős (kapcsolat). Ha két oldal egyformán néz ki szürkeárnyalatos képernyőképen, el van rontva.
6. **Magyar írásjelek:** gondolatjel (— –) tilos a szövegben. Kivétel a `&ndash;` évszám-tartományban a spec-táblákban. „foghíjbeépítés" egybeírva. Az árvíz éve **1838**.
7. **Copy-tilalmak:** „Apollo" szó, szuperlatívusz, lakossági regiszter („álmai otthona", „ingyenes árajánlat"), hamis budapesti székhely, „15+ év építőipari cégmúlt".
8. **Tapasztalat-keretezés:** a cég 2009-es, az építőipari profil 2023-tól (Antal-Köz Csaba vezérigazgató); a ~24 év szakmai múlt a vezetők személyéhez és cégelődeikhez kötődik. Ezt nyíltan kimondjuk, mert a beruházó úgyis cégadatot ellenőriz.
9. **`.lab` osztálynak `max-width:none` kell**, különben a `p{max-width:68ch}` tördeli a mono címkéket.
10. **Képek:** ingyenes stock + a cég FB-fotói. Az `fb-*.webp` csak 443px széles, kizárólag kicsiben (max 440px), sosem teljes szélességben.

## Stratégiai alap

A magyar felszámolások nagyjából negyede építőipari cég, ezért a beruházó egyetlen igazi félelme, hogy a kivitelező elvérzik menet közben. Kb. 40 hazai és nemzetközi kivitelező oldalát átnézve **senki nem közöl biztosítási limitet, kapacitás-számot, szerződéses értéket vagy teljes projekt-adatlapot**. Ez a piaci rés: az oldal előre kiteszi, amit a beruházó úgyis keresni fog, és odaadja a közhiteles nyilvántartások linkjeit.

## Cégadatok (karakterre)

VAC-Team Építő Zrt. · Cg. 13-10-042476 · adószám 14658022-2-13 · 2161 Csomád, Kossuth Lajos út 79. · +36 70 403 7217 · vacteamepitozrt@gmail.com · vezérigazgató Antal-Köz Csaba · 100 M Ft felelősségbiztosítás (kamarai minimum duplája) · ~2 Mrd Ft C.A.R. keret a Generalinál, 450/750/900 M Ft kötésekkel.

## QA

- `node tools/sync-chrome.js` minden nav/footer változás után.
- Headless screenshot 1440/768/375 szélességen, végiggörgetéssel (a reveal különben nem sül el).
- **Külön reduced-motion járat** (`reducedMotion:'reduce'`): minden elem látható, `--sweep:100%`.
- Kézi próba: `file:///C:/Users/szonj/OneDrive/Desktop/David/ZRT/weboldal 2/index.html`
