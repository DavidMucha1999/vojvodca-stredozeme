# Vojvodca Stredozeme

Strategická hra v prehliadači inšpirovaná Mount & Blade: Warband vo svete Pána prsteňov.

Autor a vývojár hry: **Dávid Mucha**

## Spustenie

Hra má dve verzie, ktoré zdieľajú rovnakú logiku (`js/data`, `js/sim`):

- `index.html` – pôvodná verzia kreslená priamo na plátno. Funguje aj bez internetu.
- `phaser.html` – nová verzia v hernom engine **Phaser 3** (kostra). Phaser sa načíta z CDN, preto potrebuje internet.

Obe otvoríš priamo v prehliadači, server ani inštalácia nie sú potrebné.

Ak chceš hru spúšťať cez lokálny server (odporúčané pri vývoji):

```bash
npm start          # spustí server na http://localhost:8080
```

## Testy

```bash
npm test                        # test simulácie bez prehliadača (Node.js)
python tests/browser_test.py    # test v skutočnom prehliadači (Playwright)
python tests/phaser_test.py     # test scén Phaser verzie (bez internetu, s náhradou Phaseru)
```

Test simulácie odohrá vyše 60 dní hry, obliehanie aj uloženie a načítanie a skontroluje, že sa nič nepokazilo. Spusti ho po každej väčšej zmene.

## Štruktúra projektu

Skripty sa načítavajú v poradí uvedenom v `index.html` a zdieľajú globálny priestor premenných. Poradie je dôležité: dáta, potom simulácia, vykresľovanie, zvuk, rozhranie a nakoniec `main.js`.

```
index.html            stránka hry a poradie skriptov
css/style.css         všetky štýly
js/
  core/setup.js       plátno, rozmery sveta, globálny stav hry
  data/               čisté dáta (bez logiky)
    factions.js       frakcie, farby, erby, panovníci, povahy
    castles.js        hrady a dediny
    units.js          elitné jednotky frakcií
    equipment.js      výbava u kováča
    story.js          kapitoly príbehu (dobro aj zlo)
    achievements.js   úspechy
  sim/                logika hry (bez kreslenia)
    diplomacy.js      vojny, spojenectvá, vzťahy
    hero.js           hodnosti a štatistiky hrdinu
    armies.js         velitelia, banditi, Nazgûli
    world.js          krok sveta, dni, AI, strategická AI, Prsteň, pauza a tábor
    battle.js         bitka a obliehanie hradieb
    siege.js          tábor obliehateľov
    politics.js       rada šľachticov
    story.js          plnenie kapitol
    achievements.js   udeľovanie úspechov
    game.js           nová hra, uloženie, načítanie
  render/             vykresľovanie na plátno
    terrain.js        generovanie mapy a bojiska
    heraldry.js       erby, zástavy, koruna
    map.js            mapa, hrady, dediny, armády, minimapa, legenda
    battle.js         bitka, hrad pri obliehaní, vojaci, efekty
    intro.js          animovaná úvodná scéna
    portraits.js      portréty veliteľov pre encyklopédiu
  audio/sound.js      zvuky a hudba (syntéza v prehliadači)
  ui/                 rozhranie (HTML okná)
    dom.js            okná, tlačidlá, správy
    hud.js            horná lišta
    town.js           menu hradu, verbovanie, kováč, dvor, diplomacia
    menus.js          prehľad, denník, štatistiky, trofeje, úspechy, encyklopédia
    toolbar.js        panel tlačidiel a rozkazy v bitke
  input.js            myš, dotyk, klávesnica
  main.js             hlavná slučka a spustenie (iba index.html)
  engine/             verzia v Phaseri 3 (iba phaser.html)
    bake.js           most: staré kreslenie → textúry Phaseru
    game.js           konfigurácia a spustenie Phaseru
    scenes/
      BootScene.js    príprava sveta, neskôr načítanie obrázkov a zvukov
      IntroScene.js   úvodná obrazovka
      MapScene.js     mapa: dlaždice, hrady, dediny, armády, kamera, minimapa
      BattleScene.js  bitka: sprity vojakov, šípy, obliehanie, častice zbraní
      UIScene.js      vrstva navrchu: čas, oznámenia, pauza, počasie, lišty
tests/
  sim.test.js         test simulácie (Node.js)
  browser_test.py     test v prehliadači
  phaser_test.py      test scén Phaser verzie
  phaser-stub.js      náhrada Phaseru pre testy bez internetu
```

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

Hlavný cyklus: `loop()` → `updMap()` / `updBattle()` → `drawMap()` / `drawBattle()`.
`worldTick()` posúva svet o jeden krok (AI, dni, diplomacia).

## Phaser verzia: ako je postavená

Simulácia zostala nezmenená. Scény Phaseru ju volajú (`updMap`, `updBattle`) a iba zobrazujú jej stav:

```
BootScene → IntroScene → MapScene ⇄ BattleScene
                 UIScene beží stále navrchu
```

Grafika sa zatiaľ „pečie“ zo starých kresliacich funkcií do textúr (`js/engine/bake.js`). Menu (hrady, encyklopédia, diplomacia) sú zatiaľ HTML okná z `js/ui`.

### Ďalšie kroky

1. **Skutočná grafika:** nahradiť funkcie v `bake.js` načítaním obrázkov v `BootScene.preload()` (sprity jednotiek, hrady, dlaždicová mapa z editora Tiled).
2. **Animácie:** spritesheety s chôdzou, útokom a smrťou (`this.anims.create`).
3. **Zvuk:** nahrané zvuky a hudba cez `this.load.audio` namiesto syntézy.
4. **Rozhranie v Phaseri:** postupne presunúť menu z HTML do scény UI.
5. **Ostrosť:** vyššie rozlíšenie plátna pre veľké obrazovky.
