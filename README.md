# Vojvodca Stredozeme

Strategická hra v prehliadači inšpirovaná Mount & Blade: Warband vo svete Pána prsteňov.

Autor a vývojár hry: **Dávid Mucha**

## Spustenie

Hra je jeden súbor **`Vojvodca Stredozeme.html`** (spúšťa sa dvojklikom, má vlastnú ikonu `assets/ikona.ico`; vedľa je aj odkaz `Vojvodca Stredozeme.lnk` s touto ikonou) v hernom engine **Phaser 3**: ostrý obraz, dlaždicová mapa, animovaní vojaci, zvuky zo súborov a rozhranie v Phaseri. Phaser je v projekte (`vendor/phaser.min.js`), takže hra beží aj bez internetu. Server ani inštalácia nie sú potrebné. Celú hru v jednom súbore vytvorí `python tools/build_single.py` (výsledok je v `dist/vojvodca-single.html`).

## Testy

```bash
npm test                          # simulácia bez prehliadača (skripty hry bez Phaseru): 40+ dní hry, obliehanie, uloženie, nové systémy
python tests/phaser_test.py       # Phaser verzia: scény, okná v Phaseri, animácie, zvuky
python tests/real_phaser_test.py  # Phaser verzia: prejde hru a uloží snímky obrazovky do tests/screens/
python tests/browser_test.py      # rýchla simulácia v prehliadači: 30 000 tikov, obliehanie, okná, uloženie
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
- **Izometrické miestnosti** (`js/engine/scenes/IsoRoom.js`): krčma, nádvorie a sieň hradu sú kreslené v izometrii (2,5D) – podlaha je kosoštvorec vo svetových súradniciach (šírka × hĺbka), vzadu stoja dve steny, predmety sú kvádre a valce (`box`, `cyl`) alebo vlastné kresby (`prop`) zoradené podľa hĺbky, takže postavy chodia za stolmi aj pred nimi. Podlaha a steny sa vykreslia raz na plátno (`floor`, `wallL`, `wallR`, `onWallL/onWallR/onFloor` pre detaily ako brána, okná, police, koberec) a potom sú jedným obrázkom. Klik na podlahu sa premieta späť do sveta (`W2`), šípky/WASD hýbu v smere obrazovky, kolízie sú obdĺžniky v svete (`blocks`). Dediny a pamätihodnosti zatiaľ ostávajú v bočnom pohľade (`RoomScene.js`).
- **Nádvorie a sieň hradu** (`js/engine/scenes/CastleScene.js`, rozhovory `js/ui/castle.js`, základ `IsoRoom.js`): z okna hradu sa dá vstúpiť na nádvorie a prejsť sa po ňom ako po krčme. Nádvorie je obohnané hradbami s cimburím, vežou v rohu, bránou do siene a dverami do krčmy; na ňom stojí vyhňa s prístreškom a nákovou, stánok kupca s plachtou, studňa so strieškou, cvičný panák, debny a seno. Sieň má pódium s trónom, koberec k bráne, stĺpy, koše s ohňom, dlhé stoly so sviečkami, zástavy a okná s oblohou. Nádvorie vyzerá podľa frakcie (biely kameň Gondoru, drevo Rohanu, čierne železo Mordoru, Sarumanov kameň, pieskovec Haradu, tesaný kameň Ereboru, červený kameň Rhûnu, mallorny Lothlórienu, palisáda banditov) a podľa hradu (studňa, debny, cvičisko); vidno postavené budovy (stajňa, chrám, trhovisko). Postavy: **kováč** (kováčňa), **kupec** (trh), **veliteľ posádky** (verbovanie, vojsko, aréna), stráže; miesta: brána do **siene**, dvere do **krčmy**, studňa (+10 zdravia), chrám (modlitba, česť +1/deň), cvičisko (skúsenosti +5/deň). V sieni sedí **pán hradu**, ak je práve doma (bežný rozhovor s lordom), a stojí **správca hradu** (správa hradu, dvor, úlohy, uloženie, **pobyt v hrade**). Pobyt v hrade funguje ako táborenie: dni plynú, zdravie sa hojí o 25 denne; klik na mapu ho ukončí. Okná otvorené z miestnosti sa po „Späť“ vracajú do nej (`ROOM`, `roomReturn`).
- **Dediny podľa strany:** dediny hradov zla majú tmavé mordorské chatrče, dediny dobra kraj podľa polohy (sever, juh, zelené kraje).
- **Krčma ako miestnosť** (`js/engine/scenes/TavernScene.js`, rozhovory `js/ui/tavern.js`): z hradu sa do krčmy vstupuje ako do samostatnej scény. Interiér sa kreslí kódom podľa témy hradu (ľudia, hobiti v Hobitove a Bree, elfovia, trpaslíci, brlohy zla, juh) a náhodne podľa čísla hradu (poloha krbu a výčapu, počet stolov), v okne vidno dennú dobu a počasie, na stene visí zástava frakcie. Za výčapom stojí krčmár (klebety o svete, runda pre všetkých za slávu, nocľah, najatie chlapov od stola) a pri stoloch sedia spoločníci, ktorí ešte nie sú v družine – klikom sa s nimi porozprávaš a pripojíš. Po krčme chodí hráčova postava (podľa výbavy, rasy a vzhľadu, so štvorkrokovým cyklom chôdze a kývaním rúk): klik na podlahu alebo šípky/WASD; klik na postavu k nej dôjde (zastaví sa pred výčapom či stolom) a začne rozhovor; **medzerník** alebo **E** začne rozhovor s najbližšou osobou či miestom (do 80 bodov; popisok vtedy ukazuje „⎵“). Steny a podlahy krčmy, nádvoria aj siene sú procedurálne textúry v dvojnásobnom rozlíšení (`js/engine/tex.js`: dosky, kamenné kvádre, dlažba, pieskovec, tráva, čierny kameň Mordoru, elfské drevo) a svetlá krbu, sviečok, fakieľ a vyhne sú mäkké žiary so sčítaným miešaním, ktoré sa mihocú. Krčma má vlastnú hudbu (`pbTavern` v `js/audio/sound.js`, iná pre dobro a zlo), bez zvukov prostredia; hudba mapy sa nemení. Postavy sú veľké verzie postavičiek z mapy (`Figures`, `Art.bigFigure`).
- **Ukladanie:** hra sa sama ukladá na konci každého dňa (automatická pozícia). V hrade sa dá uložiť do troch ručných pozícií a na úvodnej obrazovke si vyberieš, ktorú načítať.
- **Zvuky prostredia** (`js/audio/ambience.js`): tichý dážď a hrom pri búrke, vietor v snehu a v zime, praskanie fakieľ v nočnej bitke. V hrade a v krčme vonkajšie zvuky stíchnu. Hudba na mape sa nemení.

## Svet: rozhovory, obchod, hrad, počasie

- **Lordi a kráľovstvá (AI):** každý lord má domovský hrad a úlohu (`assignRoles` v `js/sim/world.js`). **Strážcovia lén** (najviac polovica lordov frakcie, najprv udelené léna a pohraničné hrady) sa držia pri svojom hrade, hliadkujú po jeho dedinách, zaháňajú slabších votrelcov a banditov, a keď sa k hradu blíži silnejší nepriateľ, stiahnu sa za hradby a posilnia obranu (pri obliehaní hráčom aj AI sa ich vojsko počíta k posádke). Ostatní tvoria **poľné vojsko**: každé kráľovstvo má **maršala** (panovník, inak najsilnejší lord), ktorý pri ťažení zvolá lordov na zraz v najbližšom vlastnom hrade pri cieli, počká, kým sa zíde dosť síl (alebo 5 dní), a potom spoločne obliehajú. Dobytý hrad vyženie porazených obrancov. Lordov je viac (až 8 na frakciu, vyše 70 mien).
- **Maršal kráľovstva** (`js/sim/marshal.js`): lordi si ho volia spomedzi seba každých 20 dní (sila vojska, koruna, úspechy); ak pod jeho velením prehrávajú (prehry ≥ výhry + 2), zvrhnú ho a zvolia nového. Maršal má na mape pri postavičke veľkú zástavu svojej frakcie. Keď zvoláva vojsko, lordi dostanú výzvu (zbabelí a ambiciózni ju občas odmietnu) a hráč vlastnej frakcie dostane **list** s možnosťou pridať sa (cieľ cesty sa nastaví na zraz; účasť na úspešnom dobytí prinesie korisť, slávu a priazeň). Zraz vlastnej frakcie je na mape zvýraznený zlatým kruhom a čiarou od maršala; zrazy cudzích frakcií vidno nie sú.
- **Oznámenie o dobytí hradu:** keď niekto dobyje hrad (AI alebo hráč), pod lištou sa na chvíľu ukáže malý panel so zástavou a farbou pôvodnej frakcie, zástavou a farbou dobyvateľa a menom lorda, ktorý velil.
- **Minimapa** (vpravo dole, `UIScene.syncMinimap`): podklad je obrázok celého sveta v rozlíšení 1440 × 960 (`MapScene.minimapTexture`: tieňovaný terén, lesy, rieka s brehmi, jazero, cesty, hory so snehom a žiarou Mordoru) a nad ním sa každý snímok kreslia hrady vo farbách frakcií (vlastný s bielym rámom), dediny, zaujímavé miesta, armády (nepriateľské ako červené trojuholníky, maršali väčší), zraz vlastnej frakcie, hrdina a výrez obrazovky.
- **Tabuľka po bitke:** okno víťazstva/porážky ukáže výsledok, straty oboch strán podľa druhov jednotiek, najlepšieho vlastného bojovníka (zabití a spôsobené zranenia; hrdina, spoločník alebo druh vojaka) a najnebezpečnejšieho nepriateľa (`battleReport` v `js/sim/battle.js`).
- **Zaujímavé miesta** (`js/data/places.js`, udalosti `js/ui/places.js`): Amon Sûl (výhľad na nepriateľov), Argonath (sláva a česť), Trollie lesy (boj s trollmi), Starý les a dom Toma Bombadila (plné uzdravenie), Mŕtve močiare (skratka alebo hľadanie pokladu), Pavúčie húštiny (boj), Fangorn (Stromobrad pre dobro, stromy proti zlu), Cesty mŕtvych (pre dediča s dostatočnou slávou), Beornov dvor (posily pre dobro, medveď proti zlu), Brody na Isene (prepad Isengardu), Pelennor. Miesta vidno na mape aj na veľkej mape; klik na ne nastaví cestu.
- **Oko Mordoru:** nad Barad-dûrom žiari veľké plamenné oko, ktoré sa otáča za hrdinom a pri priblížení naň hľadí kužeľom svetla; po zničení Prsteňa ostane len rozpadnutá veža s dymom.
- **Vlastné kráľovstvo** (`js/ui/kingdom.js`, okno Kráľovstvo v Dvore a diplomacii alebo u správcu hradu): prehľad (meno, erb, strana, hrady, dediny, vazali, denný príjem), **vyhlásenie nezávislosti** od pána (vlastné hrady prejdú pod tvoju zástavu, bývalé kráľovstvo vyhlási vojnu, lordi ťa majú za zradcu), korunovácia a zmena mena, erbu a farby; **léna** pre vazalov aj pre spoločníkov (spoločník odíde z družiny, usadí sa na hrade ako jeho pán a bráni ho; dá sa odvolať späť), držiteľ léna si necháva 30 % príjmu; **vazali**: vernosť, žold (vernosť a vzťah), vymenovanie maršala; **dane** nízke/bežné/vysoké (príjem × 0,7/1/1,35, prosperita dedín a hradov, vernosť vazalov), posilnenie posádok, obnova vypálených dedín.
- **Dvor a vzťahy lordov** (`js/sim/court.js`): lordi majú medzi sebou priateľstvá a **spory** (lord v spore s maršalom neprichádza na zraz) a **vernosť** svojmu pánovi (klesá po stratených hradoch, zvrhnutom maršalovi, pod maršalom, ktorého nenávidí; rastie po víťazstvách a hostinách). Nespokojný lord, ktorý má hráča rád, **ponúkne listom prestup** (ak je hráč kráľ alebo nezávislý s hradom). Okno **Dvor**: zoznam lordov frakcie so vzťahmi, spormi a vernosťou, dar, **urovnanie sporu**, na vlastnom hrade **hostina** (vzťahy, vernosť, zmierenie znepriatelených lordov, sláva). Pri rokovaní s lordom sa dá spýtať na iných lordov.
- **Zajatci a výkupné** (`js/sim/prisoners.js`): po víťazstve zajmeš veliteľa (zmizne z mapy); jeho frakcia po pár dňoch pošle **list s ponukou výkupného** (prijať, žiadať dvojnásobok, odmietnuť), v hrade ho možno predať do väzenia za 60 %, vydať panovníkovi (sláva, priazeň) alebo prepustiť (česť, vzťah); zajatci občas utečú. Po porážke od lorda môže byť **zajatý aj hráč**: sedí v žalári hradu víťaza, každý deň sa môže pokúsiť o útek (šanca podľa obratnosti), zaplatiť výkupné alebo čakať; po 6 dňoch ho prepustia (alebo skôr, ak hrad padne).
- **Tlupy na mape** (`js/sim/armies.js`): okrem lupičov aj **orkské tlupy** (viac v Mordore a pri Isengarde, s trollom), **vargovia** (sever a hory, jazdci na vlkoch) a **dezertéri** (pešiaci, lukostrelci, jazdci); potulujú sa medzi dedinami v okolí, číhajú pri cestách a plienia. Zloženie v bitke a postavička na mape podľa druhu.
- **Udalosti počas cesty** (`js/sim/travel.js`): raz za 1,5–3 dni pochodu kupecká karavána (lacný tovar, alebo prepad), zranený pocestný, stratený vojak, potulný pevec, zabudnutý pamätník/oltár, nočný prepad, **prosba dedinčanov** (úloha: poraziť označenú tlupu za odmenu), trpasličí kupec (lacná zbraň), búrka, elfský zved (správy o nepriateľoch, lembas) a utečenci pre dobro, orkská hliadka a zajatí dedinčania pre zlo, zatúlaný kôň. Voľby menia zlato, vojsko, česť, strach a slávu.
- **Vnútro dedín** (`js/engine/scenes/VillageScene.js`, rozhovory `js/ui/village.js`): z okna dediny sa dá vstúpiť na náves a prejsť sa po nej. Vzhľad podľa kraja (slamené chalupy a polia, zruby so snehom, čierne chatrče Mordoru s kolmi a klietkou, hlinené domy juhu s plachtami) a strany pána (kaplnka alebo oltár s lebkami, ovce alebo varg na reťazi); vypálená dedina = ruiny a dym. Postavy: **starosta / orkský dozorca** (klebety, úloha proti tlupe, ochrana, dane či vymáhanie, pomoc s obnovou), **kupec** (trh), **dobrovoľníci / zverbovaní sedliaci** (pešiaci, lukostrelci, násilný odvod), dedinčanka či zlomený sedliak; miesta: studňa (zdravie raz denne), kaplnka/oltár (česť alebo strach), krčmička (nocľah, klebety, runda).
- **Pamätihodnosti s vlastnou scénou** (`js/engine/scenes/PlaceScene.js`): každé zaujímavé miesto má kulisu, po ktorej sa dá prejsť – zrúcanina Amon Sûl s hraničiarom, Argonath nad Anduinou s prievozníkom, trollie jaskyne so skamenenými trollmi, dom Toma Bombadila (Tom osobne), Mŕtve močiare s bludičkami, pavúčie húštiny, Fangorn so Stromobradom a hobitom, brána Ciest mŕtvych v hmle, Beornov dvor s úľmi a Beornom, Brody na Isene s rohanským zvedom, mŕtvy strom na Pelennore pod hradbami Minas Tirith. Voľby miesta (výstup, boj, prebrodenie…) sú na kulise ako miesta, postavy majú rozhovory (`placeTalk`).
- **Terén v bitke podľa mapy** (`js/sim/field.js`): bojisko sa stavia podľa miesta, kde bitka začala – hustota lesa z dlaždíc mapy (lesné zhluky spomaľujú na 72 %), **rieka s brodom len pri Anduine**, pri horách **kopec** (útok z kopca +15 % zranenia, úpätie hory so skalami), sneh a piesok spomaľujú. 
- **Ťažké jednotky z miest** (`js/data/units.js`): jaskynný troll (Mordor), **mûmak s vežou** (Harad), rytier Dol Amrothu (Gondor), uruk berserker (Isengard) – verbujú sa v hradoch svojej frakcie a spojencov; **enti** sa nedajú kúpiť: Stromobrad vo Fangorne ich občas pošle s hrdinom dobra (G.ent, najviac 3 v bitke). Enti a nové jednotky sa kreslia kódom (`Soldiers.UNITS`), ak nemajú obrázok.
- **Správa družiny** (`js/ui/party.js`, tlačidlo Družina): záložky **Spoločníci** (portrét, úroveň a skúsenosti – každých 40 bodov úroveň, +6 % zdravia a útoku; zabití, zdravie, kôň z vlastnej stajne = +30 % rýchlosti), **Vojsko** (druhy jednotiek s ikonkami, žold, prepustenie) a **Rozkazy** (východzí rozkaz do bitky).
- **Uloženie**: 6 ručných pozícií + automatická, každá s **portrétom hrdinu, dňom, kráľovstvom, úrovňou, počtom hradov, najbližším hradom a časom** (`slotData`).
- **Načítacia obrazovka** (`BootScene`): Prsteň s ohnivým písmom, zlatá lišta s postupom, citáty, kroky načítania; textúry sa načítavajú **po skupinách** – najprv mapa, textúry bojiska a vojakov sa dočítavajú na pozadí počas úvodu (`Art.loadTextures(scene, 'map' | 'battle')`, bitka na ne prípadne počká).
- **Zvuky miestností** (`js/audio/room.js`): kroky podľa podlahy (drevo, kameň, tráva, piesok), vŕzganie dverí, šum prostredia – krčma (hovor hostí, cinkot, smiech, praskanie krbu), nádvorie (kladivo kováča, vtáky, kone, vietor), sieň (krb), dedina (vtáky, sliepky, pes), zlo (vrany, kvapkanie), elfské siene (zvončeky), jaskyne. Hudba mapy sa nemení.
- **Grafika mapy a bitky (v23):** **reliéf krajiny** (`MapScene.buildRelief`: výškové pole zo šumu, hôr a lesov tieňované svetlom zo severozápadu, vlhká tmavšia zem pri Anduine), **stromy podľa kraja** (zlaté mallorny okolo Lothlórienu, modrasté borovice na severe, popolavé kmene Mordoru, žltkasté na juhu), **svetlo dňa** (zlatá hodina, oranžový súmrak a ružový úsvit, modrá noc s hviezdami a putujúcim mesiacom – v `UIScene`), **život v dedinách** (dym z komínov cez deň, svietiace okná v noci), **kolóny** za veľkými armádami (ďalšie postavičky, viac prachu, sneh na severe). V bitke majú vojaci **objem** (svetlo zhora zľava, tieň a odlesk kovu – `Art.tinted`), pri zásahoch lietajú **iskry**, pri páde krv, za jazdou, mûmakmi a trollmi stúpa **prach** podľa kraja a ťažký úder **otrasie kamerou**. **Listy** (od maršala, výkupné, ponuka lorda) sú na pergamene s roztrhanými okrajmi a **voskovou pečaťou s erbom** odosielateľa.
- **Väčší svet:** mapa je takmer 3,2× väčšia plochou (mierka `K` = 8, svet 14 400 × 9 600 bodov), staršie uloženia sa pri načítaní prepočítajú. Dediny majú jedinečné mená podľa kraja (`VNAMES` v `js/data/castles.js`): zelené kraje, sever, juh a Mordor.

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

Skripty sa načítavajú v poradí uvedenom v `Vojvodca Stredozeme.html` a zdieľajú globálny priestor premenných. Logika (`js/data`, `js/sim`, `js/ui`) nepozná Phaser – dá sa spustiť aj bez prehliadača (testy); Phaser je len v `js/engine`.

```
js/
  core/setup.js       plátno, rozmery sveta, globálny stav hry, konštanty (DAY_LEN, regionAt, ENGAGE_R)
  data/               čisté dáta: frakcie, hrady (map.js je generovaný z mapy), jednotky, výbava, príbeh, úspechy, rozhovory (dialogue.js), spoločníci, rasy, miesta
  sim/                logika hry bez kreslenia
    world.js          pohyb hrdinu, tok dní, vojny a mier medzi frakciami, Hora osudu, updMap (volá AI lordov a denné udalosti)
    lords.js          AI lordov a tlúp (lordTick): strážcovia lén, poľné vojsko maršala, ťaženia; maršal, rozdelenie úloh, strategická AI
    economy.js        prosperita, príjem, budovy, denné udalosti (daily2) a ozvena povahy lordov
    marshal.js        voľba a zvrhnutie maršala, listy (readLetter rozdeľuje aj listy o výkupnom a prestupe), oznámenia o dobytí
    court.js          vzťahy a vernosť lordov, prestupy, hostina, okno dvora
    prisoners.js      zajatci, výkupné, zajatie hráča
    travel.js         udalosti počas cesty
    field.js          bojisko podľa miesta na mape (les, rieka, kopec)
    battle.js         bitka: jednotky, začiatok a koniec (tabuľka výsledkov), boj, šípy, rozkazy, hradby
    armies.js, diplomacy.js, hero.js, trade.js, weather.js, quests.js, companions.js, siege.js, politics.js, story.js, achievements.js
    game.js           nová hra, uloženie (celé objekty, verzia SAVE_VERSION) a načítanie s migráciou starších uložení
  render/             kreslenie kódom na plátno (používa ho Phaser cez Art)
    soldiers.js       vojaci, kone a výbava pohľadom zhora: hrdina podľa výbavy, ikonky u kováča, pásy snímok, enti a ťažké jednotky
    figures.js        postavičky na mape a v miestnostiach pohľadom zboku: hrdina podľa výbavy, lordi podľa frakcie, tlupy, spoločníci
    portraits.js      portréty tvárí spredu (rozhovory, tvorba postavy, encyklopédia)
    heraldry.js       erby, zástavy, koruna
    intro.js          animovaná úvodná scéna
  audio/sound.js      syntetické zvuky a hudba; ambience.js = zvuky počasia; room.js = kroky a šum miestností
  ui/                 herné okná: show/btn/row v dom.js opisujú okno, UIDialog ho kreslí v Phaseri
    rooms.js          jeden vstup a výstup pre všetky miestnosti (enterRoom/leaveRoom/roomReturn, ROOM, ROOM_MODES)
    town.js           okno hradu a jeho karty (verbovanie, vojsko, správa, dvor a diplomacia), dediny (okno), korunovácia
    lord.js           rokovanie a rozhovor s veliteľom, úlohy od pána;  save.js = uloženie a načítanie
    castle.js, tavern.js, village.js, places.js, kingdom.js, party.js, inventory.js, market.js, create.js (HTML tvorba postavy), menus.js (prehľady, encyklopédia)
  engine/             Phaser
    art.js            textúry z obrázkov a z kódu, zafarbovanie a tieňovanie vojakov, animácie, načítanie po skupinách
    icons.js          ikony rozhrania kreslené kódom
    tex.js            procedurálne textúry miestností a mäkké žiary svetiel
    assets.js         zbalené obrázky a zvuky (generuje pack_assets.py)
    audio.js          zvuky zo súborov, priestorový zvuk v bitke
    game.js           spustenie Phaseru (rozlíšenie 1440 × 960)
    scenes/
      BootScene.js    načítacia obrazovka (Prsteň, lišta, citáty), textúry mapy, zvuky, písma
      IntroScene.js   úvodná obrazovka; na pozadí dočíta textúry bojiska
      MapScene.js     mapa: terén, reliéf, lesy podľa kraja, voda, cesty, hory, hrady, dediny, armády s kolónami, minimapa HD
      BattleScene.js  bitka: bojisko podľa mapy, animovaní vojaci, prach, iskry, otras kamery, obliehanie
      RoomScene.js    základ miestností v bočnom pohľade: hráčova postava, chôdza, postavy a miesta, medzerník, zvuky krokov
      IsoRoom.js      základ izometrických miestností: projekcia, podlaha a steny na plátne, kvádre/valce, hĺbkové radenie, chôdza
      TavernScene.js, CastleScene.js – krčma, nádvorie a sieň (izometria); VillageScene.js, PlaceScene.js – dedina, pamätihodnosti (bočný pohľad)
      UIScene.js      rozhranie: lišta, panel tlačidiel, počasie a svetlo dňa, oznámenia
      UIDialog.js     okná v Phaseri (rám, portrét, ikonky, posúvanie, klávesy; listy ako pergamen s pečaťou)
      UIMaps.js       minimapa, veľká mapa (M), popisky pri myši, legenda
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
