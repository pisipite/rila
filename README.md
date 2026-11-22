# Rila völgye

Statikus turisztikai katalógus magyar, angol és bolgár felülettel. A megjelenés az 1980-as évek nyomtatott turistatérképeit idézi. A lista és a Leaflet térkép ugyanazt a keresőkifejezést, kategóriát, helyszínt és típust használja. A kereső a címben, a leírásban, a kategóriában, a helyszínben és a megadott kulcsszavakban is keres.

## Helyi előnézet

A projektmappában indítsd el a helyi HTTP-szervert.

```powershell
python -m http.server 8766 --bind 127.0.0.1
```

- [Élő katalógus](http://127.0.0.1:8766/) a közzétett táblázat adataival.
- [Mintanézet](http://127.0.0.1:8766/?demo=1) három ponttal és egy szemléltető vonallal. A mintanézet adatai a `data/demo.csv` fájlban vannak.

## Google Sheets

Egy sor egy látnivaló vagy útvonal. A katalógus megnyitáskor a közzétett CSV-t olvassa. A meglévő `elnevezés`, `leírás`, `kép`, `pozíció` és `kategória` oszlopok használhatók. Ha a táblázat címe változik, a `catalog.js` fájlban a `sheetUrl` értékét kell megadni.

| Oszlopok | Tartalom |
| --- | --- |
| `id` | Egyedi, állandó azonosító. Példa a `rilai-kolostor`. |
| `name_hu`, `name_en`, `name_bg` | Név nyelvenként. Az `elnevezés` a magyar név tartaléka. |
| `description_hu`, `description_en`, `description_bg` | Leírás nyelvenként. A `leírás` a magyar leírás tartaléka. |
| `category`, `category_hu`, `category_en`, `category_bg` | Közös kategóriakód és opcionális fordításai. Beépített kódok a `heritage`, `nature`, `village` és `hiking`. Egy új kategóriához adj meg közös kódot és feliratokat. |
| `locality`, `locality_hu`, `locality_en`, `locality_bg` | Közös helyszínnév vagy kód és a megjelenő fordítások. |
| `tags` | Kereséshez használt kulcsszavak, akár több nyelven. |
| `geometry_type` | `point` vagy `route`. Érvényes geometria esetén a típus a geometriából is meghatározható. |
| `lat`, `lng` | Pont szélessége és hosszúsága WGS84 szerinti tizedes fokban. |
| `pozíció` | Pont egy cellában, például `42.1271, 23.2207` vagy `42,1271; 23,2207`. GeoJSON is megadható itt. |
| `geojson_url`, `geojson` | GeoJSON-fájl URL-je vagy a teljes GeoJSON egy cellában. Útvonalhoz `LineString` vagy `MultiLineString`. |
| `image_url`, `kép` | Közvetlen kép-URL vagy a projektmappához viszonyított elérési út. |
| `image_alt_hu`, `image_alt_en`, `image_alt_bg` | A kép rövid szöveges leírása nyelvenként. |
| `image_author`, `image_source_url`, `image_license`, `image_license_url` | A fotó készítője, forrása és licencadatai. Ezek a bejegyzés részleteinél jelennek meg. |
| `website_url` | Hivatalos oldal vagy a bejegyzés adatforrása. |

Hiányzó fordítás esetén a katalógus a rendelkezésre álló magyar, angol vagy bolgár szöveget jeleníti meg ebben a sorrendben. Ha egy sorhoz hiányzik a geometria, a bejegyzés továbbra is megjelenik a listában.

A GeoJSON koordinátasorrendje `[hosszúság, szélesség]`. A projekt `data/` mappájába mentett útvonalra például `./data/turautvonal.geojson` hivatkozhat a táblázat. Külső fájlnál a szervernek engednie kell a böngészős CORS-hozzáférést. [Leaflet GeoJSON útmutató](https://leafletjs.com/examples/geojson/)

Túrákhoz később megéri felvenni a távot, a pozitív szintemelkedést, a becsült menetidőt és a nehézséget. Látnivalókhoz a nyitvatartás, a szezon, a belépődíj, a megközelítés és az akadálymentesség adhat alapot további szűrőkhöz. Az utolsó ellenőrzés dátuma mindkét típusnál segít naprakészen tartani az adatokat.

## Első push és GitHub Pages

Az első feltöltéshez nyiss PowerShellt a `pasztra-kornyeke` mappában. A `git init` itt önálló helyi repót hoz létre a weboldal fájljai számára.

```powershell
git init -b main
git add --all
git status --short
git commit -m "Rila völgye – első verzió"
git remote add origin https://github.com/pisipite/rila.git
git push -u origin main
```

A pushhoz a `pisipite/rila` repóhoz írási joggal rendelkező GitHub-fiókkal jelentkezz be, ha a Git kéri. A későbbi módosításokhoz a `git add --all`, `git commit` és `git push` lépéseket használd. [GitHub push útmutató](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github?platform=windows)

A feltöltést követően a GitHubon nyisd meg a **Settings → Pages** lapot. A **Source** mezőben válaszd a **Deploy from a branch** lehetőséget, az ágnál a **main**, a mappánál a **/(root)** értéket, majd mentsd. A közzététel után az oldal a [pisipite.github.io/rila](https://pisipite.github.io/rila/) címen lesz elérhető. [GitHub Pages dokumentáció](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Források

- A helyben tárolt Leaflet 1.9.4 licence az `assets/leaflet/LICENSE` fájlban található. Az alaptérkép OpenStreetMap. [OpenStreetMap csempehasználati feltételek](https://operations.osmfoundation.org/policies/tiles/)
- A borító és a térképre helyezett szintvonalak a Mapzen Terrain Tiles N42E023 domborzati raszteréből készültek, 50 méteres szintközzel. [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/), [az adatok forrásai és licencei](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)
- A mintaútvonalnál szereplő völgyfotó N10705013 munkája, CC BY-SA 4.0. A weboldal a megjelenítéskor vágja a képet. [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:%D0%94%D0%BE%D0%BB%D0%B8%D0%BD%D0%B0%D1%82%D0%B0_%D0%BD%D0%B0_%D0%A0%D0%B8%D0%BB%D1%81%D0%BA%D0%B0_%D1%80%D0%B5%D0%BA%D0%B0_%D0%B8_%D0%A0%D0%B8%D0%BB%D1%81%D0%BA%D0%B8_%D0%BC%D0%B0%D0%BD%D0%B0%D1%81%D1%82%D0%B8%D1%80;_%D0%BF%D0%BE%D0%B3%D0%BB%D0%B5%D0%B4_%D0%BE%D1%82_%D0%95%D0%BB%D0%B5%D0%BD%D0%B8_%D0%B2%D1%80%D1%8A%D1%85.jpg)
- A mintanézet kolostorfotója Kyle Taylor munkája, CC BY 2.0. [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Rila_Monastery_interior_view.jpg)
- A sztobi földpiramisokról készült fotó Bulpa munkája, CC BY-SA 4.0. [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:%D0%A1%D1%82%D0%BE%D0%B1%D1%81%D0%BA%D0%B8_%D0%BF%D0%B8%D1%80%D0%B0%D0%BC%D0%B8%D0%B4%D0%B8_%D0%BF%D0%B0%D0%BD%D0%BE%D1%80%D0%B0%D0%BC%D0%B0.jpg)
