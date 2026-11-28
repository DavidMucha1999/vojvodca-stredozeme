# História vývoja

Podrobný denník etáp a verzií, ako vznikali systémy 3D bitky, mapy a rozhrania. Je to záznam z minulosti: súbory a názvy sa mohli medzitým presunúť alebo zaniknúť (napr. 2D zobrazenie bitky a mapy, modely z Meshy, generátor 2D grafiky). Aktuálna štruktúra kódu je v `README.md`.

## 3D bitka (etapa 1)

Bitka sa predvolene zobrazuje v **3D pohľadom za hrdinom**, ako v Mount & Blade (`js/engine/3d/b3d.js`, knižnica Three.js r159 v `vendor/three.min.js`, licencia MIT). Herná logika je rovnaká ako v 2D – 3D ju len zobrazuje:

- **Bojisko:** terén s výškou podľa miesta na mape (kopec, rieka s brodom, rovina pred hradbami), farby podľa kraja (tráva, popol Mordoru, púšť, sneh), stromy a skaly, obloha, slnko s tieňmi, hmla, dážď, sneh a popol, v noci tma a pohyblivé svetlá fakieľ. Stromy pri kamere sa rozplynú, aby nezakryli hrdinu.
- **Obliehanie:** hradby s cimburím, štyri veže, brána s prekladom, hradný palác; rebríky sa dvíhajú (zhodený rebrík leží pod hradbami), obliehacia veža sa prisúva, baranidlo búši do brány. Obrancovia stoja hore na ochodzi, útočníci vystupujú po rebríkoch.
- **Vojaci:** nízkopolygónové postavy skladané kódom z dielov podľa `Soldiers.UNITS` a výbavy hrdinu (`Soldiers.heroSpec`): pleť podľa rasy, prilby (Gondor s krídelkami, Rohan s chvostom, orkské s hrotom, trpasličie, elfské, kapucne nazgûlov), zbrane (meč, kopija, sekera, kyjak, luk, kuša), okrúhle a kosoštvorcové štíty, plášte, zástavy, kone, vargovia, čierne kone, olifanty, enti a trollovia. Rovnaké jednotky zdieľajú geometriu, takže bitka so stovkou vojakov ide plynulo.
- **Animácie:** chôdza a beh, nápriah (čitateľné varovanie pred úderom), sek a bod, kryt štítom, natiahnutý luk, zapotácanie, útek s rukami nad hlavou, pád (padlí ostávajú ležať s kalužou krvi), jazda s pohupovaním koňa.
- **Bossovia:** Balrog s krídlami, žeravými puklinami, plamenným mečom a ohňom, ktorý svieti na okolie; drak a okrídlená šelma mávajú krídlami a lietajú; Kráľ trollov s korunou. Ohlásené útoky bossov (kruh, kužeľ, pás) sa plnia na zemi.
- **Na zemi:** zlatý krúžok hrdinu, oblúk seku a bodu, oblúk krytu, červený nápriah nepriateľov, ktorí mieria na teba, krúžok veliteľa. Šípy, oštepy a šípy z kuše letia v oblúku a zapichnú sa do zeme.
- **Ovládanie:** kamera je za hrdinom; **koliesko** približuje, **Z** a **C** alebo **stredné tlačidlo myši** (ťahanie) otáčajú kameru. **WASD** sa hýbe vzhľadom na kameru (W = dopredu od kamery), myš mieri na bod na zemi pod kurzorom; ostatné klávesy a rozkazy sú rovnaké ako v 2D.
- **Prepínač:** Nastavenia → **Bitka: 3D / 2D**. Ak počítač nepodporuje WebGL alebo sa 3D nedá spustiť, hra sama použije 2D bojisko.

Plátno Three.js leží pod priehľadným plátnom Phaseru, takže lišty, rozkazy a okná ostávajú z UIScene. Súradnice: x bojiska = X, y bojiska = Z, výška = Y. Ďalej pozri etapy 2 a 3 nižšie.

## Útvary, obliehanie a bossovia v 3D (etapa 3)

- **Rozkaz na miesto (ako vo Warbande):** **drž** kláves Držať (**H**) alebo Šík (**G**), namier myšou na zem – biele značky ukazujú, kde sa vybraná skupina postaví – a **pusti**. Krátke stlačenie funguje ako doteraz. Po každom rozkaze sa na chvíľu ukážu farebné krúžky pod vojakmi vybranej skupiny (pechota modrá, lukostrelci zelení, jazda oranžová) a značky ich miest v útvare (`slotsFor`, `ordPlace`, `placeTick` v `js/sim/combat.js`).
- **Útvary (kláves X alebo tlačidlo vedľa rozkazov):** **riadky** (ako doteraz), **štítový val** – pechota stojí tesne, štíty drží vpred, kryje údery aj šípy o polovicu častejšie, ale presúva sa pomalšie, **voľný útvar** – vojaci sú rozostúpení a strely nimi často preletia. Útvar sa dá prepnúť pre každú skupinu zvlášť; skupiny v rozkaze Držať/Šík sa hneď preskupia.
- **Obliehanie:** vojaci lezú po rebríkoch (ruky striedavo hore), mostík obliehacej veže po prisunutí dopadne na hradby, brána sa pri údere baranidla trasie a sypú sa z nej triesky, a keď padne, rozletí sa na trosky s oblakom prachu. Na vežiach vejú zástavy obrancov. Hodený kameň z hradieb letí oblúkom a dopadne s prachom, vriaci olej steká po hradbách v plameňoch a dyme, zhodený rebrík sa rozbije. V noci horia šípy.
- **Bossovia:** pred ohnivým útokom šľahajú drakovi a Balrogovi plamene z papule, ohnivý útok zaplaví ohlásené miesto ohňom a dymom a nechá spálenú zem, údery bez ohňa (dopad draka, kyjak Kráľa trollov) pošlú tlakovú vlnu, prach a kamene. Letiaci drak a šelma vrhajú na zem tieň, aby bolo vidno, kam dopadnú. Kráľ trollov dvíha kyjak pred úderom. Padlý boss sa zrúti v oblaku prachu a jeho oheň zhasne.
- Efekty idú cez frontu udalostí `FX3` zo simulácie (`fx3` v `js/sim/combat.js`), takže logika nezávisí od 3D; v 2D sa udalosti len zahodia.

## Boj ako vo Warbande – miesto zásahu, luk, prvá osoba (`js/sim/warband.js`)

- **Mierenie ako vo Warbande** (Nastavenia → Mierenie v 3D): prvý klik do bitky zamkne kurzor, **myš potom otáča hrdinu a kameru**, v strede obrazovky je **zameriavač** (pri luku sa pri napínaní zužuje, plne napnutý zažiari a po chvíli sa začne triasť). Esc kurzor uvoľní. Pôvodné mierenie kurzorom na zem ostáva ako voľba.
- **Prvá / tretia osoba: kláves Tab** (dá sa zmeniť v Ovládaní). V prvej osobe vidíš vlastné ruky, zbraň a štít (na koni aj krk a hlavu koňa), obraz sa pri chôdzi jemne hojdá; tretia osoba je za plecom ako vo Warbande. Kamera sa približuje klávesmi **+ / −** (PageUp / PageDown).
- **Koliesko myši mení zbraň**: zbraň na blízko ↔ strelná zbraň (luk, kuša, oštepy). So strelnou zbraňou strieľa ľavé tlačidlo (drž a pusť), Q funguje stále. Keď dôjdu strely, hrdina sám prejde na zbraň na blízko.
- **Šípy v 3D**: letia z ramena strelca v oblúku s **gravitáciou** (na diaľku treba mieriť vyššie), rýchlejšia strela zraní viac. Zasiahnu tú časť tela, do ktorej trafia – **hlava, trup, ruka, noha**, u jazdca aj **kôň**. Prelet nad hlavou alebo popri vojakovi netrafí. Šípy ostávajú **zapichnuté v telách, v štítoch, v zemi aj v hradbách**; šípy zo zeme sa **zbierajú prechodom** cez ne. Strelci AI mieria v oblúku a predbiehajú bežiaci cieľ. Kuša sa **nabíja len postojačky**.
- **Zásah do hlavy**: obyčajný vojak padne na mieste – **prilba dá šancu prežiť** (lepšia prilba väčšiu, pri údere na blízko ešte väčšiu). Hrdina, spoločníci, bossovia a obri (trollovia, olifanty, enti, Nazgûl) dostanú do hlavy **trojnásobné zranenie** (prilba hrdinu ho znižuje). Ruka −25 %, noha −20 %.
- **Miesto zásahu na blízko**: úder zhora mieri skôr na hlavu, bod podľa výšky mierenia (hore hlava, dole nohy), sek zboku trup a ruky; jazdec trafí pešiaka do hlavy ľahšie, pešiak jazdca skôr do nôh alebo do koňa.
- **Typy poškodenia**: sečné (meče, sekery) – +15 % proti nechráneným, −25 % proti plátu; bodné (kopije, šípy, bod) – prejde brnením; tupé (kyjaky, palcáty, kopnutie) – +8 % proti plátu a vojaka často len **omráči**: omráčení nepriatelia sú po víťazstve tvoji **zajatci**.
- **Techniky**: **kopnutie (Y)** zapotáca nepriateľa a prerazí mu kryt (troll sa ani nepohne); **kryt útokom** – keď začneš úder v rovnakom smere, odkiaľ ide úder nepriateľa (červená šípka), v pravú chvíľu ho odrazíš a tvoj úder prejde; **príliš blízko** zasiahne zbraň len rúčkou (kopija bodom vôbec), obojručné zbrane a kopije potrebujú odstup; **sek zboku sa zarazí** o hradby alebo o vlastného vojaka v ceste.
- **Kôň**: má **zotrvačnosť** (rozbeh a dobeh) a **obratnosť podľa plemena** (poník je obratný, bojový kôň ťažkopádnejší); pred šíkom kopijníkov sa **vzopne**. Nový **jazdecký lukostrelec z Rhûnu** krúži okolo nepriateľa vo vzdialenosti streľby a strieľa z koňa.
- **Hlásenia ako vo Warbande** vľavo dole: „Zásah do hlavy: 54 zranenia“, „Zabil si: Uruk“, „Omráčil si: Ork“, „Dostal si zásah do nohy: 12“, pád spoločníka.
- **Grafika boja**: pri ťažkom údere, zásahu do hlavy a zabití sa obraz **na okamih zastaví**; pri zabití šípom do hlavy sa hra krátko **spomalí**; vojak sa **zapotáca v smere úderu** a padne podľa zásahu (do nohy najprv na koleno, do hlavy hneď dozadu); zo štítov lietajú **triesky**, pri zlomení štítu sa rozletí na kusy; kov o kov iskrí a zvoní, zásah do tela znie tupo; pri **málo zdravia** sa okraj obrazovky farbí do červena.

## Grafika 3D bitky (veľký grafický update)

Všetko je kreslené kódom, bez cudzích modelov a obrázkov (`js/engine/3d/b3d.js`, pomocník `js/engine/3d/b3dgfx.js`):

- **Postavy:** každý vojak je jedna **kostrová sieť** (hip, trup, ramená, lakte, ruky, štít, stehná, kolená, plášť) – kreslí sa naraz, takže aj stovka podrobných vojakov ide plynulo. Telo podľa **rasy**: človek, elf (štíhly, vysoký, špicaté uši), trpaslík (nízky, široký, dlhá zapletená brada), hobit, ork (zhrbený, dlhé ruky, kly, žlté oči), uruk, troll (mohutný). **Tvár** (nos, oči, obočie, ústa, uši), vlasy a brada podľa portrétu hrdinu, **prilby podľa frakcie** (gondorská vysoká s krídlami a lícnicami, rohanská s nánosníkom, zlatým pásom a konským chvostom, orkská s hrotmi, uruk s bielou rukou, trpasličia s maskou, elfská zlatá, východniarska maska, kapucne, turbany). **Kov** sa leskne a odráža oblohu, látka je matná. **Erby frakcií** (z `js/render/heraldry.js`) sú na štítoch a na zástavách, plášte a zástavy **vejú vo vetre**. Zbrane: meče, šable so zakrivenou čepeľou, sekery, kopije s listovým hrotom, kyjaky s hrotmi, luk s tetivou, kuša; lukostrelci nosia tulec.
- **Animácie:** chôdza a beh s kolenami, predklon v behu, dýchanie a prešľapovanie v pokoji, trhnutie pri zásahu (krv len ak je zapnutá v Nastaveniach), **pád podľa smeru** – kolená sa podlomia a vojak padne od útočníka. **Kone a vargovia** majú kĺby (koleno vpredu, hlezno vzadu) a tri chôdze: **krok, klus, cval** (s hojdaním tela), hlava kýva, chvost sa dvíha v cvale; jazdec sedí v sedle a hojdá sa s koňom. Gondorský kôň má strieborné brnenie a čaprak, varg strapatý chrbát a kly.
- **Krajina:** terén s detailnou textúrou (tráva, hlina, skala na svahoch), **rozdupané blato** tam, kde sa bojuje a jazdí, **spálenina** po ohni; **tráva s kvetmi** okolo kamery sa vlní vo vetre a ohýba pod vojakmi a koňmi; **duby, brezy, smreky, mŕtve stromy a kríky** sa hojdajú vo vetre, pod korunami je tieň; **balvany s machom** (alebo snehom), **cesta s plotmi**; **voda** v rieke s vlnami, odrazom oblohy a penou pri brehu, **špliechanie** pri brodení a pri šípoch.
- **Svetlo a obloha:** obloha s **mrakmi a slnkom podľa dennej doby** v hre (ráno a večer teplé nízke slnko, v noci hviezdy a mesiac), tiene, **žiara** okolo ohňa a fakieľ, **lúče slnka**, filmové tónovanie, **farebné ladenie podľa krajiny** (zlatý Rohan, chladný Gondor, červený Mordor, sivý Isengard, horúci Harad, zlatozelený Lórien…), noc v modrom mesačnom svetle, v daždi mokrá lesklá zem a kaluže, mäkké tiene pod vojakmi.
- **Efekty:** **stopa čepele** pri seku (hrdina a útočníci pri kamere), **iskry so zábleskom svetla** pri kryte, prach za jazdou, **para z nozdier** koní v zime a v noci, horiaca zem po dračom ohni s iskrami a dymom, žeravý popol v Mordore, žeravé koše na hradbách v noci.
- **Kamera:** **nálet nad bojiskom** na začiatku bitky (od nepriateľského vojska až za hrdinu; preskočí ho klik alebo kláves, vypína sa v Nastaveniach), **spomalenie** pri páde bossa alebo nepriateľského veliteľa s pohľadom na padlého, rozšírenie záberu v cvale a pri nápore, **fotorežim (P)**: hra stojí, rozhranie zmizne, kamera voľne lieta (WASD, Q/E výška, Shift rýchlo, ťahanie myšou), P alebo Esc ho ukončí.
- **Výkon a kvalita:** Nastavenia → **Grafika 3D bitky: nízka / stredná / vysoká / ultra**. Nízka = jednoduché ploché tieňovanie bez trávy a dodatočného spracovania (pre slabé počítače), stredná = tráva (9 000 trsov), žiara a tiene, vysoká (predvolená) = vyhladenie hrán, ostrejšie tiene, lúče slnka, 20 000 trsov trávy, ultra = 42 000 trsov a najostrejšie tiene. Detail tvárí a prilieb sa na diaľku skryje.

## Grafika postáv kódom (verzia 56)

- **Ruky:** okrúhla dlaň s vypuklými hánkami a kožený náramok na zápästí (predtým hranatý kváder).
- **Meče:** čepeľ má **ryhu** uprostred a **svetlejšie brúsené hrany**, parierka má guľové konce, pomelo je guľaté a rukoväť je **omotaná** koženým remienkom.
- **Materiály postáv** (`js/engine/3d/b3dgfx.js`, `chrPatch`): vzor krúžkovej košele a tkaniny je **jemnejší** (menej moaré zblízka), pridané **ambient occlusion** podľa smeru povrchu (pod rukami, pod hruďou je tmavšie) a **okrajové svetlo** (studený lem po obryse), ktoré postavu odlíši od pozadia. Kov má väčší lesk a odraz oblohy.
- **Druhá dávka (verzia 57):** plášť má **golier, zlatú sponu na krku a záhyby na pleciach**; čižmy majú **svetlejšie manžety** pod kolenom; lícnice prilieb sú zaoblené (nie ploché kvádre); vojaci majú **6 farieb vlasov** namiesto 4 (zároveň sa pestrejšie delia sekery, kyjaky a holé hlavy, ako predtým).
- **Záblesk pri zásahu (verzia 58):** zasiahnutá postava sa na okamih zablysne teplým svetlom (uniform `uFlash` v `chrPatch`, nastavuje ho `o.hit` v `js/engine/3d/b3d.js`), takže zásah je vidieť aj na diaľku. Ostatné efekty boja (iskry, triesky, prach, zapichnuté šípy, stopy v blate, pohyb tela pri zásahu) už v hre boli.
- Poznámka: ďalej má zmysel zaoblenie ostatných prilieb a štítov, doplnky (pláštenky, popruhy, tulce) a efekty boja.

## Postavy z modelov Meshy – odstránené (verzia 55)

Všetky modely z Meshy (telá postáv, kone, netvory, zbrane a brnenia dobra) sú **z hry odstránené**, aby sa zmenšila: plná aj odľahčená zostava majú teraz spolu **≈ 10,1 MB** (predtým 19,2 MB a 15,9 MB). Postavy, kone, netvory, zbrane a brnenia sa kreslia **kódom** (`js/engine/3d/b3d.js`, `b3dgfx.js`), ako pred modelmi. Kód načítania modelov ostal (každý model sa hľadá cez `typeof MODEL_… !== 'undefined'`), takže po vrátení súborov `js/data/model_*.js` a značiek `<script>` sa modely znova použijú. Súbory sú v histórii gitu vo vetve `historia` (commit pred `74adbe4`, napr. `git checkout 74adbe4^ -- js/data`), importér (`tools/model_import.py`, `tools/import_all_models.sh`) a prispôsobenie brnení (`js/engine/garment.js`) sú z repozitára odstránené (ostali v lokálnej vetve `historia`); pôvodné GLB sú mimo repozitára. Nastavenie „Telá postáv z modelov“ je preto zrušené. Nasledujúce sekcie o modeloch (verzia 48 – 52) opisujú, ako fungovali.

## Postavy z modelov Meshy (verzia 48–50)

- **Pätnásť modelov** (A-póza, s textúrou) z Meshy je v 3D bitke: **človek, elf, trpaslík, hobit, ork, uruk-hai, troll, Nazgûl, Kráľ trollov**; zvieratá a bossovia **varg s jazdcom, olifant s vežou, ent, drak, Balrog, okrídlená šelma**. Brnenie, kabátce, prilby, zbrane a štíty ostávajú z hry a menia sa podľa výbavy a frakcie (vylepšovanie jednotiek ostáva). Pri ľuďoch, elfoch, trpaslíkoch a hobitoch je textúra modelu len na koži (tvár, krk, ruky), zvyšok tela nesie zbroj vo farbách jednotky; orkovia, uruci, trollovia a Nazgûl sa kreslia celí textúrou modelu (prilba a vlasy sú v modeli). Všetky textúry sú v **jednom atlase** (4×4 políčka po 512 px), takže všetky textúrované telá kreslí jeden materiál – aj vzdialené zástupy.
- **Zvieratá a bossovia** majú kostru podľa druhu (olifant: telo, hlava, štyri nohy; ent: telo, nohy, ruky; drak, Balrog a šelma: telo a dve krídla; varg: kostra herného vlka), váhy kostí z úsečiek, a hýbe ich rovnaký kód ako doteraz (chôdza, mávanie krídel, bič a oheň Balroga, vežička olifanta je súčasť modelu).
- **Import:** `sh tools/import_all_models.sh /priečinok/s/glb` zavolá `tools/model_import.py` pre každý model (humanoidi `--race=…`, zvieratá `--kind=beast`) a vyrobí plné dáta do `js/data/` aj **odľahčené** do `js/data/lite/` (`--lite=0.45 --tex=256`: menej vrcholov so zachovanými švami textúry, textúra 256 px).
- **Dve zostavy:** `python3 tools/build_single.py` → `dist/vojvodca-single.html` (plná, ~17 MB, pre PC a vlastný hosting) a `python3 tools/build_single.py --lite` → `dist/vojvodca-single-lite.html` (~14,6 MB, zverejnená ako artefakt – limit 16 MB). Zdrojová aj počítačová verzia používajú plné modely.
- **Kone z modelov** (verzia 50): **poník zo Shiru, rohanský kôň, gondorský bojový kôň** (s pancierom a Bielym stromom) a **Mearas** (bez sedla). Sedlo a postroj sú v modeli, kostru herného koňa (telo, krk, hlava, chvost, nohy s kĺbmi) dostanú v hre, takže kráčajú, klušú, cválajú a vzpínajú sa ako doteraz. Hráčov kôň podľa kúpeného vylepšenia (Poník → poník, Rohanský kôň → rohanský, Gondorský bojový kôň → gondorský, Mearas → Mearas; **Čierny kôň Mordoru** je gondorský bojový kôň so stmavenou textúrou, **Kôň nazgûla** stmavený Mearas); jazdci Gondoru a Dol Amrothu majú gondorský kôň, ostatní jazdci rohanský, Nazgûl čierneho Mearasa. Import: `--kind=beast --race=rohan`, gondorský `--fwd=-x` (model pozerá na -x). Atlas textúr je 4 stĺpce × potrebný počet riadkov.
- **Zbrane dobra z modelov** (verzia 51): všetkých desať zbraní dobra od kováča – **Železný meč, Meč Gondorskej stráže, Rohanská kopija, Dúnadanský meč, Orcrist, Trpasličia sekera z Ereboru, Glamdring, Plameň Anoru, Andúril, Gondorský obojručný meč**. Hrdina a spoločníci nesú model podľa zbrane vo výbave; vojaci dobra (Gondor, Rohan, Erebor, Lothlórien a tvoje vojsko, ak stojíš na strane dobra): pešiak a jazdec Železný meč, **vylepšený veterán Meč Gondorskej stráže**, kopijníci Rohanskú kopiju, trpaslíci sekeru z Ereboru, elfskí šermiari Orcrist. Zlo a banditi majú zatiaľ zbrane kreslené kódom (čakajú na modely zla). Import `--kind=prop` (`--grip=sword` rukoväť hore, `--grip=pole --at=…` hrot hore a výška úchopu, dĺžka v jednotkách hry): textúra z Meshy je rozdelená na stovky ostrovov, preto sa **farby zapečú do vrcholov**, oceľ a zlato sa označia na **kovový lesk** a sieť sa zjednoduší na ~1 600 trojuholníkov (vzdialený zástup ~250, odľahčená zostava ~900). Zbraň zostane ležať na zemi aj pri páde vojaka.
- **Brnenia dobra z modelov** (verzia 52): **Kožený odev, Rohanská krúžková zbroj, Gondorský plát, Galadrimská šupinová zbroj, Plát z Ereboru, Mithrilová košeľa**. Hrdina a spoločníci podľa brnenia vo výbave; vojaci dobra: trpaslíci Plát z Ereboru, elfovia Galadrimskú šupinovú, Strážca Citadely a rytieri Dol Amrothu Gondorský plát, **veterán** (vylepšený pešiak) a jazdci Rohanu Rohanskú krúžkovú, lukostrelci a hraničiari Kožený odev; bežný pešiak a jazdec majú zatiaľ zbroj kreslenú kódom. Brnenie je samostatný odev z Meshy (`--kind=garment`): importér odstráni **stojan figuríny** (valec pod vodorovným viečkom navrchu), zapečie farby do vrcholov (kov sa leskne) a zjednoduší sieť (~4 000 trojuholníkov, odľahčená 1 800). V hre ho `js/engine/garment.js` **prispôsobí telu rasy**: mierka podľa pliec a hrude, výstrih ku krku, kratší pri trpaslíkovi; rukávy (časti, ktorých najbližšie miesto tela je ruka) sa natočia okolo ramena na smer ruky a pritiahnu k zápästiu; odev sa **odsadí od kože** a prevezme **váhy kostí z najbližšieho vrcholu tela** (bez hlavy a brady), takže sa hýbe s telom vrátane šosov nad nohami. Kabátec vo farbe frakcie, opasok a náplecníky kreslené kódom sa pod brnením z modelu nekreslia.
- Nastavenia → **Telá postáv z modelov (Meshy)** vypne modely (telá, zbrane a brnenia tvarované kódom).

## Štvrtý veľký grafický update 3D boja (verzia 47)

- **Tvarované telá:** postavy ľudí, elfov, trpaslíkov, orkov, urukov a trollov a telá koní už nie sú poskladané z valcov a gúľ – telo sa pri načítaní **vymodeluje kódom**: hladko zliate elipsoidy a kužeľové valce (hruď s prsnými svalmi, ramená s bicepsom, stehná, lýtka, krk; u koňa trup, hruď, zadok, svalnaté nohy s kĺbmi, hlava s nozdrami) sa premenia na súvislý povrch (SDF → *surface nets*), váhy kostí sa počítajú zo vzdialenosti ku kostiam, takže sa telo ohýba plynulo. Každá rasa má vlastnú mohutnosť (troll najmasívnejší, elf štíhly). Telo sa farbí podľa oblasti (brnenie, rukávy, nohavice, čižmy, koža).
- **Textúry kódom s reliéfom:** krúžky košele, väzba látky, koža so švami, plát s rytinami, hrdza a elfské ornamenty majú aj **reliéf vo svetle**; štíty sú z **dosiek s kovanými klincami**, na kabátci je **vyšitý erb frakcie**.
- **Fyzika:** padlí pri kamere sú **handrové bábky** (13 bodov tela s väzbami, gravitácia, zem, svah) – telo sa preváži, kotúľa, dopadne a **nepretína sa s inými padlými** (ležia jeden cez druhého); **ľavá ruka drží kopiju a obojručný meč** (inverzná kinematika ramena); štít sa natáča k súperovi; **kopija sa pri náraze jazdy zlomí** (o chvíľu má jazdec novú); v štítoch pribúdajú **zárezy a diery**; v šíku sa vojaci **tlačia** – predklon, štít vpred, zapreté nohy.
- **Krajina:** **ryhy a zvlnenie** terénu, **potok** cez niektoré bojiská (s brodením a penou), **padnuté kmene a paprade** pri lesoch, **ročné obdobia podľa dňa v hre** (jarné kvety, jesenné lístie a tráva, zimná námraza), **živá rieka** – prúd, pena a vlny okolo nôh a koní.
- **Nebo a vzduch:** **objemové mraky** (na vysokej a ultra) s tieňom vo vnútri a presvetlením od slnka, **hmla v chuchvalcoch**, ktoré sa pohybujú, **tiene dymu** z požiarov na zemi.
- **Svetlo:** na ultra **brnenie odráža skutočné okolie** (kocková kamera pri hrdinovi) a **oheň vrhá tiene**; svetlo odrazené od zeme podľa kraja (tráva, sneh, púšť).
- **Kamera:** pri nástupe do bitky a v spomalení **širokouhlé filmové pásy** a jemné **chvenie z ruky**, pri náraze jazdy sa **ostrenie presúva** z útočníka na zasiahnutého.
- **Rozkazy viditeľné v boji:** pri zmene rozkazu **zatrúbi trúbka**, **zástavy plukov zamávajú** a **velitelia, zástavníci a hrdina ukážu mečom** smer.

## Tretí veľký grafický update 3D boja (verzia 46)

- **Živé vojská aj v diaľke:** vzdialení vojaci (v spoločnej sieti) už nestoja ako sochy – chôdzu, beh, údery, jazdca v sedle a kroky koní počíta **grafická karta** z reťazí končatín (atribúty `aCls`, `aP1`, `aP2` a `aAnim` inštancie). Nad každým plukom (pechota, lukostrelci, jazda každej strany) sa vznáša **veľká zástava frakcie**, kým sa vojská blížia, bijú **vojnové bubny**.
- **Postavy:** zaoblené diely namiesto kociek (telo, čižmy, nos, sánka, pramene vlasov), **prilby vyššie – oči sú vidieť**, lícne kosti, brada, pery, orkské jazvy, pramene brady; **ruky s prstami** okolo rukoväte a palcom (pri plátovej zbroji rukavice); **vrstvená zbroj**: chlopne kabátca vejú v behu, mešec a dýka na opasku, dvojité náplecníky; kone s vejúcou hrivou a chvostom a s uzdou.
- **Boj:** **iskry presne v mieste stretu** zbrane so štítom či čepeľou, **výkrok do úderu** s dotočením trupu, **odsunutie** telom pri zásahu, **reakcia podľa miesta zásahu** (hlava trhne dozadu, ruka sa chytí za ruku, noha podklesne), **rôzne pády** (dozadu, tvárou dopredu, zrútenie na kolená, s otočkou, na bok), **jazdec padá z koňa** a splašený kôň odbehne a potom sa pasie, **náraz jazdy** odhodí pešiaka s trieskami z kopije (pri kamere s krátkym spomalením), **lukostrelci siahajú do tulca**, zakladajú šíp a napínajú.
- **Bojisko:** tábory za líniami (stany s vlajočkami, ohniská s ohňom a dymom, vozy so sudmi), **barikády a rady kolíkov**, zrúcaniny s kvádrami, útesy za okrajom; **rozbitné** – vojaci a kone cez ne prejdú a rozbijú ich (stan sa zrúti, voz prevráti); **pošliapaná a spálená tráva ostane ležať**; **tiene mrakov** putujú po krajine; **slnko počas bitky pomaly klesá** a teplie; **sneh sa ukladá** na plecia a prilby, po brnení **stekajú stružky dažďa**.
- **Filmové momenty:** **nástup do bitky** – vojská stoja v šíkoch, kamera prejde popred tvoje rady, preletí k nepriateľovi a vráti sa za hrdinu, potom **roh a pokrik** a boj sa začne (preskočí sa klikom alebo klávesom); Balrog má **ohnivý bič**, drak a Balrog chrlia **prúd ohňa, ktorý sa valí po zemi**, olifanty nesú **vežičku s lukostrelcami**.
- **Obliehanie:** **trebuchety** za útočníkmi vrhajú kamene na hradby (praskliny, sutiny) a veže – po troch zásahoch sa **veža zrúti**; **obliehacia veža môže vzbĺknuť**; hradby a veže z kvádrov.
- **Svetlo:** tiene pokrývajú väčšiu časť bojiska (vysoká ±400, ultra ±560), **odraz na mokrej zemi** v daždi (v obraze), **chvenie horúceho vzduchu** nad ohňami, ladenie tieňov a svetiel podľa dennej doby, **plamene ako jazyky** a dym osvetlený zhora, **časové vyhladenie (TAA)** proti blikaniu trávy a krúžkov (predvolene na ultra, Nastavenia → Časové vyhladenie), hĺbka ostrosti vo fotorežime zaostruje na stred obrazu.

## Plynulý boj a načítavacia obrazovka (verzia 45)

- **Načítavacia obrazovka pred bitkou** (`js/ui/loading.js`, kreslená kódom): súmrak nad horami (v Mordore sopka s dymom), pevnosť na kopci, dve vojská so zástavami vo farbách frakcií proti sebe, salva šípov a iskry, **zlatý prsteň** nad nadpisom; ukáže druh bitky, miesto, nepriateľa, počty vojsk, počasie, radu do boja a priebeh príprav. Kým je hore, postaví sa bojisko, všetci vojaci a **vopred sa skompilujú shadery** všetkých efektov (vzdialené zástupy, padnuté zbrane, stopy čepele, blesky, šípy, tiene, odraz), takže sa už nekompilujú uprostred boja. Ukazuje aj autora hry.
- **Úvod a načítanie hry** (`assets/menu.webp`, `assets/nacitanie.webp`): za hlavným menu je ilustrácia bojiska Gondor proti Mordoru s pomalým priblížením a posunom (nenáročné na výkon, žiadne 3D); prvé načítanie hry ukazuje ilustráciu s názvom a trvá aspoň 4 s. Ak sa obrázok nenačíta, ostane pôvodná 2D animácia.
- **Odstránené sekanie v boji:**
  - zastavenie obrazu pri ťažkom údere je predvolene vypnuté (Nastavenia → Zastavenie obrazu pri ťažkom údere); spomalenie ostáva,
  - všetci vojaci zdieľajú materiály (menej prepínania stavu grafickej karty), guľa pre orezanie sa berie zo šablóny (three.js ju inak počítal z každého vrcholu cez kosti),
  - mierenie a klik na zem idú krokovaním po výške terénu namiesto prechádzania tisícok trojuholníkov každú snímku,
  - častice (iskry, prach, dym) už v každej snímke nevytvárajú nové farby (menej upratovania pamäte), veľkosť pri kamere je obmedzená a pri kamere sa strácajú; menej prachu pri nápore jazdy,
  - hlásenia vľavo dole sa neprekresľujú každú snímku, šípy nevrhajú tiene, tiene sa vo veľkej bitke počítajú každú druhú snímku, automatická kvalita mení stupeň pokojnejšie.
- Blato na postavách je teraz spoločné pre celé bojisko (pribúda počas bitky).

## Veľké bitky a druhý grafický update 3D boja (verzia 44)

- **Veľké bitky:** Nastavenia → **Veľkosť bitiek**: normálna (do ~150 vojakov), **veľká** (predvolená, do ~350) a **obrovská** (500 a viac). Násobia sa limity tvojich oddielov, spojencov, posádky aj nepriateľov, ktorí sa pridajú. Vzdialení vojaci sa kreslia **v jednej spoločnej sieti** pre každý vzhľad (bez kostí), blízki majú plné kostrové animácie, takže aj 500 vojakov ide plynulo. V obrovskej bitke vojaci hľadajú najbližšieho nepriateľa len občas (rozložené v čase).
- **Automatická kvalita** (Nastavenia, predvolene zapnutá): keď snímky klesnú pod ~27 za sekundu, postupne zníži rozlíšenie, vzdialenosť plných modelov, vypne zatienenie v kútoch, odraz v rieke a hĺbku ostrosti a zriedi trávu; keď je rezerva, kvalitu vráti. **Počítadlo snímok (FPS)** vpravo hore ukáže aj počet vojakov a stupeň zníženia.
- **Postavy:** **plynulé kĺby** (lakte, kolená, bedrá, ramená a krk koňa sa ohýbajú hladko, vrcholy pri kĺbe patria dvom kostiam), **materiály kreslené kódom**: krúžková košeľa s krúžkami, tkanina s väzbou, koža, doškrabaný plát, **hrdzavé orkské železo**, elfské zlaté ornamenty; **blato a prach sa počas bitky lepia** na nohy, výstroj aj kone (v snehu šedé, na púšti piesok); v daždi sú postavy tmavšie a lesklejšie. **Každý vojak je trochu iný**: výška, odtieň výstroje, časť pešiakov nesie sekeru alebo kyjak, niektorí sú bez prilby. **Výraz tváre**: pri útoku a pokriku otvorené ústa, pri zásahu bolesť, žmurkanie, mŕtvi majú zatvorené oči. **Plášte a zástavy na pružine** – vejú v behu, rozhojdajú sa pri otočke a dobiehajú pri zastavení.
- **Pohyb:** **nohy na svahu** (inverzná kinematika: nižšia noha nesie váhu, vyššia sa pokrčí), **pád ako handrová bábka** (telo sa preváži, dopadne, odrazí, končatiny dobiehajú; na strmom svahu sa zošmykne), **plynulé prechody medzi pózami**, **spätný ráz zbrane** od krytu, **živý zástup** (nečinní búchajú zbraňou do štítov v rytme, pokrikujú a dvíhajú zbrane, rozhliadajú sa; pod šípmi **dvíhajú štíty nad hlavu**; po víťazstve **jasajú**), **kone** v pokoji spásajú trávu, pohodia hlavou a hrabú kopytom, pri zásahu sa **splašia**. Z mŕtvych **vypadne zbraň** (a niekedy štít) a ostane ležať na zemi.
- **Okolie:** **vzdialené hory so snehom** podľa kraja (púšť: stolové hory, Mordor: **sopka so žeravým kráterom a dymom**), **hrad na kopci**, lesy na obzore, **dym z dedín**, opar vzdušnej perspektívy; **stopy v blate a snehu** (ľudské aj kopytá), **kŕdle vtákov**, **lístie vo vetre** (na púšti piesok); **počasie sa počas bitky mení** (jasno → dážď → búrka a späť, mení sa aj dostrel lukov) s **bleskami** a hromom; **krúžky od kvapiek** na rieke a v kalužiach (kaluže sa v daždi naplnia); **hradby z kvádrov s maltou**, machom a vlhkom pri zemi; pri obliehaní **začnú horieť strechy** domov na nádvorí.
- **Svetlo:** **zatienenie v kútoch** (SSAO – medzi vojakmi, pod štítmi, pri hradbách), **odraz brehu a vojakov v rieke**, **prízemná hmla, ktorú presvetľuje slnko** (ráno, v daždi, v hmle), **prispôsobenie oka** jasu (po blesku, v tme, proti slnku), voliteľne **rozmazanie pohybu**, **hĺbka ostrosti** vo fotorežime a v spomalení a **filmové zrno**.
- **Efekty:** **stopy šípov** vo vzduchu (salvy sú vidieť), pri nápore jazdy **valiace sa mračno prachu** (v daždi blato, v snehu prašan), **oheň sa šíri suchou trávou** (dážď ho hasí), triesky a kusy štítov aj zbrane ostávajú ležať.
- **Krv:** predvolene **vypnutá** (Nastavenia → Krv v bitke); nové efekty krv nepoužívajú, na postavách sa hromadí len blato a prach. Spomalenie pri zásahu do hlavy a páde veliteľa ostáva.

## Lukostrelci a ukazovateľ útokov (verzia 60)

- **Lukostrelci AI netrafia každý šíp** (`aiShoot`, `aiBow` v `js/sim/warband.js`): najprv **mieria** asi pol sekundy (30 – 50 snímok), potom vystrelia a dlhšie dobíjajú (80 – 120 snímok namiesto 75). Rozptyl rastie so **vzdialenosťou**, s **behom cieľa** a pri streľbe z koňa; elfovia a zručnejší (`aiSkill`) strieľajú presnejšie. Vedenie pred bežiaci cieľ je nepresné (strelec len odhaduje, kam sa pohne). Test: pri stojacom hrdinovi na 100 jednotiek trafí asi 40 % šípov (predtým takmer všetky).
- **Ukazovateľ útokov zo všetkých strán** (`js/engine/scenes/UIScene.js`, nastavenie „Ukazovateľ útokov okolo zameriavača“): okolo zameriavača sa v smere, odkiaľ ide úder, zobrazí **červený trojuholník**, ktorý rastie až do dopadu (až 5 útočníkov naraz, aj zozadu a zboku); lukostrelec, ktorý na teba mieri, má **oranžový trojuholník** so spojnicou k zameriavaču. Smer úderu (zľava, sprava, zhora, bod) ukazuje ako doteraz červená šípka pod zameriavačom a póza útočníka.
- **Dokonalý kryt s odozvou** (`meleeHit`): kryt tesne pred dopadom zapotáca útočníka a teraz to aj **vidno a cítiť** – veľký zlatý nápis „DOKONALÝ KRYT“, hlásenie vľavo dole, záchvev kamery a zvuk (predtým len raz za bitku text).
- **Vojaci čítajú nápriah**: obranca si smer úderu všimne po **reakčnom čase** (22 snímok, zručný až 10). Ak držíš nápriah dlhšie (väčšia sila), zručný vojak ho prečíta a kryje častejšie (až 85 %); **rýchly úder ho zaskočí** (kryje o pätinu menej). Silný nápriah sa teda oplatí len keď je súper zaneprázdnený.
- **Pohyb v dosahu zbrane** (`aiLen`, `aiStop`, `aiSpacing`): vojak sa zastaví na dosah svojej zbrane (kopija ďalej, sekera bližšie). **Kopijník pri príliš malom odstupe cúva** a drží súpera na dĺžku kopije; **zručnejší vojak pri dobíjaní robí úkroky do strany** a stále sa pohybuje, slabý stojí. Bitky sa stále normálne končia (kontrola 10 bitiek na 4 frakcie).
- **Úprava ukazovateľov (verzia 63):** červený vyplnený oblúk na zemi pod útočníkmi (pri viacerých sa zlial do veľkej červenej plochy, ktorá pripomínala krv) nahradil **tenký oranžový oblúk** (zlatý, ak útok mieri na hrdinu); trojuholníky okolo zameriavača sú **menšie a bližšie** (okruh 15 % výšky obrazovky).
- **Postavy a výbava (verzia 64):** osem **variantov tváre** (tón pleti, nos, obočie, jazvy, pehy), osem farieb vlasov a šesť účesov (ostrihaná hlava, drdol, copánok, cop, kučery, strapec), strniská, kozia briadka a plná brada; **šerpa a náramenná páska vo farbe frakcie**, farebný chochol na prilbe a hrebeň; **elitné jednotky** majú plátové náramenníky so zlatým lemom, šosy a zlatý chochol; kolčugová kapucňa na krku; **štíty** s nitmi, hrotom alebo kovovými pásmi, kopijovitý štít s hrebeňom; **meče** s rôznymi záštitami (guľový záver, zahnuté ramená) a pošvou na boku, sekery s objímkami, kopije s kovovým prstencom a strapcami vo farbe frakcie; **kone** majú ohlávku s remienkami, prsný remeň, stuhu v chvoste a sedlovú dečku; chôdza má protismerné otáčanie ramien a bokov a v pokoji sa postavy kolíšu z nohy na nohu.
- **Zlé strany, elfovia, trpaslíci, štíty (verzia 65):** orkovia a uruci majú **bojovú maľbu**, rôzne kly, hroty na ramenách, handrový pás a zubaté čepele; elfovia diadém s drahokamom alebo náušnice; trpaslíci huňaté obočie a zlaté krúžky na bradách; štíty majú **opotrebenie** (záplata, prasklina, vyštrbený okraj).
- **Mapa a prostredie (verzia 66):** terén má veľké **škvrny vyschnutej trávy, machu a svetlých lúk**; **lúčne kvety** v zhlukoch (farby podľa ročného obdobia), **trstina a rôpa** pri potoku a rieke, **pne so sekerou**, kopy kameňov, **kruh stojacich kameňov**, kopy sena a balíky, **studňa** a **vyhorená chatrč** (kopy sena a chatrč sa pri prechode vojska rozbijú). Štíty: stredový hrebeň je tenší a leží pod erbom.
- **Atmosféra (verzia 68):** nízke **pásy hmly** nad zemou (hustejšie pri vode a za súmraku, pomaly plynú), **lúče slnka** cez deň pri jasnom nebi (od vysokej kvality) a **padajúce lístie** na jeseň a **lupene** na jar okolo kamery.
- **Hrady a obliehanie (verzia 69):** veže majú **cimburie**, kamenné pásy a okná; múr má **opory**, brána pilastre, preklad a klenák oblúka; na múre visia **zástavy obrancov**; na nádvorí je **trhovisko s farebnými prístreškami**, sudy a debny, domy majú komíny, hrazdené priečelie, dvere a okná (v noci svietia).
- **Telá a materiály (verzia 70):** osem **telesných variantov** (štíhly, drobný, svalnatý, vysoký, mohutný, žilnatý…) so zmenou šírky, výšky, nôh a rúk, plus detailnejšie svalstvo (trapézy, sedacie svaly, stehná, predlaktia); **jemnejšia kolčuga**, ktorá z diaľky nezrní, látka s kepermi, záhybmi a ošúchanými miestami, **vyleštený plát** s brúsenými pásmi, nový **šupinový materiál** na šošoch elitných jednotiek; elita nosí plátové brnenie.
- **Váha brnenia a paleta frakcií (verzia 71):** **ľahké** jednotky (lukostrelci) majú kožený kyrys s remenmi, **ťažké** (jazda, elita, obri) plátový kyrys s rebrom, nákrčník a ochrany predlaktí; hrdina v kovovej zbroji dostane nákrčník a ochrany; doplnková farba frakcie (zlatá pre dobro, bronzová pre zlo) na ozdobách; kopije majú tri tvary hrotu a sekery môžu mať dvojitú čepeľ.
- **Tváre a prilby (verzia 72):** prepracované tváre: **oči** s bielkom, farebnou dúhovkou (hnedá, modrá, zelená, sivá), zrenicou, odleskom a viečkom (ork má štrbinovú zrenicu), **nos** s koreňom, špičkou, krídlami a nozdrami, oblúk obočia, **pery** (horná tmavšia, dolná plnšia), menšie lícne kosti; **obočie sa hýbe** (pri pokriku klesá, pri bolesti sa dvíha); štyri typy prilieb (kotlík, špicatá s pásmi, barbuta s T-štrbinou, otvorená s chráničom šije); prilby majú plátový materiál namiesto kolčugy; kolčuga je ešte jemnejšia; trapézy pod hranicou kože.
- **Hlava zo SDF (verzia 73):** hlava už nie je guľa, ale **hladko zliaty tvar**: lebka, stredná časť tváre, sánka s uhlami, brada, lícne kosti a obočnicové oblúky; tvar sa líši podľa variantu (širšia/užšia čeľusť, výraznejšie lícne kosti a obočie) a rasy (ork má silnejšiu čeľusť, elf užšiu, trpaslík výraznejšiu bradu). Každá hlava sa vytvorí raz (~50 ms) a uloží do pamäte.
- **Detailnejšia tvár (verzia 74):** **nos** (koreň, špička, krídla) a **uši** (ušnica s chrupavkou) sú súčasťou hlavy zo SDF; **očné jamky** (oko je zapustené, nad ním tieň viečka); obočie z dvoch častí (vnútorná a vonkajšia, vonkajšia sklopená); v ústach **zuby a jazyk** (vidno pri pokriku; orkovia žltšie zuby); odkrytá koža len na krku, nie na hrudi.
- **Ruky a nohy (verzia 75):** prsty majú **kĺby**, nekovové ruky nosia **koženú rukavicu** s manžetou a pásikom vo frakčnej farbe; čižmy majú **podrážku, pätu, zaoblenú špičku** a dva **remienky** s prackami.
- **Plynulejšie načítanie a čistejšie látky (verzia 76):** pri načítaní bitky sa vopred vypočítajú varianty tvárí (SDF hláv) pre všetky druhy vojakov, takže noví bojovníci sa neskôr objavia bez zaseknutia; vzor látky a kože zblízka už nezrní.
- **Výbava hrdinu (verzia 77):** hrdina bez prilby nosí koženú čelenku s kovovou ozdobou, a ak nemá hrudné brnenie, aj kožený ramenný popruh a váčok na opasku.
- **Kúpená výbava v 3D boji (verzia 78):** brnenie hrdinu sa v boji mení podľa triedy – ľahké je kožené, stredné má pevnejšiu košeľu, ťažké plátový náprsník a najlepšie (Plát z Ereboru, Mithrilová košeľa) aj zlaté náramenníky a tassety. Kôň, varg, prilba, štít a zbraň sa v boji zobrazujú podľa toho, čo hrdina nosí.
- **Prach pod nohami (verzia 79):** pri behu pechoty a jazdy sa z každého kroku zdvíha malý obláčik prachu vo farbe terénu (od strednej kvality vyššie).
- **Zvieratá a nestvory (verzia 80):** **varg** má dolnú čeľusť so zubami a jazykom, nos, obočie, hrivu okolo krku, chrbtový hrebeň, rozstrapkané boky, pazúry a kožené popruhy so sedlovou podložkou; **olifant** je svetlejší, má chobot z článkov s koncom, uši s vnútornou stranou, kly s bronzovými prúžkami, záhyby kože, chvost so strapcom, štíty a lať na veži, zástavu a pokrývku vo farbe frakcie, nohy s nechtami.
- **Olifant, doladenie (verzia 81):** chobot je plynulá zahnutá reťaz s vráskami a hrubým koncom, kly klesajú dole a na konci sa zakrivujú nahor, záhyby kože sú plytké miesto výčnelkov.
- **Drak a Balrog (verzia 82):** **drak** má zahnutý krk s brušnými plátmi, lebku s rohmi, zubami a obočím, šupiny a hrebeň na chrbte, mohutné nohy s pazúrmi a chvost s čepeľou; **krídla** (drak, Balrog, Nazgûlov zvierací tvar) majú kosti prstov, vykrojený okraj blany a sú osvetlené z oboch strán, takže už nie sú čierne. **Balrog** má svalnatý trup, ramená s ostňami, predlaktia s pazúrmi, rohatú hlavu s čeľusťou a zubami, kopytá a hrebeň; jeho ohnivé svetlo je slabšie, takže je vidno telo.
- **verzia 91** – rýchlejšie načítanie boja: menej variantov tvárí (4 namiesto 8, takže sa pri príprave staví menej modelov a viac sa ich využije z pamäte), krátky predvýpočet variantov (max. 4 / 0,4 s) a minimálny čas načítavacej obrazovky 1,2 s namiesto 2,2 s. Prirodzenejší pohyb na bojisku: rýchlosti pešiakov znížené o ~15 %, jazdy o ~28 %, hrdinu na koni z 3,8 na ~2,6 (cval gondorského koňa ≈ 11 m/s), pešo hrdina 2,3 → 1,5; kôň sa rozbieha asi sekundu, v cvale zatáča pomalšie a brzdí plynulejšie, otáča sa pomalšie aj vizuálne; chody koňa (krok, klus, cval) majú pevnú dĺžku kroku podľa rýchlosti, takže kopytá už nešmýkajú a nemávajú ako predtým (cval bol ≈ 17 cyklov za sekundu, teraz ≈ 2,8).
- Ovládanie boja už zodpovedalo Warbandu (ľavé tlačidlo sek, pravé kryt, smer úderu pohybom myši, koliesko mení zbraň, F kopnutie, Q luk); zmena sa ho netýka.

## Údery v 3D ako vo Warbande (verzia 95)

- **Pózy podľa druhu zbrane** (`SWP`, `swingKeys` v `js/engine/3d/b3d.js`): každý smer úderu má tri kľúčové pózy – **plný nápriah (W)**, **dopad (I)** a **dokončenie (E)** – pre jednoručné zbrane (meč, sekera, palcát, kyjak) a pre **kopiju**. Póza určuje zdvih a švih ramena, ohnutie lakťa, **zbraň v zápästí** (sklon a pootočenie ostria, kosť `wp`, poradie otočení ZYX: najprv ostrie okolo čepele, potom sklon), **vytočenie trupu** a záklon/predklon. Sek sprava: meč zdvihnutý nad pravým plecom → vodorovný sek cez telo → dokončenie vľavo; sek zľava zrkadlovo; úder zhora: čepeľ zvislo nad hlavou, trup v zakláňaní → sek vpred a dole; bod: ruka stiahnutá vpravo dozadu, hrot vpred → výpad.
- **Čas zo simulácie**: nápriah ide presne podľa `CMB.rd` (hrdina) a `u.wu` (vojaci), let čepele podľa `CMB.sw` a `u.as` (`aiSwing`), takže čepeľ v obraze prechádza cieľom v snímke zásahu. Plne natiahnutý nápriah hrdinu sa po chvíli jemne chveje. Prechody medzi pózami sú vyhladené.
- **Kopija ako vo Warbande**: len **bod zospodu** (kopija stiahnutá pri boku, výpad vodorovne na súpera) a **bod zhora** (myš hore: kopija zdvihnutá nad plece a bodnutie šikmo dole na trup). Seky zboku kopijou nie sú – hrdina s kopijou pri pohybe myši do strany bodá, vojaci s kopijou bodajú zospodu (65 %) alebo zhora; bod zhora kopijou má dosah ×1,4 a silu bodu (`heroDirectional`, `heroStrike`, `swingTick`, `aiMelee` v `js/sim/combat.js`).
- Ladenie: `B3.SWP` sa dá meniť za behu (konzola), zmena sa prejaví hneď.
- **Pohľad z prvej osoby** (`SWPF`, `FPC` v `js/engine/3d/b3d.js`): kamera sedí v hlave hrdinu, preto má prvá osoba vlastné kľúčové pózy, pri ktorých ostáva ruka a zbraň **v zábere** ako vo Warbande – nápriah sprava v pravom hornom rohu, zľava v ľavom, zhora rukoväť pri strede a čepeľ zaklonená cez horný okraj, bod a kopija zospodu sprava hrotom k súperovi, bod kopijou zhora z pravého okraja vo výške hlavy; let čepele prejde cez stred obrazu (sek sprava doľava, zľava doprava, zhora dole). `FPC` (posun kamery od hlavy, zorné pole) sa dá ladiť za behu. Oprava: póza pokoja v prvej osobe už neprepíše úder počas letu čepele (`CMB.sw`).
- Nie je zatiaľ: obojručné zbrane používajú pózy jednoručných (ľavá ruka sa drží rukoväte cez `armIK`); pri údere zhora v prvej osobe zakryje rukoväť a predlaktie na chvíľu stred obrazu.

## Tempo, kôň a prehľad v bitke (verzia 96)

- **Pomalšie tempo ako vo Warbande** (`wpnTimes`, `heroStrike`, `aiMelee` v `js/sim/combat.js`): nápriah hrdinu trvá asi dvakrát dlhšie (17 snímok jednoručnou, 20 kopijou, 24 obojručnou), let čepele asi 1,5-krát (sek 16, bod 12, obojručný 21) a zotavenie po údere je dlhšie (27, obojručná 36). Nápriah AI je 1,4-krát dlhší (22, ťažký 38), jej úder 15 až 20 snímok a pauza medzi údermi 62 až 74 – smer úderu sa dá prečítať a zablokovať. Tempo v Nastaveniach ďalej spomaľuje celú bitku.
- **Kôň ako vo Warbande** (`horseDrive` v `js/sim/warband.js`): **W** pridáva, **S** brzdí a potom kôň pomaly cúva, **A/D otáčajú koňa** (v plnom cvale pomalšie). Kôň ide len smerom svojej hlavy, **myš otáča iba jazdca a kameru** – jazdec sa v sedle natočí k cieľu (až o 75°). Opravená chyba: pri mierení myšou sa hrdina na koni hýbal aj priamo klávesmi ako pešiak, a preto kĺzal bokom. Ľavá páčka ovládača: hore/dole plyn, do strán otáčanie; dotykové ovládanie ostáva (kôň ide k prstu).
- **Kone AI** (`horseAI`): krok, ktorý vojak AI chce urobiť, sa premení na jazdu dopredu s obmedzeným otáčaním (`u.hd` = smer hlavy koňa). Kôň necúva ani nejde bokom – pri odstupe sa otočí oblúkom. Model koňa v 3D hľadí smerom `u.hd`, jazdec smerom cieľa.
- **Kompas** (`drawCombatHud` v `js/engine/scenes/UIScene.js`): pás pod silou a morálkou ukazuje svetové strany (S, V, J, Z), nepriateľov (červené stĺpiky, vyššie = viac) a tvojich (modré) v smere pohľadu ±108°. Najbližší nepriateľ má červený trojuholník a keď je mimo záberu, **na okraji obrazovky bliká červená šípka** (dole, keď je za tebou). Lišta bossa je posunutá pod kompas.
- **Krúžok pod cieľom** (`stepTgMark` v `js/engine/3d/b3d.js`): súper pod zameriavačom (ten, ktorého meno a zdravie vidíš pod zameriavačom) má pod nohami červený krúžok. Kompas aj krúžok sa dajú vypnúť v Nastaveniach (Boj).

## Krajina na mape (verzia 97)

- **Oprava – les ako čierne štvorčeky:** stromy (`tree_0`–`tree_2`, `deadtree`) boli v skupine textúr bitky, ktorá sa načítava až na pozadí. Les mapy sa niekedy zložil skôr a jeho textúra `map_trees` ostala čierna (náhradná textúra Phaseru). Teraz patria do skupiny mapy (`Art.loadTextures` v `js/engine/art.js`).
- **Zem** (`buildGround` v `js/engine/scenes/MapScene.js`): dlaždica 512 × 512 so steblami trávy, zrnkami a trsmi sa opakuje po celom svete (`grain`, TileSprite), pod ňou veľké farebné plochy podľa oblasti (`patches`: sviežejšia a vyschnutá lúka, popol Mordoru, piesočné duny na juhu, sneh na severe). Na hraniciach oblastí plochy slabnú, aby nebolo vidno šev.
- **Cesty:** mierne sa kľukatia (dve sínusovky kolmo na smer, na koncoch presne v hrade), majú vyšliapaný tmavší lem a husté body, takže ohyby sú hladké. Mosty sa kladú presne na priesečník cesty s riekou.
- **Rieka a jazero:** Anduin sa od prameňa k ústiu rozširuje (ťahy štetcom: úsečky a kruhy v kĺboch), má trávnatý a piesočný breh, hlbinu, svetlý prúd a vlnky. Jazero má breh, plytčinu a hlbinu.
- **Hory:** každá hora vrhá na zem mäkký tieň na juhovýchod (svetlo zo severozápadu ako pri reliéfe).
- **Ovzdušie** (`buildAtmos`, `drawFx`): tiene oblakov pomaly plávajú od západu (v noci zmiznú, pri zrýchlenom čase idú rýchlejšie), nad Mordorom je tmavočervený opar a okolo Hory osudu pulzuje žiara na zemi, nad Mŕtvymi močiarmi pláva hmla a na severe padá sneh okolo kamery. Pri nastavení efektov „nízke“ sa oblaky, hmla a sneh vypnú.

## Ikonky a popisky na mape (verzia 98)

- **Čitateľné popisky pri oddialení** (`this.ls` v `update`, `js/engine/scenes/MapScene.js`): popisky sú v súradniciach sveta, preto sa pri oddialení zmenšovali (pri najmenšom priblížení asi na 7 px). Teraz rastú opačne ako priblíženie (`max(1, 0.9 / Z)`), takže mená hradov, armád, družiny a zaujímavých miest majú na obrazovke stálu veľkosť. Mená dedín sa pri veľkom oddialení (Z ≤ 0,5) skryjú, aby neprekrývali hrady.
- **Hrady:** pod menom je pásik vo farbe frakcie (`fcol`, kreslí `drawFx`). Meno má farbu podľa vzťahu k tebe: tvoja frakcia zlatá, nepriateľ červenkastý, spojenec zelený, ostatní béžoví. Keď je družina v hrade, jej popisok je pod menom hradu, nie cez neho.
- **Armády:** krúžok pod armádou podľa vzťahu: nepriateľ silnejší ako ty červený, slabší oranžový (oba s jemnou výplňou), tvoji a spojenci modrý, neutrálni sivý.
- **Trasa družiny:** pri pochode vedú k cieľu bodky, ktoré sa posúvajú smerom pochodu, a cieľ má pulzujúci zlatý krúžok.

## Pergamenová veľká mapa (verzia 99)

- **Podklad** (`buildAtlas` v `js/engine/scenes/UIMaps.js`): veľká mapa (kláves M) už nepoužíva kockatý obrázok minimapy. Raz sa namaľuje textúra `atlas` 1440 × 960: teplý papier so škvrnami a vláknami, krajiny jemným akvarelom podľa druhu zeme, lesy ako stromčeky (mŕtve lesy ako pahýle), pohoria zozadu dopredu so svetlou a šrafovanou tienistou stranou a snehom, Hora osudu so žiarou, Anduin od prameňa širší, jazero s obrysmi brehu, more na západe, stmavené okraje papiera, dvojitý rám a ružica svetových strán vľavo dole.
- **Cesty** sú prerušované atramentové čiary po tých istých oblúkoch ako na hlavnej mape (`roadLines` z MapScene), namiesto rovných spojníc.
- **Mená bez prekrývania:** hrady sa popisujú od tvojich a väčších; meno skúša polohy pod, nad, vedľa a šikmo od značky, kým sa s ničím neprekrýva (keď miesto nie je, ostane priesvitné). Zaujímavé miesta majú meno kurzívou, len keď sa zmestí. Mená dedín na veľkej mape nie sú (ostali bodky). Meno hradu má farbu podľa vzťahu: nepriateľ tmavočervený, tvoja frakcia zlatohnedý.
- **Mená krajín** sú veľké riedke písmo kurzívou vo farbe frakcie, priesvitné, vždy celé vnútri rámu.
- **Legenda** má nové farby krúžkov armád: slabší nepriateľ oranžový, tvoji a spojenci modrý, neutrálni sivý.

## Minimapa a varovania v hornom páse (verzia 100)

- **Minimapa** (`miniKey` v `js/engine/scenes/UIMaps.js`) používa zmenšený pergamen veľkej mapy (`atlas_s`, 420 × 280, zmenšený v dvoch krokoch, aby stromčeky neblikali) namiesto kockatého obrázka. Kým nie je hlavná mapa postavená, ostáva starý obrázok `minimap`. Značky sú pre svetlý papier tmavé: dediny tmavé bodky, miesta tmavomodré trojuholníky, výrez kamery tmavý rám so svetlou linkou, hrdina s tmavým obrysom.
- **Varovania v hornom páse** (`syncHud` v `js/engine/scenes/UIScene.js`, farby v `js/ui/hud.js`): zásoby pod 4 dni a morálka pod 45 sú oranžové s jemným rámčekom (blíži sa problém); hlad, zásoby pod 2 dni a morálka pod 30 sú červené a rámček pulzuje.

## Plynulá mapa (verzia 101)

- **Oprava sekania pri pohybe po mape:** Phaser objekt `Graphics` prepočítava všetky svoje tvary v každej snímke, aj mimo obrazovky. Hladké cesty a rieka z verzie 97 mali v jednom objekte asi 330 000 príkazov, čo stálo asi 175 ms na snímku. Teraz sa cesty, rieka a tiene hôr kreslia do štvorcov sveta 1600 × 1600 (`chunkG`, `chunkKey` v `js/engine/scenes/MapScene.js`) a `cullChunks` v každej snímke zobrazí len štvorce pri kamere (zvyčajne 2–4). Body ciest sú redšie (každých 32 bodov sveta) a rieka má 360 úsekov namiesto 640. Čas snímky mapy klesol zo 192 ms na asi 10–13 ms (merané v prehliadači ručným krokom hry).
- Pravidlo do budúcna: veľké statické kresby na mape nedávať do jedného `Graphics`, ale cez `chunkG`.

## Rozhranie mapy „Filmové minimum“ (verzia 102)

- Namiesto pásu hore a panela tlačidiel dole sú len **stmavené okraje obrazu** (`syncHud` v `js/engine/scenes/UIScene.js`) a prvky voľne v rohoch, aby bolo čo najviac vidieť mapu. Údaje sa naďalej berú z HTML lišty `#hud` (`js/ui/hud.js`) a tlačidiel `tb` (`js/ui/toolbar.js`), takže herná logika sa nezmenila.
- **Vľavo hore** plávajú hodnoty (zlato, zásoby, morálka, sláva…) ako ikona a číslo s tieňom; varovania sú oranžové alebo červené a pri ohrození ikona bliká. Popis ukáže myš. **Vpravo hore** je deň veľkým písmom, pod ním obdobie a počasie, pod tým minimapa (`MM` presunutá hore, klik na ňu kontroluje celý obdĺžnik).
- **Vľavo dole hrdina** (`drawHero`): skutočný portrét (`Portraits.hero()`, orezaný do kruhu), okolo neho červený oblúk zdravia, odznak úrovne, meno, hodnosť, zdravie a vojsko podľa druhov. Klik na portrét otvorí Prehľad.
- **V strede dole kolieso dňa a noci** (`drawDial`, kreslí sa každú snímku): zlatá polovica deň, modrá noc, slnko a mesiac sa otáčajú s časom dňa, značka hore = teraz. Pri čakaní (tábor, obliehanie, obrana, zajatie) je vedľa tlačidlo rýchlosti času (×1 / ×3 / ×8).
- **Vpravo dole mriežka okrúhlych tlačidiel** (`syncBars`): Mapa, Družina, Výbava, Úlohy / Hrdina, Kronika, Voľby a zvýraznený **Tábor** (v tábore „Odísť“). Hrdina, Kronika a Voľby otvárajú ponuku nad mriežkou, nad ňou je lupa. Nové tlačidlá mimo skupín sa ukážu ako malé okrúhle vedľa lupy. Rozkazy v bitke ostali bez zmeny.
- **Oprava:** po bitke sa mapa stavia nanovo, ale pamäť posledného textu (`_ht`, `_mt`) ostala, takže štítok družiny pod hrdinom bol prázdny. `buildWorld` ju teraz vynuluje.

## Prestavba mapy: tvar Stredozeme, rieky a jazerá (verzia 103)

- **Geografia** (`js/data/geo.js`, vektorové dáta v jednotkách návrhu 1800 × 1200): pobrežie Veľkého mora na západe a juhu (záliv Forochel, záliv Lhûnu so Šedými prístavmi, južné pobrežie s deltou Anduinu), **rieky so šírkou podľa toku** (Anduin cez Nen Hithoel a vodopády Rauros k delte pri Pelargire, Brandyvína, Šedá voda, Isen, Entova voda, Bruinen, Lhûn, Bystrá, Rýchla riečka, Celebrant), **jazerá** (Večerné jazero, Dlhé jazero, Nen Hithoel, more Rhûn, Núrnen) a **reťaze hôr** (Hmlisté hory, Ered Luin, Biele hory, Šedé hory, Ered Lithui a Ephel Dúath okolo Mordoru, Železné vrchy, Emyn Muil, Osamelá hora). Mapa je vlastná kresba podľa polohy krajín, nie kópia mapy z filmu.
- Pri načítaní `GEO` upraví `MAPDATA`: políčka mora a jazier sú voda (bez lesa), pri riekach nie je hustý les, vrchy sa rozmiestnia pozdĺž reťazí (Hora osudu ostáva), dediny vo vode sa posunú na breh, Mistrand sa presunul na breh mora Rhûn. Mapa z editora Tiled (`assets/maps/stredozem.json`) ostáva podkladom terénu a lesov, vodu a hory určuje `geo.js`.
- **Kreslenie** (`buildWater` v `js/engine/scenes/MapScene.js`): more s plytčinou, hlbinou, príbojom a piesočným pobrežím, jazerá s brehom, rieky ťahmi štetca po štvorcoch sveta (úseky v mori a jazerách sa nekreslia), **mosty a brody** s menami (Brandyvínsky most, Sarnský brod, Isenské brody, Starý brod, Cair Andros…). Veľká mapa, minimapa aj bitky pri rieke (`riverPoints`) berú vodu z tej istej geografie.
- **Voda je prekážka** (`js/sim/nav.js`): mriežka 180 × 120 políčok, more, jazerá a rieky sú nepriechodné, rieky sa dajú prekročiť len na mostoch, brodoch a v hradoch na rieke (Osgiliath, Tharbad, Pelargir). Hľadanie cesty A* (8 smerov, bez zrezávania rohov cez vodu), trasa sa vyrovná podľa presnej priamej viditeľnosti (prechod všetkými pretínanými políčkami). `navStep` dá smer k ďalšiemu bodu trasy, `navMove` posunie objekt a pri brehu kĺže pozdĺž neho. Takto chodí **hrdina** (klik za rieku = cesta cez najbližší most), **armády**, **poslovia a karavány**. Najviac 8 nových trás za krok sveta; hľadanie cesty pridá asi 0,02 ms na krok (78 armád).
- **Cesty na mape** sa počítajú tou istou trasou medzi hradmi a zaoblia sa (Chaikin), takže prirodzene vedú cez mosty a brody.
- **Staré uloženia:** po načítaní (`navFixPositions`) sa hrdina, armády, dediny a poslovia, ktorí by stáli vo vode, presunú na najbližšiu súš. Rovnako pri novej hre; bandy sa vo vode nerodia.

## Bohaté obrazovky: hrad, Hrdina, Družina, Voľby (verzia 104)

- Doteraz sa každé okno kreslilo jedným spoločným vzorom (nadpis, odsek, stĺpec tlačidiel). Štyri hlavné obrazovky majú teraz vlastné rozloženie (`js/engine/scenes/UIRich.js`). Funkcia okna ich označí `ov.dataset.screen` (`town`, `hero`, `party`, `settings`) a `UIDialog.syncDialog` zavolá `richScreen`; ak sa obsah nezmestí alebo nastane chyba, okno sa nakreslí po starom. Akcie volajú tie isté HTML tlačidlá (`b.click()`) alebo tie isté funkcie hry (`wear`, `takePerk`, `csTake`), takže herná logika sa nezmenila. Klávesy 1–9 a Esc fungujú ako predtým (`dlgButtons`).
- **Vstup do hradu:** hlavička s oblohou podľa dennej doby, siluetami hôr, obrázkom hradu frakcie a zástavou; meno, frakcia a pán, hviezdy prosperity, posádka, hradby, prosperita a pruh vzťahu. Budovy ako ilustrované dlaždice (Nádvorie, Kasárne, Kováč, Tábor a zajatci, Správa, Dvor, Trh, Krčma, Hrdina, Aréna, Prístav) s popisom, číslom klávesy a odznakom stavu („Niekto tu čaká“, „2 bodov“, „Vstupné 20“). Vpravo nástenka (tipy, výprava, klebety), úlohy, Uložiť a Odísť z mesta.
- **Hrdina** (Inventár na mape, Výbava, klik na portrét, Hrdina a schopnosti v hrade): veľká postava v aktuálnej výbave na podstavci, okolo šesť slotov; vybraný slot ukáže veci z batohu ako karty so zeleným/červeným rozdielom oproti tomu, čo nosíš (klik = obliecť). Vpravo kruh úrovne a záložky **Výbava**, **Vlastnosti** (pruhy a +), **Perky** (mriežka vetiev, zelené = dá sa vziať) a **Schopnosti** (zdatnosti so zbraňami a bojové schopnosti s +).
- **Družina:** súhrn (muži a sila, morálka s pruhom, zásoby, žold, zajatci a voz), záložky; spoločníci ako karty s portrétom, úrovňou, pruhmi zdravia a spokojnosti, rolou a tlačidlami; vojsko ako karty s postavičkou, počtom a žoldom. Ostatné záložky (zásoby, perky, schopnosti, rozkazy) vo vlastnom štýle v dvoch stĺpcoch.
- **Voľby:** kategórie vľavo (Zvuk, Hra, Bitka 3D, Obraz, Ovládanie), vpravo voľby so spínačmi, posuvníkmi hlasitosti a výberom ‹ hodnota ›, pod každou krátky popis (celý pri myši).

## 3D mapa (ukážka, verzia 105)

Mapa sa dá zobraziť v 3D (`js/engine/3d/m3d.js`, Nastavenia → Mapa 3D; vypnutím sa vráti klasická 2D mapa). Herná logika, hľadanie cesty a Phaser ostávajú rovnaké, mení sa len kreslenie:

- **Krajina:** výškové pole z `MAPDATA` a `GEO`: hory podľa reťazí (sneh podľa výšky, Mordor tmavý), rieky, jazerá a more vyhĺbené s priehľadnou vodou, brody ostávajú plytké, hrady stoja na rovine, cesty sú vyšliapaná zem, lesy sú instancované stromy, dediny domčeky.
- **Postavy:** hrdina a velitelia sú rovnaké postavy ako v 3D bitke (`B3.kit.rig`): výbava hrdinu, kôň, zástava kráľov; chôdza a cval podľa rýchlosti, kruh pod veliteľom podľa vzťahu, Nazgûl lietajú.
- **Hrady:** modely z dielov podľa frakcie (Gondor biely kameň, Rohan drevo a slama, Mordor čierne hroty, Harad pieskovec…) a vlastné modely podľa Tolkienových opisov: Minas Tirith (7 stupňov, ostroha, Biela veža), Edoras (Meduseld), Helmov žľab, Barad-dûr, Isengard (Orthanc), Erebor, Hobitov, Minas Morgul, Osgiliath, Rivendell. Farba a vzhľad sa menia podľa vlastníka a úrovne hradu.
- **Kolóny a mosty:** za hrdinom a veliteľmi kráčajú pešiaci po ich stope (jeden na päť mužov, najviac päť); cez rieky vedú mosty (`GEO.CROSS`, druh `most`: drevené na západe, kamenné inde) so správnou výškou pod nohami (`groundY`), brody sú plytké so stupadlami a tabuľkou.
- **Obliehanie a počasie:** pri obliehanom hrade stojí tábor (stany s erbom obliehateľa, ohne) a podľa stavu obliehania rebríky, baranidlo a obliehacia veža, nad hradom stúpa dym. Počasie z `MW` plynule prechádza: dážď a búrka (šikmé kvapky, blesky), sneh, popol a hmla (zahmlenie, stmavnutie).
- **Výkon:** stromy sú v štvorcoch 1600 × 1600 a kreslia sa len tie v zábere; rozlíšenie 3D mapy podľa Nastavení grafiky (nízka 1×, stredná 1,25×, vysoká 1,5×, ultra 2×) a pri „Auto kvalita“ sa pri dlhodobo nízkych FPS znižuje po krokoch .25 (najmenej .75×); pod 3D mapou sa nekreslia 2D lesy, cesty a efekty.
- **Kamera a ovládanie:** šikmo zhora, koliesko približuje, Q a E alebo pravé tlačidlo myši otáčajú, klik na zem sa premieta lúčom (`M3.pick`). Štítky (hrady, armády, dediny, hrdina) ostávajú z Phaseru a premietajú sa z 3D polohy (`M3.proj`); 2D vrstvy sa skrývajú.

## Spoločný štýl okien (verzia 106)

Všetky bežné okná hry (asi 75: kováč, trh, krčma, veliteľ, kronika, úlohy, kráľovstvo, obliehanie, udalosti na ceste, výsledok bitky…) majú rovnaký vzhľad ako bohaté obrazovky: tmavý rám so zlatými lemami (zlo má červenší), hlavička s medailónom a ikonou podľa nadpisu (`DLG_ICONS` v `UIDialog.js`), svetlý text s citátmi kurzívou, tlačidlá ako karty s ikonou (`dlgBtn`) a jantárová pilulka na odchod. List (nadpis „List …“) ostáva na pergamene s voskovou pečaťou. Logika sa nezmenila: okná sa stále opisujú cez `show`/`btn` a `UIDialog.buildDialog` ich len nakreslí inak. Vlastné obrazovky (kováč s mriežkou vecí, úlohy, kráľovstvo…) sú ďalšia etapa.

## Vlastné obrazovky okien (verzia 107)

Popri spoločnom štýle majú tri druhy okien vlastné rozloženie (`js/engine/scenes/UIRich.js`; okno ich označí `ov.dataset.screen`, inak ostáva spoločný štýl):

- **Obchod** (`shop`): kováč a zbrojnica ako mriežka kariet vecí s veľkou ikonou, štatistikou a cenou (NOSÍŠ, MÁŠ · OBLIECŤ, nedostupné stlmené), posúvateľná.
- **Prehľad sekcií** (`sections`): Úlohy (karty s postupom a tlačidlom Vzdať sa), Kronika, Denník, Štatistiky, Trofeje, Úspechy; každá sekcia je karta.
- **Udalosť** (`event`, funkcia `evShow` v `dom.js`): filmová karta s ilustráciou (obloha podľa dennej doby, hory, veľký medailón s ikonou) a voľbami ako kartami; používajú ju udalosti na ceste, príbeh, svetové udalosti, stretnutia, výsledok bitky, súboje, hádka v družine, posol a plavba. Keď sa obsah nezmestí (dlhý text, viac ako 6 volieb), okno sa nakreslí v spoločnom štýle.

Pridané v ďalšej etape: **Trh, Kráľovstvo (Prehľad, Léna, Vazali, Správa), Krčma a menu Obliehania** sú prehľad sekcií (tlačidlá sa zalamujú do riadkov v karte); **Uložiť a Načítať hru** je mriežka kariet v dvoch stĺpcoch (`ov.dataset.cols`); **veliteľ, krčmár a rozhovory so spoločníkmi, dedina, hradné budovy, miesta, rada šľachticov, zajatie a udalosti obliehania** sú karta udalosti, ktorá pri okne s portrétom ukáže portrét v ráme. Listy (nadpis „List …“) ostávajú na pergamene.

Posúvateľné obrazovky používajú `rScroll`/`rScrollEnd` (koliesko, ťahanie a klávesy ako v bežných oknách).

## Pohyb a kontakt v boji (verzia 108)

- **Telesná kolízia** (`sepUnits` v `js/sim/warband.js`, volá ju `updBattle`): vojaci sa neprekrývajú. Dvojica bližšie než (r₁ + r₂) × 0,72 sa jemne odtlačí; kôň, obri, boss a hrdina ustupujú menej, jazda v nápore (`u.ride`) kolíziou prechádza. Mriežka 26 jednotiek; pri obliehaní slabšie. Meranie zrkadlovej bitky 40 proti 40: prekrývajúcich sa dvojíc 115 → 0, najmenší odstup 0,1 → 6,7.
- **Pohyb v zblíženom boji** (`aiSpacing`): vojak po údere s pravdepodobnosťou 35 % + zručnosť krok späť, pri dobíjaní krúži okolo súpera po oblúku (zručnejší rýchlejšie, smer sa mení každých 70 – 160 snímok) a drží odstup. Slabý vojak už nestojí, len krúži pomalšie.
- **Animácie** (`pose`, `poseHuman` v `js/engine/3d/b3d.js`): smer pohybu voči pohľadu (`o.mf` dopredu, `o.ms` do strany) – pri cúvaní beží chôdza naopak a trup sa mierne zakláňa, pri úkroku do strany sa nohy rozkračujú (rotácia okolo osi dopredu) namiesto chôdze dopredu. Platí pre vojakov aj hrdinu.
- Testy: nový test telesnej kolízie, test pohybu v boji upravený (slabý vojak krúži pomalšie, nie stojí).

## Krčma, nádvorie a sieň hradu v 3D (verzia 134)

Interiéry už nie sú izometrické obrázky, ale 3D miestnosti na rovnakom vykresľovači Three.js ako bitka a mapa. Izometrická verzia sa nahradila, bez záložnej (miestnosti sa bez WebGL neotvoria).

- **`Room3Scene`** (`js/engine/scenes/Room3Scene.js`): spoločný základ. Miestnosť sa skladá z podlahy, stien, stropu, kvádrov, valcov, okien s oblohou podľa dennej doby, plameňov so svetlom a postáv. Rozloženie má rovnaké súradnice ako predtým (jednotky podlahy × 0,65), takže polohy stolov, dverí a kolízie sa prevzali.
- **Postavy** sú rovnaké 3D telá ako v bitke (`B3.kit.rig`, nová vetva `u.npc` v `specOf`): krčmár, spoločníci, kováč, kupec, veliteľ, pán hradu aj hrdina majú výbavu a tvár ako inde; stoja, dýchajú, žmurkajú a pri priblížení sa otočia k hrdinovi. Hrdina chodí s nohami a rukami z bitky.
- **Ovládanie**: tretia osoba, WASD, myš (klik zachytí myš) alebo šípky otáčajú kameru, koliesko mení vzdialenosť, Tab = pohľad z prvej osoby, E alebo medzerník = rozhovor či akcia, Shift = rýchlejšie, Esc = odísť. Kamera je v interiéri držaná v miestnosti, na nádvorí smie za hradby.
- **`TavernScene`**: krčma s krbom, výčapom, policami, sudmi, stolmi so sviečkami a zástavou, šesť tém (ľudia, hobiti, elfovia, trpaslíci, brloh zla, juh). **`CastleScene`**: nádvorie (hradby s cimburím, veža, brána, vyhňa, stánok, studňa, panák, stajňa, chrám, trhovisko) a sieň (stĺpy, trón, koberec, koše s ohňom, zástavy, okná), vzhľad podľa frakcie.
- Dialógy, obchody a prechody (`js/ui/castle.js`, `tavern.js`, `rooms.js`) ostali nezmenené. Dediny a pamätihodnosti (`VillageScene`, `PlaceScene`) sú zatiaľ izometrické.

## Zvuk: stereo a hlasitosť od 3D kamery (verzia 133)

Pred zmenou som prešiel zvuk (`js/audio/engine.js`, `js/audio/sound.js`): zvuky boja sú súbory s náhodnými variantmi a zmenou výšky tónu, druh zásahu sa volí podľa materiálu (telo, štít, kov), hlasitosť klesá so vzdialenosťou. Chyba bola v polohe: stereo a hlasitosť sa rátali od stredu 2D kamery a podľa svetových osí, nie od 3D kamery, takže zvuk spred hráča mohol znieť sprava.

- **`B3.earPan(x, y)`** (`js/engine/3d/b3d.js`) vráti vzdialenosť od 3D kamery a stereo (−1 až +1) podľa smeru jej pohľadu; `SoundFX.play` ho používa, keď beží 3D, inak ostáva pôvodný výpočet.
- **Overenie v hre:** pri pohľade v smere +x dostal bod priamo pred kamerou stereo −0,03 (predtým +0,28), bod vpravo +0,26 a vľavo −0,30. Samotný zvuk som nepočúval.

## Kamera: záber na posledného padlého (verzia 132)

Kamera už mala spomalenie pri zásahu do hlavy, páde veliteľa a nárazu jazdy, filmové pásy a mierne trasenie. Chýbala chvíľa víťazstva: keď padol posledný nepriateľ, bitka skončila okamžite a jasot vojakov, ktorý hra má, nikto nevidel.

- **Záber na posledného padlého:** pri víťazstve v 3D kamera na ~1,7 s spomalí (rýchlosť 0,4) a pozrie na najbližšieho nepriateľa; filmové pásy sa zapnú rovnako ako pri páde veliteľa (`js/engine/3d/b3d.js`).
- **Krátka pauza pred výsledkom** (`js/sim/battle.js`, `CMB.winT`, 70 krokov simulácie): vojaci jasajú. Platí len keď beží 3D; bez neho (a v testoch) bitka končí hneď ako doteraz. Ústup nepriateľa mal pauzu už predtým.
- **Overenie v hre:** po zabití všetkých nepriateľov bitka skončila po 3,3 s, z toho asi 1,6 s v spomalení; všetky testy simulácie prešli.

## Telá a krv: rozlievajúce sa a zasychajúce kaluže (verzia 131)

Pred zmenou som prešiel kód: padlí vojaci už zostávajú na poli ako fyzikálne telá (handrová bábka), šípy sa zapichujú do tiel a štítov (najviac 6 na telo) aj do zeme a zbrane a štíty padajú na zem. Doplnil som len krv, a to len keď je v Nastaveniach zapnutá (predvolene je vypnutá):

- **Kaluž pod padlým** sa za asi 4 s rozleje z štvrtiny na plnú veľkosť, po 5 s začne tmavnúť a za pol minúty zaschne (tmavšia, matnejšia, priesvitnejšia) – `stepDecals` v `js/engine/3d/b3d.js`.
- **Škvrny na zemi** pri zásahu (silnejšom ako 4 životy, s pravdepodobnosťou 50 %) v smere úderu.
- **Overenie v hre:** rozliatie z 0,36 na 1 za 5 s; po približne 26 s farba z `#5a100c` na `#460a07` a krytie 0,64. Vizuálne som to v hre nepotvrdil (kamera fotorežimu sa mi nepodarila nasmerovať).

## Animácie vojakov: hybnosť pri páde (verzia 130)

Pred zmenou som prešiel animácie v `js/engine/3d/b3d.js`: už mali plynulé prechody medzi pózami (`o.pa`), kľúčové pózy úderov podľa zbrane a smeru, reakcie podľa miesta zásahu (hlava, ruka, nohy), šesť druhov pádov, handrovú bábku a chodidlá na svahu. Chýbala len hybnosť.

- **Hybnosť behu:** vojak zasiahnutý v behu sa pri páde (`ragStart`) šmykne a pretočí dopredu v smere pohybu, pri cúvaní dozadu, nie len od útočníka. Sila rastie s rýchlosťou (najviac 1,3 jednotky na krok); stojaci vojak padá ako doteraz.
- **Overenie v hre:** pri rovnakom zabití sa bežiaci vojak (rýchlosť 2,6) skončil o približne 16 jednotiek ďalej dopredu než stojaci.

## Výkon veľkých bitiek: zjednodušený zástup (verzia 129)

Zmeranie v prehliadači (AMD Radeon 840M, obrovská bitka, 307 jednotiek, Auto kvalita vypnutá): jeden záber mal **6,2 milióna trojuholníkov** a hra bežala len okolo 17 – 29 snímok za sekundu, pričom zníženie rozlíšenia nepomohlo, takže brzdila geometria. Príčina: vzdialení vojaci sa kreslili tým istým telom a hlavou ako blízki (asi 20 000 trojuholníkov na vojaka), pretože zjednodušená verzia existovala len pre staré modely Meshy, ktoré sme odstránili.

- **Hrubšie telo a hlava (`js/engine/3d/b3d.js`):** `bodySDF` a `headSDF` majú variant `low` s krokom 0,9 (telo) a 0,6 (hlava) namiesto 0,42 a 0,27. Vzdialený vojak má asi 6 000 trojuholníkov.
- **Lacnejšie primitíva:** pri zjednodušenej verzii `Part.build` nahradí guľu, valec a zaoblený kváder jednoduchšími tvarmi.
- **Výsledok:** pri rovnakej bitke asi 2,4 milióna trojuholníkov na záber a približne **59 snímok za sekundu**; blízki vojaci (do `lodD()`) majú plnú kvalitu a vzdialený šík je naďalej čitateľný (tváre, helmy, zástavy).

## Hlasové povely a zoom luku (verzia 128)

- **Hlasový povel** (`setOrd` v `js/ui/toolbar.js`): každý rozkaz skupine (T, H, F, G, R) sa ozve ako výkrik vo výpise vľavo dole („Pechota: Držte pozície!“), pri útoku a ústupe aj rohom. Vojaci ho začnú plniť s oneskorením 0,1 – 0,6 s (`ordWait`), dovtedy držia predošlý rozkaz – armáda nereaguje na zlomok sekundy.
- **Zoom luku:** pri napnutom luku sa záber približuje aj v tretej osobe (predtým len v prvej).
- Už predtým: tretia/prvá osoba (Tab), voľné mierenie s pádom šípu, rozšírenie záberu v cvale, trasenie kamery pri ťažkých úderoch.
- Test: povel pošle správu a nastaví oneskorenie; opakovaný ten istý rozkaz sa nehlási.

## Rieka a brod na poľnom bojisku (verzia 127)

- **Rieka vedie stredom veľkého poľa** (`riverX`, `fordY` v `js/sim/field.js`): predtým bola pevne na x = 720 (stred starého bojiska 1440 × 960), teraz je na polovici šírky a brod je v strede výšky (80 jednotiek). Upravená 3D vrstva (`js/engine/3d/b3d.js`: koryto, voda, tráva, kamene, stopy) aj 2D scéna.
- **Hlboká voda mimo brodu** spomaľuje o 50 %; v brode sa ide normálne.
- **Hľadanie cesty cez rieku** (`fordGuide`): vojak AI s nepriateľom na druhom brehu (do ~320 jednotiek od rieky) ide najprv k brodu a cez neho. Pri brode sa tvorí húf. Netýka sa hrdinu, lukostrelcov ani vojakov blízko súpera (do 70).
- Test: stred poľa, brod, spomalenie, cesta k brodu a cez neho. Vizuálne som overil len polohu koryta a vodnej plochy, nie celý vzhľad v hre.

## Zotrvačnosť pohybu (verzia 126)

- **Hrdina pešo** (`updBattle` v `js/sim/battle.js`): rozbeh – plná rýchlosť až po ~8 snímkoch (začína na 35 %) – a dobeh: po pustení klávesu sa postava ešte kúsok zošmykne a spomalí. Kôň mal zotrvačnosť už predtým.
- **Vojaci AI** sa otáčajú postupne (pešiaci ~0,2 rad/snímok, jazda 0,3), otočka o 180° trvá okolo 0,4 s – obchvat zboku a zozadu je tak o niečo účinnejší, lebo vojak nezareaguje okamžite.
- Rýchlosť podľa terénu (svah, kopec) už platila.
- Test: rozbeh, dobeh a postupné otáčanie.

## Prepnutie zbrane (verzia 125)

- **Kláves N** (`wpnCycle` v `js/sim/warband.js`, premenovateľný v Nastaveniach): v bitke prepne na ďalšiu zbraň na blízko, ktorú vlastníš (napr. dlhá kopija ↔ meč so štítom ↔ obojručná zbraň). Prepnutie trvá chvíľu a nejde počas úderu.
- Obojručná zbraň odloží štít (po prepnutí späť sa vráti s rovnakou výdržou); po bitke sa vráti pôvodná zbraň. Štít zo zeme sa pri obojručnej zbrani nezdvíha.
- Zbrane majú rozdielny dosah a tempo (kopija zasiahne prvá, obojručná sekne široko), takže prepnutie podľa vzdialenosti a súpera dáva zmysel.
- Zatiaľ len 2+ zbrane z vlastníctva cyklicky (nie pevné 4 sloty); zlomený štít sa dá nahradiť štítom zo zeme.
- Test: prepnutie, odloženie a návrat štítu, obnovenie zbrane po bitke, bez druhej zbrane sa nič nezmení.

## Ústup ranených (verzia 124)

- **Ranený vojak ustúpi** (`aiWounded` v `js/sim/warband.js`, volá `updBattle`): keď mu zostane menej než 30 % zdravia a súper je do ~70 jednotiek, s istou šancou (30 % + zručnosť do 80 %) ustúpi na 2 – 3,5 s pred súperom a potom sa vráti do boja (alebo skôr, ak ho súper dobehne). Každý vojak ustupuje najviac raz. Netýka sa veliteľov, obrov, jazdy, lukostrelcov ani obliehania.
- Už predtým: krok späť po údere, krúženie okolo súpera pri dobíjaní, odstup kopijníkov, klamy zručných vojakov.
- Test: ranený ustúpi a po čase sa vráti, zdravý nie.

## Séria úderov a riposta (verzia 123)

- **Únava zo série** (`heroStrike` v `js/sim/combat.js`): každý ďalší úder v rade (bez ~2-sekundovej pauzy) predĺži zotavenie o 10 % a zvýši spotrebu výdrže o 12 % (až štyri stupne). Pauza alebo dokonalý kryt sériu vynuluje. Vojaci AI sa unavujú podobne (`aiChain`, +8 % zotavenia na stupeň).
- **Riposta:** po dokonalom kryte máš ~1,2 s na úder, ktorý je o 30 % silnejší a zotavenie je o 30 % kratšie.
- Test: zotavenie rastie v sérii a po riposte klesá.

## Fyzika jazdy (verzia 122)

- **Nápor AI jazdy podľa rozbehu** (`aiMelee`): poškodenie rastie s dĺžkou rovného cvalu (od ~1,7× po 2,5× sily); krátky rozbeh udrie slabšie než dlhý.
- **Kopija proti jazde** (`meleeHit`): kopijník (alebo hrdina bodom kopije) zasiahne jazdca o 40 % silnejšie – jazda sa pred kopijami musí obchádzať.
- **Zhodenie zo sedla** (`unseat`): nápor nepriateľskej jazdy (20 %) alebo bod kopijníka (10 %) môže hrdinu vyraziť z koňa: spadne, je krátko omráčený a bojuje pešo (kôň po bitke môže zmiznúť).
- Už predtým: kôň hrdinu má zdravie a padne, šík kopijníkov zastaví nápor, sklopená kopija, lámanie kopije.
- Test: kopija dáva viac proti jazdcovi, zhodenie zo sedla.

## Línia štítov (verzia 121)

- **Súdržnosť línie** (`cohesion` v `js/sim/combat.js`): pešiak so štítom, vedľa ktorého stoja do ~26 jednotiek spolubojovníci s podobným smerom pohľadu (až 3 susedia = plná línia), sa kryje štítmi o rameno. Platí pre obe strany; štítový val hráča (rozkaz formácie) ju zosilní ×1,5.
- Spredu: šanca na kryt +25 % a poškodenie až −20 %. Zboku a zozadu línia nechráni: poškodenie až +20 % navyše k bonusu za bok/chrbát. Pri údere do boku línie sa zobrazí tip.
- Praktický dôsledok: čelný útok na zovretú líniu je drahý, obchvat jazdy alebo vlastné údery zboku sa oplatia viac.
- Test: súdržná línia (4 vojaci) dostane spredu menej a zozadu viac než osamelý vojak.

## Klam smerom v súboji (verzia 120)

Smerový boj (4 smery úderu, kryt do smeru myšou, klam krytom, zručnosť vojakov) už existoval; táto verzia ho dopĺňa o to, čo robí Warband Warbandom:

- **Smer sa určuje do uvoľnenia úderu** (`heroDirectional` v `js/sim/combat.js`): počas držaného nápriahu môžeš pohybom myši smer zmeniť (nie pri kopiji). História smeru sa ukladá (`R.dh`).
- **Vojak číta smer s reakčným oneskorením** (`meleeHit`): kryje smer, ktorý videl pred svojím reakčným časom (zručnejší reaguje rýchlejšie). Ak si smer v poslednej chvíli zmenil, jeho šanca na kryt klesne približne na štvrtinu – „Klam smerom! Súper kryl zlý smer.“
- Test: zmena smeru počas nápriahu a rozdiel medzi krytom bez klamu a s klamom.

## Zvláštne vlny noci (verzia 119)

- **Dve zvláštne vlny** pri obrane hradu (`HOLD_WAVE`, `holdWave` v `js/sim/tactics.js`): pri 30 % a 65 % noci prídu čerstvé jednotky zľava. Helmov žľab: výbuch pod múrom (8 Uruk-haiov, brána −45) a vlna rebríkov (10); Minas Tirith: Mûmakil a Nazgûl; Edoras: svorky vargov; Erebor: trollovia s baranom (brána −30). Ostatné hrady dostanú obyčajné vlny 8 Uruk-haiov.
- Oprava: `cmbStart` maže príznaky správ a vĺn z predošlej bitky (`hd*`, `hw*`, `tut*`), inak by sa v ďalšej bitke nespustili.
- Test: Helmov žľab – pri 31 % noci +8 nepriateľov a poškodená brána, pri 66 % ďalších +10.

## Obrana do úsvitu (verzia 118)

- **Cieľ obrany hradu** (`HOLD_T`, `holdDawn`, `holdLeft` v `js/sim/tactics.js`): pri obrane hradu (hráč stojí na hradbách) musíš vydržať do úsvitu. Slávne hrady majú dlhšiu noc: Helmov žľab ~2:50, Minas Tirith ~2:35, Erebor ~2:30, Edoras ~2:20, Rivendell a Minas Morgul ~2:15, ostatné ~1:55 (čas v snímkach, 60 = sekunda). Keď čas vyprší, nepriateľ sa stiahne a bitka je vyhraná, hoci ešte žije.
- **Časovač** vpravo hore („Do úsvitu: 2:42“) a správy o priebehu noci (na začiatku, v polovici a pred koncom); v tabuľke bitky riadok „Za úsvitu sa nepriateľ stiahol – hrad obstál“.
- Limit dlhej bitky pri obrane hradu je teraz max(9000, čas úsvitu + 600).
- Test: obrana nastaví čas, po jeho uplynutí sa bitka vyhrá.
- Nie je zatiaľ: ďalšie príbehové ciele (zničiť obliehacie veže, doručiť správu, chrániť osobu), jedinečné bitky ako Pelennorské polia.

## Zima a mor (verzia 117)

- **Zimný pochod** (`winterDaily` v `js/sim/supply.js`, volá `supplyDaily`): v zime mimo osád (ďalej než 18 míľ od hradu alebo dediny) družina mrzne – morálka klesá o 3 a s 25 % šancou (v tábore 10 %) zamrzne jeden muž. Pri hradoch a dedinách sa ukryje. Na mape sa objaví správa.
- **Mor v obliehacom tábore** (`siegeDisease` v `js/sim/siege.js`): po 10 dňoch obliehania má hráč denne 10 % šancu na chorobu (1 – 3 mŕtvi, morálka klesá; ranhojič šancu zníži na polovicu). Armády AI strácajú po 14 dňoch s 8 % šancou 6 % mužov. Hlad posádky v hrade platil už predtým.
- Test: zima pri hrade a mimo neho, leto bez účinku, mor v dlhom a krátkom obliehaní.
- Nie je zatiaľ: posily z hradov, vizualizácia plánov lordov na mape, nové diplomatické voľby (sobáše, aliancie).

## Následky bitiek: rany a jazvy (verzia 116)

- **Rany hrdinu** (`injuryAfterBattle` v `js/sim/supply.js`, volá `endBattle`): ak hrdina padol alebo skončil pod 40 % zdravia, `G.inj` dní má o 20 % nižšie najvyššie zdravie (`mh()` v `js/sim/hero.js`). Trvanie 2 – 9 dní podľa zdravia, perk a spoločník ranhojič ho skracujú, v tábore sa hojí dvakrát rýchlejšie (`supplyDaily` ho znižuje každý deň). Platí pre poľné bitky, obliehanie aj obranu hradu, nie pre arénu a súboj.
- **Jazvy**: pád v bitke s 50 % šancou zanechá jazvu (`G.scars`, strach +1). Stav sa ukazuje na obrazovke hrdinu („Zranený 5 d“, „Jazvy 2“) a v tabuľke bitky.
- Už predtým platilo: ranení vojaci sa vracajú po vyliečení, padnutý kôň sa niekedy nevráti, zajatci a výkupné, trofeje.
- Test: po ťažkej bitke je najvyššie zdravie nižšie o 20 % a rany sa hoja po dňoch.
- **Korisť výstroje** (`lootGear` v `js/sim/supply.js`): po víťazstve nad armádou aspoň 8 mužov, pri obliehaní alebo bossovi môže zostať kus výbavy strany nepriateľa (orkská šabľa, uruk-haiský meč…), ktorý ešte nemáš. Šanca 12 % + počet nepriateľov / 150 (obliehanie a boss +30 %, najviac 60 %); cena do 150 + 70 × úroveň (boss +600, obliehanie +200). Lúpežníci nechávajú výbavu dobra. Vec je v inventári a v tabuľke bitky.
- **Povesť** (`fameAfterBattle`): rozhodujúce víťazstvo (aspoň 15 padlých nepriateľov a tvoje straty do 15 % ich strát) zvýši strach o 1.
- Nie je zatiaľ: zranenie koňa, povesť v jednotlivých frakciách podľa spôsobu víťazstva.

## Úvod a prvé minúty hry (verzia 115)

- **Cieľ na mape** (`goalText` v `js/sim/story.js`, riadok v `UIScene.drawOverlay`): hore uprostred vždy stojí aktuálny cieľ. V úvodných krokoch aj so vzdialenosťou a svetovou stranou („poraž lupičov z Kraja – 41 míľ na severovýchod“, potom Bree), neskôr prvá veta aktuálnej kapitoly príbehu.
- **Tlačidlá nových rozkazov** v lište bitky (tretí rad nad skupinami): Vpred, Vzad (10 krokov) a Držať palbu / Palba, s aktuálnymi klávesmi.
- **Tipy v prvej bitke** (`tutTick`, `TUT` v `js/sim/tactics.js`): postupne pohyb a mierenie, útok a kryt, rozkazy vojsku, posun o 10 krokov a bojový pokrik. Po prvej bitke (okrem arény a súbojov) sa už nezobrazujú (`G.tut`).
- Nie je zatiaľ: ukazovateľ cieľa šípkou na okraji obrazovky, vlastný interaktívny tutoriál.

## Rozkazy ako vo Warbande (verzia 114)

- **Vpred / Vzad o 10 krokov** (`tacOrder` v `js/sim/tactics.js`, klávesy **C** a **Z**): vybraná skupina dostane rozkaz Držať a každý vojak nové miesto 120 jednotiek k nepriateľovi (alebo od neho).
- **Palba na povel / držať palbu** (kláves **J**, `CMB.hf`): lukostrelci tvojej strany prestanú strieľať a opäť začnú. `aiBow` rešpektuje rozkaz, hrdinu sa netýka.
- Nové klávesy sú v Nastaveniach medzi ovládaním a dajú sa zmeniť; bitka ich resetuje na predvolené (`hf` sa vypína v `cmbStart`).
- Test: posun vpred a vzad, palba na povel.
- Nie je zatiaľ: zosadnutie jazdy (3D model by potreboval živé zosadnutie jazdca), tlačidlá týchto rozkazov v dolnej lište.

## Počítadlo FPS na mape aj v bitke (verzia 113)

- Nastavenia → **Počítadlo FPS** (`fpsBox` v `js/engine/scenes/BattleScene.js`) teraz funguje aj na 3D mape (volá ho `MapScene.update`). Ukazuje aktuálne FPS, priemer a najhorší 1 % snímok za posledných ~10 s, v bitke počet vojakov a stupeň automatického zníženia kvality.
- Skúška bitky v prehliadači (50 orkov proti 66 mojim, vrátane 24 s oštepmi): bojisko 2200×1500, armády sa stretli po ~1000 snímkach, bitka bežala ~90 s a nebola ešte rozhodnutá (26 mojich a 18 nepriateľov, 7 na úteku). Tempo sedí s cieľom 2 – 4 minúty.

## Výzbroj a detaily (verzia 112)

- **Vrhacie oštepy vojakov AI** (`aiThrow`, `JAV_P` v `js/sim/warband.js`): pešiak má s pravdepodobnosťou podľa druhu (ork 50 %, veterán 60 %, Rohirim 40 %, pešiak 35 %) 1 – 2 oštepy. Pri pochode na súpera ich hodí zo vzdialenosti 55 – 150, kým nie je v boji (krátke zamierenie, potom hod; presnosť a dráha ako pri šípoch, zranenie 7). Padnutý oštep ostáva na zemi.
- **Náraz jazdy AI** (`aiTrample`): jazdec v rýchlom pohybe (aspoň 45 % najvyššej rýchlosti), aj počas preletu po nápore, zrazí pešiaka v ceste – tupé zranenie podľa rýchlosti, pešiak sa zapotáca a odletí; kopijník v šíku koňa zastaví (jazdec sa zapotáca a schytá zranenie). Každý pešiak môže byť zrazený najviac raz za 40 snímok.
- Test: pešiak hodí oštep a ubudne mu, jazdec zrazí pešiaka.
- Nie je zatiaľ: štyri zbraňové sloty hrdinu, hod zbraní hrdinom pri chôdzi, ladenie krytov (parry), animácia hodu pre AI (stojí a hodí).

## Terén a prekážky (verzia 111)

- **Prekážky** (`obsSet`, `obsAdd`, `obsUnits` v `js/sim/field.js`): kmene stromov a balvany [x, y, polomer, výška] v mriežke 40 jednotiek. Vojaci a hrdina sa do nich nedostanú, vytlačia sa na okraj a kĺžu popri nich. Miesta preberá simulácia z 3D scény (`js/engine/3d/b3d.js`), takže sedia na viditeľné stromy a skaly; bez 3D sa vygenerujú z lesných zhlukov.
- **Kryt pred šípmi** (`obsArrow`, volá `stepArrows`): šíp pod výškou kmeňa (26) alebo balvana sa zastaví, nad nimi preletí. Strelec si neprekáža vlastným kmeňom do 9 jednotiek.
- **Svah kopca** (`fieldSlow`): do kopca sa ide pomalšie (až o 25 %), z kopca o 12 % rýchlejšie.
- Pri obliehaní sú prekážky vypnuté. Limit dlhej bitky je pri obliehaní stále 9000 snímok (v poli 16000).
- Nie je zatiaľ: rieka s brodom je pevne pri x ≈ 720, AI nehľadá cestu cez brod.

## Taktická AI (verzia 110)

Nový súbor `js/sim/tactics.js` (po `mastery.js`): veliteľ nepriateľa plánuje každých 40 snímok (`tacUpdate`) – os postupu, líniu pešiakov a pomer síl.

- **Postup v línii** (`tacMove`): kým je súper ďalej než 300 jednotiek, pešiak, ktorý vybehol pred ostatných, spomalí (najviac na 40 %), takže armáda prichádza spolu.
- **Lukostrelci za líniou**: neposúvajú sa pred prednú tretinu pešiakov (minus 70 jednotiek), strieľajú spoza nej; keď sa k nim súper priblíži, stiahnu sa ako doteraz.
- **Obchvat jazdou**: každý jazdec dostane stranu (striedavo ±), obíde bojisko za krídlo súpera a potom (`tacTarget`) cieli na najbližšieho lukostrelca do 600 jednotiek. Obchvat sa preruší, ak narazí na súpera alebo trvá viac než 2400 snímok.
- **Ústup**: pri pomere síl pod 0,3, morálke pod 55 a bez zálohy zatrúbi veliteľ na ústup – vojaci mimo boja (okrem nebojácnych) utekajú.
- Neplatí v aréne, v súboji a pri obliehaní. Test: lukostrelci sú v priemere za pešiakmi a jazda dostane obchvat.

## Tempo a bojisko (verzia 109)

- **Väčšie bojisko** (`setField` v `js/core/setup.js`, volá ho `startBattle`): poľná bitka má 2200×1500 jednotiek (predtým 1440×960), hradby, aréna a súboje ostávajú malé. `BW`/`BH` sú teraz premenné; armády štartujú ďalej od seba, takže pochod trvá približne 17 s a je priestor na obchvat.
- **Dlhšie boje** (`BTEMPO` v `js/sim/battle.js`): zranenie medzi vojakmi (nie hrdina ani bossovia) sa násobí 0,22, takže zrkadlová bitka 40 proti 40 trvá zhruba 3000 – 5000+ snímok boja namiesto 500. Hrdina dáva a berie plné zranenie.
- Limit dlhej bitky (rozhodne zostávajúce zdravie) zvýšený z 9000 na 16000 snímok (~4,5 min).
- Nie je zatiaľ: rieka a kopec majú pevné miesto (x ≈ 720), nie v strede väčšieho bojiska.

## Rozvoj bojovníka ako vo Warbande (etapa 3, verzia 94)

Nový súbor `js/sim/mastery.js` (načítava sa hneď po `warband.js`).

- **Zdatnosti so zbraňami** (`G.wp`): jednoručné, obojručné, kopije a zbrane na žrdi, luky, kuše, vrhacie zbrane – od 40 (začiatok) do 300. Rastú **používaním**: každý zásah hrdinu v bitke pridá zdatnosti zbrane, ktorou udrel, podľa spôsobeného zranenia (zabitie dvojnásobne); čím je zdatnosť vyššia, tým rastie pomalšie (prvá bitka ≈ +10 – 15). Každých 10 bodov hlásenie v bitke. Účinok: na blízko zranenie až **+30 %** a nápriah aj zotavenie až o **20 %** rýchlejšie; strelné zbrane zranenie až +20 %, rozptyl až o 40 % menší a luk sa napne až o 30 % rýchlejšie. Kopnutie a náraz koňa zdatnosť nezvyšujú. Zdatnosť sa určí podľa zbrane v ruke (`wpMelee`, `wpRanged`).
- **Bojové schopnosti** (`G.cs`, každá 0 – 5), body `G.bk` – **1 za každú novú úroveň** popri bode vlastností a perku; staršie uloženie dostane body za doterajšie úrovne:
  - **Silný úder** +8 % zranenie na blízko za stupeň, **Silný výstrel** +10 % zranenie lukom a vrhacími zbraňami (kuša nie),
  - **Železná koža** +8 zdravia, **Štít** – štít vydrží o 10 % viac, kryje šípy aj údery o trochu širšie a dokonalý kryt má o snímok dlhšie okno,
  - **Atletika** – pešo o 4 % rýchlejší a o 10 % menší postih za ťažkú výbavu, **Jazda** – kôň o 3 % rýchlejší, o 8 % obratnejší, vydrží o 10 % viac a silnejšie narazí.
  - Okno: **Družina → Schopnosti** (aj z mapy) alebo v hrade **Hrdina a schopnosti → Bojové schopnosti**; zobrazuje aj zdatnosti a ich účinok.
- **Kôň ako bojovník** (`horseBump`, `horseHurt`): kôň hrdinu v rýchlom pohybe (aspoň 45 % najvyššej rýchlosti) **zrazí pešiaka** v ceste – tupé zranenie podľa rýchlosti, pešiak sa zvalí (zapotáca) a odletí, kôň spomalí; kopijník v šíku koňa zastaví a kôň sa vzopne. Obri, jazdci a bossovia sa zraziť nedajú. Po **silnom zásahu** do koňa sa kôň môže **vzopnúť** a na chvíľu zastaviť; pri malom zdraví koňa hlásenie. Nápor (dlhý rovný cval) a sklopená kopija fungujú ako doteraz.
- Nie je zatiaľ: kone vojakov AI nemajú vlastné zdravie (jazdci AI nezosadajú), vojaci AI nezrážajú pešiakov koňom mimo náporu.

## Bitka ako vo Warbande (etapa 2, verzia 93)

- **Zálohy a posily vo vlnách** (`reinforce`, `BRES` v `js/sim/battle.js`): na bojisku je naraz len časť vojska – tvoji podľa doterajších limitov (pešiaci 40, jazda, lukostrelci a veteráni 20, elfovia 15, Rohirim 12, vylepšené jednotky 15 každého druhu, × veľkosť bitky), hlavná nepriateľská armáda najviac `FOE_FIELD` = 80 × veľkosť bitky. Ostatní čakajú v zálohe. Keď na bojisku ostane menej ako polovica vlastného vojska strany, z jej okraja dobehne ďalšia vlna (do pôvodného počtu) a morálka strany sa trochu zdvihne; hlásenie ukáže, koľko mužov prišlo a koľko ešte čaká. Strana na úteku (morálka pod 15) posily nedostane a keď sa nepriateľské vojsko na bojisku rozuteká, stiahnu sa aj jeho zálohy. Zálohy pri obrane hradu a obliehaní dostanú rovnaké posilnenie zdravia ako prví vojaci. Vojaci zo zálohy, ktorí nebojovali, nepadnú.
- **Bitka po páde hrdinu pokračuje** (`heroFell`, `camUnit`): keď hrdina padne a jeho strana má ešte vojakov (alebo zálohu), bitka sa neskončí – hrdina leží zranený, morálka tvojej strany klesne o 10 a kamera (3D aj 2D) sleduje najbližšieho tvojho vojaka. **Podržaný medzerník** bitku zrýchli (×4). Ak tvoji vyhrajú, je to víťazstvo (hrdina má po bitke 20 zdravia); ak padnú alebo utečú všetci, je to prehra ako doteraz. V aréne a v súboji veliteľov pád hrdinu bitku hneď ukončí.
- **Zásahy vlastných** (`ffOn` v `js/sim/warband.js`, Nastavenia → Zásahy vlastných, predvolene zapnuté): šípy, šípy z kuše a oštepy zasiahnu aj vlastného vojaka, cez ktorého letia (nie strelca a nie tesne pri ňom; polovicu šípov vlastní tesne uhnú), hrdinu aj spojencov. Úder zhora a bod hrdinu zasiahne vlastného vojaka pred ním (zranenie ×0,6, morálka −2, hlásenie); sek zboku sa o vlastného vojaka ako doteraz zarazí. Zásahy vlastných sa nepočítajú medzi tvoje zabitia. Vojaci AI na blízko vlastných nezasahujú.
- **Oprava morálky**: počty vojakov strán na začiatku bitky (`CMB.n0`, `CMB.M0`) sa omylom nenastavovali (kód skončil za komentárom), takže každý padlý znížil morálku svojej strany asi o 10 a morálka bola zastropovaná na 60. Teraz strata závisí od veľkosti vojska a strop je počiatočná morálka.
- Testy: nový test etapy 2 v `tests/sim.test.js`; dva staršie testy (smerový boj, boss) mohli náhodne zlyhať – vlastní vojaci stáli hrdinovi pri boku a sek sa o nich zarazil, resp. vojaci zabili bossa skôr, než test skončil; teraz sú nabok, resp. boss počas merania nepadne. Test *Družina je jedlo* občas náhodne zlyhá aj bez týchto zmien.

## Duel ako vo Warbande (etapa 1, verzia 92)

- **Úder AI v pohybe** (`aiSwing` v `js/sim/combat.js`): po nápriahu vojak nezasiahne hneď, ale čepeľ letí asi šestinu sekundy (`u.as`, ťažší obri dlhšie). Zasiahne až v strede pohybu a len vtedy, keď je cieľ ešte na dosah a pred ním; počas úderu sa natáča len pomaly. Kto včas ustúpi alebo uskočí nabok, úderu sa vyhne (hlásenie „Úder ťa minul“). Zásah alebo zapotácanie rozbehnutý úder preruší, kryt a dokonalý kryt sa vyhodnotia v okamihu dopadu.
- **Kryt myšou je predvolený**: Nastavenia → Smer krytu je od tejto verzie predvolene *myšou* (bez štítu treba kryť do strany, odkiaľ úder ide; štít kryje všetky smery spredu). Automatický kryt ostáva ako ľahší režim; hráčovi, ktorý ho už mal nastavený, sa nemení.
- **Rýchlosť oboch strán** (`speedK`): do zranenia sa počíta rýchlosť, ktorou sa útočník a cieľ k sebe približujú – nepriateľ, ktorý beží proti tvojmu seku, dostane viac, a vojak, ktorý ťa dobieha, udrie silnejšie (jazda dvojnásobne). Pri cúvaní je úder slabší.
- **Zarazenie o kryt**: keď nepriateľ tvoj úder zachytí, čepeľ sa zastaví (ďalších v oblúku už nezasiahne) a zbraň odskočí – zotavenie je dlhšie. Rovnako útočník AI, ktorého úder zachytíš, sa spamätáva dlhšie, takže po kryte je čas na protiúder.
- **Hmotnosť výbavy** (`heroLoad`, `loadSpeed`, `loadSwing` v `js/sim/warband.js`): brnenie, štít, prilba a obojručná zbraň majú váhu. Plná ťažká výbava spomalí hrdinu pešo až o ≈ 22 % a nápriah aj zotavenie o ≈ 15 %; na koni sa takmer neprejaví (−5 %). **Mithril a elfská (galadrimská) výbava** váži asi tretinu, Obratnosť postih zmierňuje (každý bod −10 %). Na začiatku bitky v ťažkej výbave sa vypíše, o koľko je hrdina pomalší.

## Boj bližšie k Warbandu (verzia 53)

- **Čepeľ v pohybe** (`heroStrike` a `swingTick` v `js/sim/combat.js`): úder už nezasiahne všetkých naraz v okamihu stlačenia. Po uvoľnení nápriahu sa zbraň pohybuje – sek zľava/sprava prechádza oblúkom z jednej strany na druhú, úder zhora zasiahne v druhej polovici pohybu, bod sa postupne vysúva – a zasiahne len to, cez čo čepeľ prejde (každého raz za sek, najviac 3 – 4 v oblúku). Čepeľ je najrýchlejšia v strede seku a **hrot udiera silnejšie než rúčka**, takže záleží na vzdialenosti aj na načasovaní; mimo dosahu sa nič nestane. Zbraň sa zarazí o múr či vlastného vojaka ako doteraz.
- **Druhy zbraní** (`WSTAT`, `wkind`, `wstat` v `js/sim/warband.js`): meč, obojručná zbraň, kopija, sekera, palcát, nôž – každý má **rýchlosť** (nápriah a zotavenie), **dosah**, **silu seku** a **silu bodu**. Sekera seká silno, ale bod je slabý; kopija bodá silno, ale sekom je slabá; nôž je rýchly a krátky; obojručná je pomalá a široká. Druh sa určí z vlastností a mena predmetu, takže nové zbrane v `js/data/equipment.js` ho dostanú samy.
- **Zranenie s odpočtom brnenia** (`hitZ`): brnenie nepriateľa už zranenie nenásobí koeficientom, ale **odráta pevnú hodnotu** (`armV` × `SOAK`; menej na hlave, rukách a nohách, najmenej pri tupých zbraniach, ktoré majú aj vyššie minimum zranenia). Slabý úder do plátu sa takmer stratí, silný prejde. Hrdina si ponecháva vlastné zníženie podľa brnenia, štítu a prilby (`red()`).
- **Bez výdrže** (Nastavenia → Výdrž v boji, predvolene bez výdrže): ako vo Warbande kryt obmedzuje len zdravie štítu a načasovanie, údery nič nestoja. Žltá lišta sa skryje. Pôvodný ťažší režim s výdržou sa dá zapnúť.
- **Vyváženie odpočtu brnenia:** `SOAK` je 5 (pôvodne 7). Meranie 14 bitiek na každú z troch frakcií ukázalo, že pri 7 mali obrnení nepriatelia o dosť viac preživších než pri starom výpočte; pri 5 je výsledok blízko starému, ale slabé údery do plátu sa stále strácajú.
- **Nepriatelia podľa zručnosti** (`aiSkill`, `aiWpn`, `aiMelee`): zručnosť 0 – 1 vychádza zo sily vojaka (veliteľ a spoločníci majú 1). Zručnejší sa **napriahuje rýchlejšie**, občas urobí **klam** (v poslednej chvíli zmení smer úderu – červená šípka sa prepne) a **zásah mu nápriah nepreruší**, kým slabého vojaka preruší (Warband: zásah ťa vyruší z úderu). Kopijník dosiahne ďalej a bodá, sekerník len seká (zľava, sprava, zhora), obri bijú zhora; rýchlosť a sila zbrane vojaka idú podľa `WSTAT`.
- **Nie je zatiaľ**: dotykové ovládanie a nápor jazdy ostávajú pri starom; AI od verzie 92 zasahuje čepeľou v pohybe (pozri *Duel ako vo Warbande*); číselné hodnoty zbraní sú odhad, nie údaje z Warbandu.

## Smerový boj (etapa 2, ako vo Warbande)

Platí v 3D aj v 2D, keď hráš myšou a klávesnicou (`heroDirectional`, `heroStrike`, `heroShoot` v `js/sim/combat.js`); na dotykovom displeji ostáva pôvodné ovládanie.

- **Smer úderu z pohybu myši:** tesne pred stlačením útoku pohni myšou – **hore = úder zhora** (jeden nepriateľ, +20 %), **vľavo / vpravo = sek z tej strany** (oblúk, až traja nepriatelia, zasiahne najprv toho na strane, odkiaľ ide čepeľ), **dole = bod** (úzky, dlhší dosah, +35 %, s kopijou +50 % a ešte ďalej). Bez pohybu myši sa seky striedajú zľava a sprava; **E** je vždy bod. Smer ukazuje zlatá šípka pri strede obrazovky a póza hrdinu.
- **Držaný nápriah:** drž tlačidlo – keď je nápriah hotový (šípka zažiari), úder je pripravený; čím dlhšie držíš, tým silnejší (až **+45 %**), po troch sekundách sa ruka unaví a sila klesá. Pustenie tlačidla udrie. **Klam:** kryt počas nápriahu úder zruší (stojí trochu výdrže).
- **Rýchlosť sa počíta:** úder v pohybe proti nepriateľovi je silnejší (na koni až +60 %), pri cúvaní slabší. Zbrane majú vlastný dosah a rýchlosť – obojručné sú pomalšie, kopije majú najdlhší dosah.
- **Sklopená kopija:** na koni s kopijou v rovnom cvale drž **E** – kopija sa sklopí a každý nepriateľ v ceste dostane veľký zásah podľa rýchlosti koňa a odletí. Šík kopijníkov ťa stále zastaví.
- **Vojaci volia smer:** každý nepriateľ sa napriahne zľava, sprava, zhora alebo na bod (trollovia bijú zhora, kopijníci bodajú) – červená šípka pri strede obrazovky ukazuje, odkiaľ ide úder na teba, a v 3D to vidno aj z jeho pózy. Vojaci sa učia: keď udieraš stále z rovnakej strany, kryjú to ľahšie; zmena smeru ich zaskočí. Silný obojručný úder kryt často prerazí.
- **Kryt do smeru:** v Nastaveniach **Smer krytu: myšou / automatický** (od verzie 92 je predvolený kryt myšou). Automatický kryje zbraňou všetko spredu (ako doteraz). **Myšou** (ako vo Warbande): pri držaní krytu pohni myšou k strane, odkiaľ úder ide (modrá šípka); zlý smer neubráni, správny má širšie okno na dokonalý kryt a nepriatelia sa napriahujú dlhšie, aby sa to dalo stihnúť. **Štít kryje všetky smery** spredu.
- **Luk so zameriavačom:** drž **Q** – luk sa napína a kruh zameriavača na zemi sa zužuje (rýchlejšie s lukostreľbou; v pohybe a na koni je väčší). Pusti – šíp letí v oblúku **k bodu pod kurzorom** (ďalej nedoletí, ako luk dovolí; slabo napnutý luk strieľa kratšie a slabšie). Príliš dlho napnutý luk sa začne triasť. Oštepy rovnako, len kratšie; **kuša** vystrelí hneď, keď je nabitá.

