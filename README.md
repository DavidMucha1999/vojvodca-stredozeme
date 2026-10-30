# Vojvodca Stredozeme

Strategická hra v prehliadači inšpirovaná Mount & Blade: Warband vo svete Pána prsteňov.

Autor a vývojár hry: **Dávid Mucha**

## Spustenie

Hra má dve verzie, ktoré zdieľajú rovnakú logiku (`js/data`, `js/sim`):

- **`Vojvodca Stredozeme.html`** – hlavná verzia (spúšťa sa dvojklikom, má vlastnú ikonu `assets/ikona.ico`; vedľa je aj odkaz `Vojvodca Stredozeme.lnk` s touto ikonou) v hernom engine **Phaser 3**: ostrý obraz, dlaždicová mapa, animovaní vojaci, zvuky zo súborov a rozhranie v Phaseri. Phaser je v projekte (`vendor/phaser.min.js`), takže hra beží aj bez internetu.
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

## Výbava a inventár

- **Existuje len výbava dobra a výbava zla.** Hrady dobra (Gondor, Rohan, Erebor, Lothlórien) predávajú výbavu dobra: Meč Gondorskej stráže, Rohanská kopija, Dúnadanský meč, Orcrist, Glamdring, Plameň Anoru, Andúril, rohanská a galadrimská zbroj, mithril, Štít Bieleho stromu, Okrídlená koruna Gondoru, Mearas… Legendárne veci dobra žiaria svetlom. Hrady zla (Mordor, Isengard, Harad, Rhûn) predávajú výbavu zla: orkské šable, morgulské zbrane, Sauronov palcát, zbroj nazgûla, štít Oka, vargy, kôň nazgûla… Legendárne veci zla obklopuje temnota.
- **Strana hrdinu:** hrdina dobra začína so železným mečom, hrdina zla s orkským nožom. Kráľ si pri korunovácii vyberie stranu dobra alebo zla (kráľ z uloženia spred tejto voľby si ju vyberie v hrade v časti Dvor a diplomacia). Frakcie jeho strany s ním uzavrú mier a zlepšia sa vzťahy, frakcie druhej strany mu vyhlásia vojnu a jeho vlastné hrady predávajú výbavu jeho strany.
- **Nové veci** sa pridávajú vždy na koniec zoznamu v `js/data/equipment.js` (a vzhľad na koniec `GEAR`), aby uložené hry ukazovali na správne veci.
- **Inventár** (tlačidlo na mape alebo u kováča) ukazuje všetky kúpené veci; kliknutím ich hrdina oblečie.
- Zoznam vecí, ceny a sila sú v `js/data/equipment.js` (temná výbava má `z: 1`), vzhľad v `js/render/soldiers.js` (`GEAR`, rovnaké poradie). Kováč a inventár sú v `js/ui/inventory.js`.

## Úlohy, spoločníci a ukladanie

- **Úlohy od pánov** (`js/data/quests.js`, logika `js/sim/quests.js`): v rozhovore s priateľským veliteľom sa opýtaj „Máš pre mňa úlohu?“. Pán ponúkne úlohu podľa svojej povahy a strany (hliadky v Ithiliene, hlad v Edorase, vargovia pri Fangorne, posolstvo do Lothlórienu; pre zlo daň pre Čiernu bránu, oči v Bielom meste, soľ z juhu…). Úlohy majú viac krokov: poraziť armády, navštíviť hrad, doviezť tovar, vrátiť sa k pánovi. Odmena je zlato, sláva a vzťah; úloha od panovníka zlepší vzťah dvojnásobne a aj s celou frakciou. Najviac 3 úlohy naraz, tlačidlo **Úlohy** na mape ukazuje postup a čo robiť. Úloha sa uzatvára alebo tovar odovzdáva v hrade pána (tlačidlo „Úloha: …“).
- **Spoločníci** (`js/data/companions.js`, logika `js/sim/companions.js`, okná `js/ui/party.js`): postavy z Pána prsteňov čakajú v **krčmách** hradov. Dobro: Aragorn (Bree), Legolas (Lothlórien), Gimli (Erebor), Boromir (Minas Tirith), Éowyn (Edoras), Faramir (Osgiliath), Sam (Hobitov). Zlo: Lurtz (Isengard), Gothmog (Minas Morgul), Gríma (Edoras), Šagrat (Barad-dûr), Suladân (Umbar), Ústa Saurona (Morannon). Pripojenie stojí zlato a vyžaduje slávu; v družine môžu byť štyria. V bitke bojujú ako silní hrdinovia s vlastným vzhľadom a pokrikmi, na mape občas prehodia hlášku, v okne **Družina** sa s nimi dá porozprávať alebo ich prepustiť. Ranený spoločník sa tri dni zotavuje.
- **Tvorba postavy** (`js/ui/create.js`): na úvodnej obrazovke si najprv vyberieš **stranu** (dobro/zlo) – podľa nej sa ponúknu frakcie a **rasy** (`js/data/races.js`: dobro človek, elf, trpaslík, hobit; zlo ork, uruk-hai, Haradčan, Easterling, Čierny Númenorejec; každá má vlastné bonusy a predvolený vzhľad). Potom vzhľad (pohlavie, pleť podľa rasy, účes a farba vlasov, brada, farba a tvar očí, obočie, nos, ústa, vek, zvláštnosť ako jazva, tetovanie, náušnica, páska cez oko – s živým portrétom), tlačidlo **Náhodná postava** vyžrebuje všetko vrátane mena, **povahu** (čestný, chamtivý, odvážny, prefíkaný, krutý, múdry – každá dáva iné počiatočné bonusy, zoznam `TRAITS`) a rozdelíš 5 bodov schopností (sila, odolnosť, obratnosť, presviedčanie, lukostreľba). Vzhľad sa ukladá v `G.look` a určuje portrét aj postavičku hrdinu na mape a v krčme.
- **Portréty** (`js/render/portraits.js`): tváre spredu kreslené kódom podľa popisu `look` (rasa, pleť s tieňovaním, vlasy s prameňmi, brada s textúrou, tvar a farba očí, obočie, nos, ústa, vek, jazva, bojové maľovanie, tetovanie, náušnica, páska cez oko, kapucňa, turban, prilba, koruna). Erby a zástavy (`js/render/heraldry.js`) majú prepracované znaky frakcií (strom so siedmimi hviezdami, cválajúci kôň, ohnivé oko, biela ruka, had so slnkom, hora s bránou, slnečný drak, list mallornu, lebka so sekerami) a látku so záhybmi, lemom a strapcami. Okná rozhovorov so spoločníkmi, lordmi (tvár odvodená z mena a frakcie, vždy rovnaká) a krčmármi ukazujú portrét vedľa nadpisu – stačí pred `show()` nastaviť `PORTRAIT = look`. Spoločníci majú tváre v `js/data/companions.js` (`look`). Postavičky na mape a v krčme majú z toho istého popisu oko, obočie, nos, ústa, vlasy a bradu.
- **Nádvorie a sieň hradu** (`js/engine/scenes/CastleScene.js`, rozhovory `js/ui/castle.js`, spoločný základ miestností `RoomScene.js`): z okna hradu sa dá vstúpiť na nádvorie a prejsť sa po ňom ako po krčme. Nádvorie vyzerá podľa frakcie (biely kameň Gondoru, drevo Rohanu, čierne železo Mordoru, Sarumanov kameň, pieskovec Haradu, tesaný kameň Ereboru, červený kameň Rhûnu, mallorny Lothlórienu, palisáda banditov) a podľa hradu (studňa, debny, cvičisko); vidno postavené budovy (stajňa, chrám, trhovisko). Postavy: **kováč** (kováčňa), **kupec** (trh), **veliteľ posádky** (verbovanie, vojsko, aréna), stráže; miesta: brána do **siene**, dvere do **krčmy**, studňa (+10 zdravia), chrám (modlitba, česť +1/deň), cvičisko (skúsenosti +5/deň). V sieni sedí **pán hradu**, ak je práve doma (bežný rozhovor s lordom), a stojí **správca hradu** (správa hradu, dvor, úlohy, uloženie, **pobyt v hrade**). Pobyt v hrade funguje ako táborenie: dni plynú, zdravie sa hojí o 25 denne; klik na mapu ho ukončí. Okná otvorené z miestnosti sa po „Späť“ vracajú do nej (`ROOM`, `roomReturn`).
- **Dediny podľa strany:** dediny hradov zla majú tmavé mordorské chatrče, dediny dobra kraj podľa polohy (sever, juh, zelené kraje).
- **Krčma ako miestnosť** (`js/engine/scenes/TavernScene.js`, rozhovory `js/ui/tavern.js`): z hradu sa do krčmy vstupuje ako do samostatnej scény. Interiér sa kreslí kódom podľa témy hradu (ľudia, hobiti v Hobitove a Bree, elfovia, trpaslíci, brlohy zla, juh) a náhodne podľa čísla hradu (poloha krbu a výčapu, počet stolov), v okne vidno dennú dobu a počasie, na stene visí zástava frakcie. Za výčapom stojí krčmár (klebety o svete, runda pre všetkých za slávu, nocľah, najatie chlapov od stola) a pri stoloch sedia spoločníci, ktorí ešte nie sú v družine – klikom sa s nimi porozprávaš a pripojíš. Po krčme chodí hráčova postava (podľa výbavy, rasy a vzhľadu, so štvorkrokovým cyklom chôdze a kývaním rúk): klik na podlahu alebo šípky/WASD; klik na postavu k nej dôjde a začne rozhovor. Krčma má vlastnú hudbu (`pbTavern` v `js/audio/sound.js`, iná pre dobro a zlo), bez zvukov prostredia; hudba mapy sa nemení. Postavy sú veľké verzie postavičiek z mapy (`Figures`, `Art.bigFigure`).
- **Ukladanie:** hra sa sama ukladá na konci každého dňa (automatická pozícia). V hrade sa dá uložiť do troch ručných pozícií a na úvodnej obrazovke si vyberieš, ktorú načítať.
- **Zvuky prostredia** (`js/audio/ambience.js`): tichý dážď a hrom pri búrke, vietor v snehu a v zime, praskanie fakieľ v nočnej bitke. V hrade a v krčme vonkajšie zvuky stíchnu. Hudba na mape sa nemení.

## Svet: rozhovory, obchod, hrad, počasie

- **Lordi a kráľovstvá (AI):** každý lord má domovský hrad a úlohu (`assignRoles` v `js/sim/world.js`). **Strážcovia lén** (najviac polovica lordov frakcie, najprv udelené léna a pohraničné hrady) sa držia pri svojom hrade, hliadkujú po jeho dedinách, zaháňajú slabších votrelcov a banditov, a keď sa k hradu blíži silnejší nepriateľ, stiahnu sa za hradby a posilnia obranu (pri obliehaní hráčom aj AI sa ich vojsko počíta k posádke). Ostatní tvoria **poľné vojsko**: každé kráľovstvo má **maršala** (panovník, inak najsilnejší lord), ktorý pri ťažení zvolá lordov na zraz v najbližšom vlastnom hrade pri cieli, počká, kým sa zíde dosť síl (alebo 5 dní), a potom spoločne obliehajú. Dobytý hrad vyženie porazených obrancov. Lordov je viac (až 8 na frakciu, vyše 70 mien).
- **Väčší svet:** mapa je 2× väčšia (mierka `K` = 6,5, svet 11 700 × 7 800 bodov), staršie uloženia sa pri načítaní prepočítajú. Dediny majú jedinečné mená podľa kraja (`VNAMES` v `js/data/castles.js`): zelené kraje, sever, juh a Mordor.

- **Rozhovory s veliteľmi:** keď na mape dôjdeš k priateľskému veliteľovi, okrem rokovania sa s ním dá porozprávať. Pán odpovedá podľa svojej povahy (čestný, chamtivý, zbabelý, ambiciózny, krutý, múdry), frakcie a situácie: o svete, o svojich plánoch, o tebe, o vojne a mieri, o svojom pánovi, o strane dobra a zla; dá sa mu zalichotiť alebo ho uraziť (mení vzťah). Texty sú v `js/data/dialogue.js`, stačí do zoznamov pridať ďalšie vety.
- **Obchod:** každá dedina vyrába tovar podľa kraja (Rohan kone, Erebor železo a trpasličie zlato, Lothlórien víno a drevo, juh soľ a korenie…). Cena závisí od zásob a prosperity: kde tovaru veľa, je lacný. Tovar vozíš vo voze (40 kusov) a predávaš tam, kde chýba, najmä v hradoch. Logika v `js/sim/trade.js`, okno v `js/ui/market.js`.
- **Vlastný hrad:** v správe hradu vidíš prosperitu a denný príjem a staviaš budovy s účinkom: mlyn (zlato), kasárne (pešiaci), strážna veža (obrancovia), kováčska dielňa (výbava o 20 % lacnejšia), stajňa (kone o 25 % lacnejšie, jazdec za 3 dni), chrám (tvoji vojaci sú v bitke pevnejší), trhovisko (viac tovaru, prosperita, zlato).
- **Počasie a noc:** na mape sa podľa ročného obdobia a kraja strieda jasno, dážď, búrka s bleskami, hmla, sneženie a v Mordore popolový dážď (`js/sim/weather.js`). Zlé počasie a noc spomaľujú pochod. Počasie sa prenáša do bitky; v noci je bojisko tmavé, vojaci nesú fakle a lukostrelci strieľajú na kratšiu vzdialenosť.

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

- **Hrdina:** kreslí sa priamo v hre podľa výbavy, takže každá zbraň, brnenie, štít, prilba a kôň vyzerá inak (a čím drahšia vec, tým krajšia). Vzhľad každej veci je v tabuľke `GEAR` v `js/render/soldiers.js`; tam sa kreslia aj ikonky výbavy u kováča. Vlastný obrázok hrdinu sa dá stále dodať cez `assets/sprites/` (meno podľa šablóny `hero_…`).
- **Vojaci:** každý druh má dva pásy po 12 snímkach (`assets/textures/unit_<druh>.png` a `unit_<druh>_team.png`). Snímky: 0 státie, 1–4 chôdza, 5–7 útok, 8–11 pád; jedna snímka má 192 × 192 px, vojak je v strede a pozerá doprava. Tímová vrstva je biela a hra ju zafarbí farbou frakcie (tabard, štít, plášť, čaprák).
- **Hrady, dediny, zástavy a iné:** ulož obrázok s rovnakým menom ako šablóna z `assets/templates/` do `assets/sprites/`. Hra použije tvoj obrázok namiesto kresleného. Šablóny obnoví `python tools/export_templates.py`.
- **Mapa:** hrady podľa frakcie `map_castle_<f>.png` (240 × 200), dediny podľa kraja a prosperity `map_village_<g|a|d|s><1–5>.png` a vypálená `map_village_burn.png` (160 × 110), polia `map_field_*`, skalky `map_rocks_*`, most `map_bridge.png`. Kreslí ich `tools/art_map.js`; ak súbory chýbajú, hra použije pôvodné kreslenie.
- **Terén a bojisko:** dlaždice `terrain.png` (8 × 5 dlaždíc po 90 px), hory `mtn_*.png`, zem bojiska `ground_*.png`, voda, hradby, stromy.

Generátor `python tools/generate_art.py` znovu vykreslí `assets/textures/` a terén mapy. **Pozor:** terén v mape prepíše; ak si ho upravil ručne, použi `python tools/generate_art.py --bez-terenu`.

### Zvuky a hudba

Zvuky boja sú v `assets/audio/` (`render_sfx.py` ich vie vytvoriť znova). Hra vyberá náhodný variant, mení výšku tónu a v bitke nastavuje hlasitosť a stereo podľa miesta. Ak pridáš `music_kraj`, `music_stred`, `music_mordor` alebo `music_bitka` (ogg/mp3), nahradia syntetickú hudbu v danej oblasti.

## Nástroje (`tools/`)

| Nástroj | Čo robí |
|---|---|
| `pack_assets.py` | zbalí mapu, obrázky a zvuky pre hru (spusti po každej zmene v `assets/`) |
| `generate_art.py` | vykreslí novú grafiku a terén (`art.js`, `art_world.js`, `art_map.js`, `art_build.js`, vojakov kreslí `js/render/soldiers.js`) |
| `export_templates.py` | vytvorí šablóny kreslených obrázkov do `assets/templates/` |
| `export_map.py` | vytvorí mapu pre Tiled z dát hry (bežne netreba) |
| `render_sfx.py` | vyrenderuje zvuky boja do `assets/audio/` |
| `build_single.py` | zostaví celú hru do jedného HTML súboru v `dist/` |

## Štruktúra kódu

Skripty sa načítavajú v poradí uvedenom v `Vojvodca Stredozeme.html` (resp. `index.html`) a zdieľajú globálny priestor premenných.

```
js/
  core/setup.js       plátno, rozmery sveta, globálny stav hry
  data/               čisté dáta: frakcie, hrady (map.js je generovaný z mapy), jednotky, výbava, príbeh, úspechy, rozhovory (dialogue.js)
  sim/                logika hry bez kreslenia: diplomacia, hrdina, armády, svet a AI, obchod (trade.js), počasie (weather.js), bitka, obliehanie, politika, príbeh, uloženie
  render/             pôvodné kreslenie na plátno (index.html; Phaser ho používa ako náhradnú grafiku)
    soldiers.js       vojaci, kone a výbava pohľadom zhora: hrdina podľa výbavy, ikonky u kováča, pásy snímok pre generátor
    figures.js        postavičky na mape a v krčme pohľadom zboku: hrdina podľa výbavy (kôň/pešo), lordi podľa frakcie, spoločníci
    portraits.js      portréty tvárí spredu (rozhovory, tvorba postavy, encyklopédia)
  audio/sound.js      syntetické zvuky a hudba
  ui/                 herné menu ako HTML (v Phaser verzii ich prekresľuje UIScene), inventory.js = kováč a inventár, market.js = trh, create.js = tvorba postavy, tavern.js = rozhovory v krčme
  input.js            klávesnica a myš (pôvodná verzia)
  main.js             hlavná slučka pôvodnej verzie
  engine/             Phaser verzia
    art.js            grafika: textúry, zafarbovanie vojakov, vlastné obrázky, animácie
    icons.js          ikony rozhrania kreslené kódom (lišta, tlačidlá, okná)
    assets.js         zbalené obrázky a zvuky (generuje pack_assets.py)
    audio.js          zvuky zo súborov, priestorový zvuk v bitke
    game.js           spustenie Phaseru (rozlíšenie 1440 × 960)
    scenes/
      BootScene.js    načítanie textúr, obrázkov, zvukov a písma
      IntroScene.js   úvodná obrazovka
      MapScene.js     mapa: dlaždicový terén, lesy z jednotlivých stromov (voľný priestor okolo hradov, dedín a ciest), voda, cesty, hory, hrady, dediny, armády, minimapa
      BattleScene.js  bitka: bojisko z textúr, animovaní vojaci, zástavy, šípy, obliehanie, častice
      RoomScene.js    základ miestností: hráčova postava, chôdza, postavy a miesta, obloha v okne
      TavernScene.js  krčma: miestnosť podľa témy hradu, krb, krčmár a spoločníci
      CastleScene.js  nádvorie a sieň hradu podľa frakcie: kováč, kupec, veliteľ, správca, pán hradu
      UIScene.js      rozhranie v Phaseri: lišta, tlačidlá, okná, popisky, legenda, počasie
vendor/phaser.min.js  Phaser 3.80.1
```

### Ako funguje Phaser verzia

Simulácia (`js/sim`) je rovnaká pre obe verzie. Scény ju volajú (`updMap`, `updBattle`) a iba zobrazujú jej stav:

```
BootScene → IntroScene → MapScene ⇄ BattleScene
                 UIScene beží stále navrchu
```

Menu sú stále napísané v `js/ui` ako HTML (funkcie `show`/`btn`). UIScene ich „zrkadlí“: prečíta okno, nakreslí ho v Phaseri a kliknutie prepošle pôvodnému tlačidlu. Dlhé okná (napr. denník) sa posúvajú kolieskom, ťahaním, šípkami ▲▼ alebo klávesmi a tlačidlo na odchod (Späť, Zavrieť…) ostáva vždy viditeľné dole. V HTML ostali len okná s formulármi a obrázkami: úvod, korunovácia a encyklopédia.

Veľká mapa (klávesa **M** alebo tlačidlo Mapa) je celoobrazovkový prehľad Stredozeme s názvami hradov a dedín, krajinami, vojskami a hrdinom; klik na ňu nastaví cieľ cesty. Spodný panel je zbalený do skupín **Hrdina** (prehľad, denník, úlohy, družina, inventár, štatistiky), **Kronika** (legenda, trofeje, úspechy, encyklopédia, návod) a **Nastavenia** (zvuk, celá obrazovka); lupa, Tábor a Mapa ostávajú priamo na paneli. Skupiny sú v `UIScene.GROUPS`.

Horná lišta a spodný panel sa tiež zrkadlia z HTML (`#hud`, `tb`, `od`), ale kreslia sa s ikonami z `js/engine/icons.js`: každá položka lišty (srdce = zdravie, mince = zlato, meč = pešiaci…) a každé tlačidlo (zvitok = úlohy, kniha = denník…) má ikonu kreslenú kódom vo 4× rozlíšení, aby bola ostrá aj na veľkej obrazovke. Ktorú ikonu položka dostane, určuje text v lište (`Icons.forHud`) alebo text tlačidla (`Icons.forButton`) – pri pridaní novej položky stačí doplniť riadok do zoznamu `HUD` alebo `BTN` a prípadne novú kresliacu funkciu `draw.<meno>`.

## Skratky v kóde

| Skratka | Význam |
|---|---|
| `G` | hráč a stav hry (zlato, vojsko, výbava `eq`, kúpené veci `own`, sláva…) |
| `E` | armády veliteľov na mape |
| `TW`, `VL` | hrady a dediny |
| `U`, `LB` | jednotky v bitke a aktuálny súper |
| `FN`, `FC`, `BF`, `EC` | názvy, farby, farby zástav a erbov frakcií |
| `WR`, `AL`, `REL` | vojny, spojenectvá a vzťahy medzi frakciami |
| `FU`, `FK`, `SH` | elitné jednotky, jednotky frakcií, výbava |
| `QS`, `CP`, `SGB` | kapitoly príbehu, ciele ťažení, stav obliehania |
| `RES`, `BZ` | rozlíšenie plátna (2×) a priblíženie kamery v bitke |
| `MW`, `WX` | počasie na mape a v bitke (WX.night = noc) |
| `G.qu`, `G.comp` | aktívne úlohy a spoločníci v družine |
| `GOODS`, `G.cargo` | druhy tovaru a náklad vo voze |
