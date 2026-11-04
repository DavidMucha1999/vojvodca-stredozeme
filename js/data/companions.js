/*
 * Spoločníci: postavy z Pána prsteňov, ktoré sa dajú nájsť v hradoch a pripojiť k družine.
 * side: 0 dobro, 1 zlo (ponúkajú sa len hrdinovi tejto strany). at: hrad, kde sa dá spoločník nájsť.
 * p: cena za pripojenie (zlato), ren: potrebná sláva. hp, d, sp, r: sila v bitke. art: druh kreslenia
 * (kľúč z Soldiers.UNITS alebo vlastný hrdina cez eq = výbava).
 * look: popis tváre pre portrét (js/render/portraits.js).
 * Texty: join (pri pripojení), lines (hlášky na mape a v rozhovore), battle (pokriky v bitke), leave (pri odchode).
 */
const COMPANIONS = [
    { id: 'aragorn', n: 'Aragorn', t: 'Dúnadan, dedič Isildura', look: { race: 'human', skin: 1, hair: 'long', hcol: '#2a1a10', beard: 'stubble', eyes: '#6a7a7a', age: .5 }, side: 0, at: 'Bree', p: 400, ren: 6, hp: 220, d: 24, sp: 1.35, r: 9, eq: { w: 3, a: 0, s: 0, h: 0, m: 0 },
      join: 'Ak chceš, aby som šiel s tebou, pôjdem. Poznám cesty, o ktorých mapy mlčia, a ľudí, ktorí o mne nevedia nič.',
      lines: ['Nebezpečenstvo je ešte ďaleko. Nie však tak ďaleko, ako by sme chceli.', 'Strach je ako hmla nad močiarom. Keď vyjde slnko, nik si naň nespomenie.', 'Mám pre teba jednu radu: nikdy neopúšťaj cestu, ktorú si si vybral, kým neuvidíš, kam vedie.', 'Nie som Isildur. Jeho slabosť nenesiem, len jeho meč.', 'Arwen... nie, to nie je dôležité. Poďme ďalej.'],
      battle: ['Za Gondor!', 'Elendil!', 'Držte šík!', 'Stojte pevne!'], leave: 'Rozchádzame sa, ale cesty sa možno ešte spoja. Zbohom.' },
    { id: 'legolas', n: 'Legolas', t: 'elfský princ z Temného hvozdu', look: { race: 'elf', skin: 0, hair: 'long', hcol: '#e8d8a0', beard: 'none', eyes: '#4a8ad0' }, side: 0, at: 'Lothlórien', p: 380, ren: 6, hp: 150, d: 16, sp: 1.6, r: 7, art: 'uL2', archer: 1,
      join: 'Máš moj luk. Elfovia si dlho pamätajú, kto stál pri nich.',
      lines: ['Vietor nesie dym. Niekde za kopcami horí dedina.', 'Stopy orkov. Ťažké čižmy, ponáhľajú sa na západ.', 'Niečo sa tam hýbe. Niečo, čo tam nemá byť.', 'Trpaslík chrápe tak hlasno, že ho počuť až v Mordore.', 'Mám dobrý zrak. Vidím, že sa usmievaš. To je zriedkavé.'],
      battle: ['Yrch!', 'Strieľajte!', 'Ďalší!', 'Vpred!'], leave: 'Les ma volá. Nech ťa hviezdy chránia.' },
    { id: 'gimli', n: 'Gimli', t: 'syn Glóinov z Ereboru', look: { race: 'dwarf', skin: 1, hair: 'long', hcol: '#b05a20', beard: 'braided', eyes: '#4a4a3a', age: .5 }, side: 0, at: 'Erebor', p: 350, ren: 5, hp: 240, d: 22, sp: 1.0, r: 8, art: 'uE1',
      join: 'Moja sekera je tvoja! A ak si myslíš, že budem jazdiť na koni, tak si sa zmýlil.',
      lines: ['Trpaslík sa neponáhľa. Trpaslík prichádza presne vtedy, keď treba.', 'Kamene v Ereborových sieňach sú staršie než všetky elfské piesne.', 'Elf má lepší zrak, ale ja mám lepšiu sekeru.', 'Keby som mal pivo z Ereboru, bolo by to ľahšie. Ale aj tak to zvládnem.', 'Elf zas počíta. Nech počíta, ja medzitým sekám.'],
      battle: ['Baruk Khazâd!', 'Khazâd ai-mênu!', 'Pre Erebor!', 'Na nich!'], leave: 'Dobrá bitka, dobrí ľudia. Trpaslík nezabúda.' },
    { id: 'boromir', n: 'Boromir', t: 'kapitán Bielej veže', look: { race: 'human', skin: 0, hair: 'long', hcol: '#8a5a30', beard: 'stubble', eyes: '#4a6a8a', age: .4 }, side: 0, at: 'Minas Tirith', p: 360, ren: 5, hp: 230, d: 23, sp: 1.2, r: 9, eq: { w: 3, a: 2, s: 2, h: 0, m: 0 },
      join: 'Biele mesto potrebuje každý meč a ja potrebujem niekoho, komu môžem veriť. Pôjdem s tebou.',
      lines: ['Za Čiernou bránou je krajina, kde ani tráva nerastie. Nechcem ju vidieť zblízka.', 'Najväčšie vojny sa začínajú pre malé veci. Pre slovo, pre zlato, pre prsteň.', 'Môj otec je ušľachtilý muž. Ale jeho vláda zlyháva.', 'Videl som Biele mesto, ako žiari za úsvitu. Pre to bojujem.', 'Roh Gondoru zaznie, keď bude treba. Vždy zaznel.'],
      battle: ['Za Gondor!', 'Biele mesto!', 'Ku mne!', 'Držte sa!'], leave: 'Moja cesta vedie do Minas Tirith. Možno sa ešte stretneme pod bielym stromom.' },
    { id: 'eowyn', n: 'Éowyn', t: 'štítonosička Rohanu', look: { race: 'human', sex: 'f', skin: 0, hair: 'long', hcol: '#e8d0a0', beard: 'none', eyes: '#4a8ad0' }, side: 0, at: 'Edoras', p: 300, ren: 4, hp: 170, d: 20, sp: 1.3, r: 8, eq: { w: 2, a: 1, s: 1, h: 1, m: 2 },
      join: 'Celý život som len čakala pri bráne, kým sa muži vrátia. Už nebudem čakať. Vezmi ma so sebou.',
      lines: ['Ženy tejto krajiny sa dávno naučili, že kto nemá meč, môže naň zomrieť.', 'Nepriatelia ma podceňujú. Je to ich posledná chyba.', 'Edoras je krásny z diaľky. Zblízka je plný šepotu.', 'Strýko bol veľký kráľ. Bude ním znova.', 'Kone ma poznajú. Ľudia menej.'],
      battle: ['Za Rohan!', 'Smrť!', 'Eorlingovia!', 'Vpred, za kráľa!'], leave: 'Vraciam sa do Edorasu. Ale už nie do klietky.' },
    { id: 'faramir', n: 'Faramir', t: 'kapitán Ithilienu', look: { race: 'human', skin: 0, hair: 'long', hcol: '#8a4a28', beard: 'stubble', eyes: '#4a6a8a', age: .3 }, side: 0, at: 'Osgiliath', p: 320, ren: 4, hp: 180, d: 18, sp: 1.3, r: 7, art: 'uG2', archer: 1,
      join: 'Nebojujem pre slávu, ale pre polia a domy za našimi chrbtami. Ak bojuješ pre to isté, pôjdem s tebou.',
      lines: ['Vojna urobí z nás všetkých mŕtvoly.', 'Otec... môj otec miluje Boromira. Ja som sa naučil s tým žiť.', 'Ithilien bol kedysi záhradou Gondoru. Bude ňou znova.', 'Niektoré poklady je lepšie nechať ležať tam, kde ležia.', 'Hraničiari vidia všetko a hovoria málo. Učím sa od nich.'],
      battle: ['Za Ithilien!', 'Šípy!', 'Držte brod!', 'Gondor!'], leave: 'Hliadky ma potrebujú. Nech ťa cesta vedie bezpečne.' },
    { id: 'sam', n: 'Samved Gamdží', t: 'záhradník z Hobitova', look: { race: 'hobbit', skin: 0, hair: 'curly', hcol: '#8a5a30', beard: 'none', eyes: '#5a7a5a', smile: 1 }, side: 0, at: 'Hobitov', p: 120, ren: 1, hp: 110, d: 10, sp: 1.1, r: 6, eq: { w: 0, a: 0, s: 0, h: 0, m: 0 },
      join: 'Sľúbil som, že neodídem. Tak neodídem. A varím lepšie než ktokoľvek v tvojej družine.',
      lines: ['Dobrá polievka postaví na nohy aj trpaslíka. Kde mám kotlík?', 'Doma teraz kvitnú jablone. Na to myslím, keď je najhoršie.', 'Rosie Cottonová... prepáč, zamyslel som sa.', 'Nikdy som nebol tak ďaleko od Kraja. Ani som nevedel, že svet je taký veľký.', 'Pán Frodo by vedel, čo povedať. Ja viem len to, že ideme ďalej.'],
      battle: ['Za Kraj!', 'Nechaj ho!', 'Tu máš!', 'Pán Frodo!'], leave: 'Idem domov. Záhrada čaká. Zbohom.' },
    // --- zlo ---
    { id: 'lurtz', n: 'Lurtz', t: 'prvý z Uruk-hai', look: { race: 'uruk', hair: 'lank', hcol: '#1a1410', beard: 'none', angry: 1, paint: 1 }, side: 1, at: 'Isengard', p: 380, ren: 5, hp: 260, d: 24, sp: 1.2, r: 9, art: 'uI1',
      join: 'Saruman ma stvoril, aby som zabíjal. Ty mi dáš koho. To je celá dohoda.',
      lines: ['Rozkazy sú jednoduché. Tí, čo bežia, padnú prví.', 'Pochodujeme vo dne aj v noci. Slnko nám už neublíži.', 'Rohan padne a ja budem stáť na jeho kostiach.', 'Uruk-hai nepozná strach. Nepozná ani únavu. Pozná len rozkaz.', 'Biela ruka ukáže a my ideme.'],
      battle: ['Zabite ich!', 'Uruk-hai!', 'Žiadne zajatce!', 'Vpred!'], leave: 'Isengard volá. Nabudúce sa stretneme na opačných stranách bojiska.' },
    { id: 'gothmog', n: 'Gothmog', t: 'poručík Morgulu', look: { race: 'orc', hair: 'bald', beard: 'none', angry: 1, scar: 1 }, side: 1, at: 'Minas Morgul', p: 420, ren: 6, hp: 240, d: 23, sp: 1.1, r: 9, art: 'orc',
      join: 'Ľudia si myslia, že im patrí svet. Ukážeme im, ako sa mýlia. Ak bojuješ za Tieň, bojuješ so mnou.',
      lines: ['Katapulty pripraviť! Nech hradby padnú skôr, než zapadne slnko!', 'Netreba sa báť tmy. Tma je naša.', 'Biele mesto zhorí. Videl som to v plameňoch Oka.', 'Čarodejník ich zachráni? Nikto ich nezachráni.', 'Bolesť je len slabosť, ktorá opúšťa telo. Mne už dávno opustila.'],
      battle: ['Za Morgul!', 'Zrúcajte hradby!', 'Zabite všetko!', 'Za Oko!'], leave: 'Morgul ma čaká. Oko ťa bude sledovať.' },
    { id: 'grima', n: 'Gríma Červivý jazyk', t: 'radca v Sarumanových službách', look: { race: 'human', skin: 3, hair: 'lank', hcol: '#1a1410', beard: 'none', eyes: '#8a8a9a', age: .3 }, side: 1, at: 'Edoras', p: 200, ren: 2, hp: 90, d: 8, sp: 1.2, r: 6, eq: { w: 9, a: 0, s: 0, h: 0, m: 0 }, talker: 1,
      join: 'Môj pane... som len skromný radca. Ale radca, ktorý pozná každé tajomstvo Zlatej siene. Môžem byť užitočný.',
      lines: ['Zbroj by vám slušala, pane. Ale slová sú ostrejšie.', 'Théoden starne. Každý deň o kúsok. Zariadil som to.', 'Éowyn... Nie. Nič.', 'Saruman sľúbil. Saruman vždy sľubuje.', 'Nikdy nestojte v prvom rade, pane. Prvý rad je pre hlupákov s mečom.'],
      battle: ['Ochráňte ma!', 'Zabite toho!', 'Nie ja, oni!', 'Pane, pozor!'], leave: 'Vraciam sa k Sarumanovi. Alebo k Théodenovi. Podľa toho, kto platí.' },
    { id: 'shagrat', n: 'Šagrat', t: 'kapitán Cirith Ungolu', look: { race: 'orc', hair: 'bald', beard: 'none', angry: 1, helm: '#3a3632' }, side: 1, at: 'Barad-dûr', p: 260, ren: 3, hp: 190, d: 19, sp: 1.25, r: 8, art: 'uM1',
      join: 'Veliteľ veže. To som ja. Teraz som tvoj veliteľ veže, ak platíš lepšie než Lugbúrz.',
      lines: ['Tá košeľa z mithrilu... ten malý krysák ju mal. Ešte ju nájdem.', 'Gorbag bol kamarát. Potom chcel môj poklad. Už nie je kamarát.', 'Pavúčica dostane svoje. Vždy dostane svoje.', 'Nazgûli sú hore, my sme dole. Tak to má byť.', 'Elfské špinavé čepele. Nenávidím ich lesk.'],
      battle: ['Za Lugbúrz!', 'Roztrhám vás!', 'Chyťte ich!', 'Krv!'], leave: 'Cirith Ungol volá. Netráp sa, veža ma potrebuje viac než ty.' },
    { id: 'suladan', n: 'Suladân', t: 'náčelník Haradu', look: { race: 'dark', hair: 'short', hcol: '#1a1410', beard: 'full', eyes: '#2a1a10', turban: '#c84a2a' }, side: 1, at: 'Umbar', p: 340, ren: 4, hp: 200, d: 21, sp: 1.3, r: 8, art: 'uH1',
      join: 'Juh pôjde s tebou, kým pôjdeš s juhom. Moji jazdci počúvajú môj hlas a môj hlas počúva zlato.',
      lines: ['Olifanty nepotrebujú cestu. Cesta potrebuje olifanty.', 'Sauron sľúbil juhu sever. Ja chcem len dobré pastviny.', 'V Harade slnko páli. Tu len svieti. Slabé.', 'Gondorčania majú hradby. My máme trpezlivosť.', 'Hadí znak na mojom štíte je starší než Gondor. Pamätaj si to.'],
      battle: ['Za Harad!', 'Had uštipne!', 'Vpred, jazdci!', 'Juh!'], leave: 'Slnko ma volá domov. Zbohom, severan.' },
    { id: 'mouth', n: 'Ústa Saurona', t: 'posol Barad-dûru', look: { race: 'human', skin: 3, hair: 'bald', beard: 'none', helm: '#141418', eyes: '#111' }, side: 1, at: 'Morannon', p: 450, ren: 7, hp: 200, d: 22, sp: 1.2, r: 9, eq: { w: 15, a: 13, s: 0, h: 8, m: 7 },
      join: 'Môj Pán Sauron Veľký ťa víta. Ja som jeho hlas. Budem hovoriť za teba, kým budeš slúžiť.',
      lines: ['Som Ústa Saurona. Meno som zabudol. Nepotrebujem ho.', 'Starý sivák. Myslí si, že slová ho zachránia.', 'Mithrilová košeľa polovičíka. Pán ju má. Alebo mal.', 'Pán Mordoru ponúka podmienky. Vždy ponúka podmienky. Potom ich zmení.', 'Čierna reč je krásna, ak ju vieš čítať. Ty ju nevieš.'],
      battle: ['Za Saurona!', 'Oko vidí!', 'Zomrite!', 'Lugbúrz!'], leave: 'Pán ma volá k Čiernej bráne. Nezabudne na teba. Nikdy.' }
];
