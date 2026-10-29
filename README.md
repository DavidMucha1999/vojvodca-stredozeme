# Vojvodca Stredozeme

Strategická hra v prehliadači inšpirovaná Mount & Blade: Warband vo svete Pána prsteňov.

Autor a vývojár hry: **Dávid Mucha**

## Spustenie

Hra má dve verzie, ktoré zdieľajú rovnakú logiku (`js/data`, `js/sim`):

- **`phaser.html`** – hlavná verzia v hernom engine **Phaser 3**: ostrý obraz, dlaždicová mapa, animovaní vojaci, zvuky zo súborov a rozhranie v Phaseri. Phaser je v projekte (`vendor/phaser.min.js`), takže hra beží aj bez internetu.
- `index.html` – pôvodná verzia kreslená priamo na plátno.

Obe otvoríš dvojklikom, server ani inštalácia nie sú potrebné. Celú hru v jednom súbore vytvorí `python tools/build_single.py` (výsledok je v `dist/phaser-single.html`).

## Testy

```bash
npm test                          # simulácia bez prehliadača: 60+ dní hry, obliehanie, uloženie
python tests/phaser_test.py       # Phaser verzia: scény, okná v Phaseri, animácie, zvuky
python tests/real_phaser_test.py  # Phaser verzia: prejde hru a uloží snímky obrazovky do tests/screens/
python tests/browser_test.py      # pôvodná verzia (index.html)
```

Testy v prehliadači potrebujú `pip install playwright && playwright install chromium`. Spusti ich po každej väčšej zmene.

## Grafika, mapa a zvuky (priečinok `assets/`)

Všetky obrázky, mapa a zvuky sú obyčajné súbory, ktoré môžeš upraviť alebo nahradiť. Hra ich však nečíta priamo (prehliadač by ich pri otvorení dvojklikom nepustil), ale zo zbaleného súboru `js/engine/assets.js` a mapu z `js/data/map.js`. **Po každej zmene v `assets/` spusti `python tools/pack_assets.py`.**

```
assets/
  maps/stredozem.json    mapa pre editor Tiled: terén, lesy, hory, hrady, dediny, cesty
  maps/teren-tiled.png   zmenšené dlaždice terénu, iba na úpravu v Tiled
  textures/              nová grafika z generátora: terén, hory, vojaci, bojisko
  sprites/               tvoje vlastné obrázky; nahradia kreslené (mená podľa assets/templates/)
  templates/             šablóny všetkých kreslených obrázkov na prekreslenie
  audio/                 zvuky boja (sfx_<druh>_<n>.wav) a voliteľne hudba (music_*.ogg/mp3)
```

### Úprava mapy v editore Tiled

Otvor `assets/maps/stredozem.json` v [Tiled](https://www.mapeditor.org/). Vrstvy:

- **zem** – krajina (tráva, step, popol Mordoru, piesok, sneh, more), **lesy** – lesy a mŕtve stromy: maľuj dlaždicami.
- **hory** – body s vlastnosťami `druh` (snow, dark, doom), `velkost` a `variant`.
- **hrady**, **dediny**, **cesty** – polohy a vlastnosti (frakcia, ku ktorému hradu dedina patrí, odkiaľ kam vedie cesta).

Ulož mapu a spusti `python tools/pack_assets.py`.

### Výmena grafiky

- **Vojaci:** každý druh má dva pásy po 12 snímkach (`assets/textures/unit_<druh>.png` a `unit_<druh>_team.png`). Snímky: 0 státie, 1–4 chôdza, 5–7 útok, 8–11 pád; jedna snímka má 192 × 192 px, vojak je v strede a pozerá doprava. Tímová vrstva je biela a hra ju zafarbí farbou frakcie (tabard, štít, plášť, čaprák).
- **Hrady, dediny, zástavy a iné:** ulož obrázok s rovnakým menom ako šablóna z `assets/templates/` do `assets/sprites/`. Hra použije tvoj obrázok namiesto kresleného. Šablóny obnoví `python tools/export_templates.py`.
- **Terén a bojisko:** dlaždice `terrain.png` (8 × 5 dlaždíc po 90 px), hory `mtn_*.png`, zem bojiska `ground_*.png`, voda, hradby, stromy.

Generátor `python tools/generate_art.py` znovu vykreslí `assets/textures/` a terén mapy. **Pozor:** terén v mape prepíše; ak si ho upravil ručne, použi `python tools/generate_art.py --bez-terenu`.

### Zvuky a hudba

Zvuky boja sú v `assets/audio/` (`render_sfx.py` ich vie vytvoriť znova). Hra vyberá náhodný variant, mení výšku tónu a v bitke nastavuje hlasitosť a stereo podľa miesta. Ak pridáš `music_kraj`, `music_stred`, `music_mordor` alebo `music_bitka` (ogg/mp3), nahradia syntetickú hudbu v danej oblasti.

## Nástroje (`tools/`)

| Nástroj | Čo robí |
|---|---|
| `pack_assets.py` | zbalí mapu, obrázky a zvuky pre hru (spusti po každej zmene v `assets/`) |
| `generate_art.py` | vykreslí novú grafiku a terén (`art.js`, `art_world.js`, `art_build.js`) |
| `export_templates.py` | vytvorí šablóny kreslených obrázkov do `assets/templates/` |
| `export_map.py` | vytvorí mapu pre Tiled z dát hry (bežne netreba) |
| `render_sfx.py` | vyrenderuje zvuky boja do `assets/audio/` |
| `build_single.py` | zostaví celú hru do jedného HTML súboru v `dist/` |

## Štruktúra kódu

Skripty sa načítavajú v poradí uvedenom v `phaser.html` (resp. `index.html`) a zdieľajú globálny priestor premenných.

```
js/
  core/setup.js       plátno, rozmery sveta, globálny stav hry
  data/               čisté dáta: frakcie, hrady (map.js je generovaný z mapy), jednotky, výbava, príbeh, úspechy
  sim/                logika hry bez kreslenia: diplomacia, hrdina, armády, svet a AI, bitka, obliehanie, politika, príbeh, uloženie
  render/             pôvodné kreslenie na plátno (index.html; Phaser ho používa ako náhradnú grafiku)
  audio/sound.js      syntetické zvuky a hudba
  ui/                 herné menu ako HTML (v Phaser verzii ich prekresľuje UIScene)
  input.js            klávesnica a myš (pôvodná verzia)
  main.js             hlavná slučka pôvodnej verzie
  engine/             Phaser verzia
    art.js            grafika: textúry, zafarbovanie vojakov, vlastné obrázky, animácie
    assets.js         zbalené obrázky a zvuky (generuje pack_assets.py)
    audio.js          zvuky zo súborov, priestorový zvuk v bitke
    game.js           spustenie Phaseru (rozlíšenie 1440 × 960)
    scenes/
      BootScene.js    načítanie textúr, obrázkov, zvukov a písma
      IntroScene.js   úvodná obrazovka
      MapScene.js     mapa: dlaždicový terén, voda, cesty, hory, hrady, dediny, armády, minimapa
      BattleScene.js  bitka: bojisko z textúr, animovaní vojaci, zástavy, šípy, obliehanie, častice
      UIScene.js      rozhranie v Phaseri: lišta, tlačidlá, okná, popisky, legenda, počasie
vendor/phaser.min.js  Phaser 3.80.1
```

### Ako funguje Phaser verzia

Simulácia (`js/sim`) je rovnaká pre obe verzie. Scény ju volajú (`updMap`, `updBattle`) a iba zobrazujú jej stav:

```
BootScene → IntroScene → MapScene ⇄ BattleScene
                 UIScene beží stále navrchu
```

Menu sú stále napísané v `js/ui` ako HTML (funkcie `show`/`btn`). UIScene ich „zrkadlí“: prečíta okno, nakreslí ho v Phaseri a kliknutie prepošle pôvodnému tlačidlu. V HTML ostali len okná s formulármi a obrázkami: úvod, korunovácia a encyklopédia.

## Skratky v kóde

| Skratka | Význam |
|---|---|
| `G` | hráč a stav hry (zlato, vojsko, výbava, sláva…) |
| `E` | armády veliteľov na mape |
| `TW`, `VL` | hrady a dediny |
| `U`, `LB` | jednotky v bitke a aktuálny súper |
| `FN`, `FC`, `BF`, `EC` | názvy, farby, farby zástav a erbov frakcií |
| `WR`, `AL`, `REL` | vojny, spojenectvá a vzťahy medzi frakciami |
| `FU`, `FK`, `SH` | elitné jednotky, jednotky frakcií, výbava |
| `QS`, `CP`, `SGB` | kapitoly príbehu, ciele ťažení, stav obliehania |
| `RES`, `BZ` | rozlíšenie plátna (2×) a priblíženie kamery v bitke |
