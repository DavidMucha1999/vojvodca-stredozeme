# Vojvodca Stredozeme

Strategická hra v prehliadači inšpirovaná Mount & Blade: Warband vo svete Pána prsteňov.

Autor a vývojár hry: **Dávid Mucha**

## Spustenie

Otvor `index.html` v prehliadači. Hra nepotrebuje server ani inštaláciu.

Ak chceš hru spúšťať cez lokálny server (odporúčané pri vývoji):

```bash
npm start          # spustí server na http://localhost:8080
```

## Testy

```bash
npm test                        # test simulácie bez prehliadača (Node.js)
python tests/browser_test.py    # test v skutočnom prehliadači (Playwright)
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
  main.js             hlavná slučka a spustenie
tests/
  sim.test.js         test simulácie (Node.js)
  browser_test.py     test v prehliadači
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

## Ďalší krok: herný engine

Logika (`js/data`, `js/sim`) je oddelená od kreslenia (`js/render`). Pri prechode na engine (napríklad Phaser 3) sa nahrádza hlavne `js/render` a `js/input.js`. Ďalším krokom by bolo previesť skripty na ES moduly so spoločným objektom stavu.
