/*
 * Udalosti na zaujímavých miestach mapy (PLACES). place(i) otvorí okno s možnosťami; návštevy majú odstup cd dní (G.pv).
 */
function place(i, inScene) {
    const P = PLACES[i], last = (G.pv || (G.pv = {}))[P.id], ready = last == null || G.day - last >= P.cd;
    const inRoomNow = ROOM && ROOM.room === 'place' && ROOM.pi === i;
    if (inScene == null && roomSceneOk('Place') && !inRoomNow) return enterPlace(i);   // vlastná scéna miesta
    if (inScene == null && inRoomNow) return roomReturn();
    const inS = inScene != null;
    mode = inS ? 'room' : 'town'; G.dest = -1;
    const back = inS ? () => { ov.classList.add('hide'); mode = 'room'; } : () => { ov.classList.add('hide'); mode = 'map'; }, done = () => { G.pv[P.id] = G.day; };
    show(P.n, P.d + (ready ? '' : ' (Nedávno si tu bol; vráť sa neskôr.)'));
    const acts = [];
    const act = (label, fn, icon) => { acts.push(label); if (typeof inScene === 'number' && inScene !== acts.length - 1) return; btn(label, () => { done(); fn(); }, !ready, icon); };
    if (P.id === 'amonsul') act('Vystúpiť na vrchol a rozhliadnuť sa', () => { const en = E.filter(e => hos(e.f, G.fac)).sort((a, b) => Math.hypot(a.x - G.x, a.y - G.y) - Math.hypot(b.x - G.x, b.y - G.y)).slice(0, 4); if (!G.pv.amonsul1) { G.pv.amonsul1 = 1; G.ren++; } msg('Z vrcholu vidíš: ' + (en.map(e => e.nm + ' (' + FN[e.f] + ', ' + Math.ceil(e.n) + ' mužov, ' + (e.x < G.x ? 'západ' : 'východ') + ')').join('; ') || 'nikoho') + '. ' + (isNight() ? 'V tme pod kopcom sa mihajú čierne tiene – lepšie neostať.' : 'Sláva +1 za výstup.'), back); }, 'map');
    if (P.id === 'argonath') act('Prejsť popod Kráľov', () => { G.ren += 2; G.hon = (G.hon || 0) + 1; msg('Kamenní králi hľadia na sever. Cítiš, že si súčasťou starého príbehu. Sláva +2, česť +1.', back); }, 'star');
    if (P.id === 'trolls') act('Prehľadať jaskyne (boj s trollmi)', () => { back(); startBattle({ n: 3, f: 9, nm: 'Trollovia', trolls: 1 }); }, 'attack');
    if (P.id === 'trolls' && !relic('trollking')) act('Vyzvať Kráľa trollov (boss – odporúča sa úroveň 6 a veľké vojsko)', () => { back(); bossBattle('trollking'); }, 'skull');
    if (P.id === 'moriagate') { if (!relic('balrog')) act('Zostúpiť do hlbín Morie (boss: Balrog – odporúča sa úroveň 8)', () => { back(); bossBattle('balrog'); }, 'fire'); else act('Pozrieť do hlbín', () => msg('Hlbiny Morie mlčia. Oheň, ktorý v nich horel, je preč.', back), 'door'); }
    if (P.id === 'dragonmount') { if (!relic('dragon')) act('Vstúpiť do dračieho brlohu (boss: drak – odporúča sa úroveň 10)', () => { back(); bossBattle('dragon'); }, 'fire'); else act('Prehľadať prázdny brloh', () => { const g = G.dragonLeft ? 0 : 150; G.dragonLeft = 1; G.gold += g; upd(); msg(g ? 'Medzi kosťami si našiel zabudnutý mešec: +150 zlata.' : 'Brloh je prázdny a studený.', back); }, 'door'); }
    if (P.id === 'bombadil') act('Zaklopať u Toma Bombadila', () => { G.hp = mh(); G.hon = (G.hon || 0) + 1; if (G.chp) Object.keys(G.chp).forEach(k => G.chp[k] = 1); msg('„Hop, hop, pútnik!“ Tom vás nakŕmi, Zlatienka naleje vodu zo studne a ráno sú všetci zdraví a odpočinutí. Zdravie všetkých plné, česť +1.', back); }, 'heart');
    if (P.id === 'marshes') { act('Prebrodiť močiare (skratka)', () => { const lost = Math.random() < .5 ? 1 : 0; G.inf = Math.max(0, G.inf - lost); G.fear = (G.fear || 0) + 1; msg(lost ? 'Jeden z mužov sa zahľadel do vody a zmizol v bahne. Ostatných prejde mráz. Strach +1.' : 'Bludičky vás lákali, ale držali ste sa cesty. Strach +1.', back); }, 'skull'); act('Hľadať v bahne (nebezpečné)', () => { const r = Math.random(); if (r < .3) { G.gold += 80; msg('V bahne nájdeš hrdzavú truhličku so zlatom dávneho vojska. +80 zlata.', back); } else { G.hp = Math.max(10, G.hp - 15); msg('Niečo studené ťa chytí za členok. Vytrhneš sa, ale stálo ťa to kus zdravia (−15).', back); } }, 'coins'); }
    if (P.id === 'spiders') act('Vyčistiť húštiny (boj s pavúkmi)', () => { back(); startBattle({ n: 8, f: 9, nm: 'Pavúky', spiders: 1 }); }, 'attack');
    if (P.id === 'fangorn') act(heroSide() === 1 ? 'Rúbať stromy' : 'Zavolať na pastierov stromov', () => { if (heroSide() === 1) { G.inf = Math.max(0, G.inf - 2); msg('Stromy sa pohli. Dvaja orkovia zmizli v konároch a ostatní utekajú. Pešiaci −2.', back); } else { G.hp = mh(); G.ren++; const ent = G.ren >= 5 && (G.ent || 0) < 3 && Math.random() < .6; if (ent) G.ent = (G.ent || 0) + 1; msg('Zo šera vystúpi Stromobrad. „Hm, hrúm. Neunáhlime sa.“ Po dlhom rozhovore vás pustí ďalej oddýchnutých. Zdravie plné, sláva +1.' + (ent ? ' Jeden z mladších entov sa rozhodol ísť s tebou – v bitke bude trhať orkov ako konáre (enti v družine: ' + G.ent + ').' : ''), back); } }, 'leaf');
    if (P.id === 'deadpaths') act('Vstúpiť do tmy', () => { if (heroSide() === 0 && G.ren >= 8) { G.fear = (G.fear || 0) + 5; G.ren += 3; msg('Mŕtvi ti odpovedajú. Tiene pôjdu za tebou do jednej bitky – nepriatelia sa ťa budú báť. Strach +5, sláva +3.', back); } else { G.hp = Math.max(10, G.hp - 20); msg('Tma ťa vyvrhne von. Nie si ten, na koho čakajú. Zdravie −20.', back); } }, 'skull');
    if (P.id === 'carrock') act('Zaklopať u Beorna', () => { if (heroSide() === 0) { G.hp = mh(); G.inf += 3; msg('Beorn zavrčí, ale pustí vás dnu. Med, smotana a ráno traja statní chlapi z jeho dvora idú s vami. Pešiaci +3, zdravie plné.', back); } else { back(); startBattle({ n: 1, f: 9, nm: 'Beorn', beorn: 1 }); } }, 'rest');
    if (P.id === 'isenfords') act('Prebrodiť rieku', () => { if (Math.random() < .5) { back(); startBattle({ n: 8, f: 3, nm: 'Hliadka Isengardu' }); } else msg('Brod je tichý. Len v tráve ležia staré prilby Rohanu.', back); }, 'map');
    if (P.id === 'minasithil') act('Pokloniť sa padlým', () => { G.hon = (G.hon || 0) + 2; msg('Vietor od rieky hýbe trávou nad hrobmi. Česť +2.', back); }, 'honor');
    btn(inS ? 'Späť' : 'Odísť', back, 0, inS ? 'back' : 'door');
}
/** Voľba a (poradie v zozname) z okna miesta, otvorená zo scény pamätihodnosti. */
function placeAct(i, a) { place(i, a); }
/** Rozhovor s postavou na pamätihodnosti. */
function placeTalk(i, who) {
    const P = PLACES[i]; mode = 'room';
    const back = () => { ov.classList.add('hide'); mode = 'room'; };
    const T = {
        tom: ['Tom Bombadil', { race: 'human', skin: 1, hair: 'curly', hcol: '#6a4a2a', beard: 'full', eyes: '#4a8ad0', smile: 1 }, ['Hop, hop, pútnik, len poď ďalej! Kto prišiel cez Starý les, zaslúži si teplú polievku – u Toma je vždy stôl prestretý.', 'Prsteň? Ukáž… Hm, taká vecička. Tomovi nič nerobí. Ale tebe, tebe by mohla. Daj si pozor na Mohylové vrchy.', 'Zlatienka spieva o daždi a ty mi vyzeráš, že by si potreboval pieseň aj spánok.']],
        beorn: ['Beorn', { race: 'human', skin: 1, hair: 'long', hcol: '#1a1a1a', beard: 'full', eyes: '#3a2a1a', age: .5 }, ['Hrmm. Cudzinci. Nemám rád cudzincov, ale mám rád med. Vezmi si, kým som v dobrej nálade.', 'Orkov z Hmlistých hôr poznám po pachu. Ak ich zaháňaš, si môj hosť. Ak ich privádzaš, choď.', 'V noci neopúšťaj dom. V noci chodím ja. A nie po dvoch.']],
        ranger: ['Hraničiar Severu', { race: 'human', skin: 1, hair: 'long', hcol: '#2a1a10', beard: 'stubble', eyes: '#6a7a7a', age: .5 }, ['Vetrov. Tu stála Amon Sûl, kým ju Angmar nezrovnal so zemou. Z vrcholu vidno na všetky strany – aj to, čo by si radšej nevidel.', 'Ak tu ostaneš cez noc, drž oheň pri sebe. Prichádzajú sem čierne tiene a tie sa ohňa boja.', 'Dúnadani strážia tieto cesty, aj keď nám za to nikto nepoďakuje.']],
        rider: ['Rohanský zved', { race: 'human', skin: 0, hair: 'long', hcol: '#e8d0a0', beard: 'stubble', eyes: '#4a8ad0' }, ['Brody na Isene. Tu padol Théodred, syn kráľa. Isengard sem posiela hliadky každý týždeň.', 'Ak uvidíš bielu ruku na štíte, nečakaj, kým zaútočia prví.', 'Kone cítia Uruk-hai skôr než my. Keď frkajú, je čas tasiť.']],
        guard: ['Strážca Pelennoru', { race: 'human', skin: 1, hair: 'short', hcol: '#3a2a1a', beard: 'none', eyes: '#4a6a8a' }, ['Tu sa rozhodovalo o Západe. Na tomto poli padol kráľ Théoden a tu zomrel Čierny kapitán.', 'Strom uschol v deň bitky. Nikto sa ho neodváži vyrúbať.', 'Pod trávou ešte ležia prilby. Keď prší, vychádzajú na povrch.']],
        ferry: ['Prievozník', { race: 'human', skin: 1, hair: 'bald', beard: 'full', hcol: '#c8c0b0', eyes: '#4a5a6a', age: .9 }, ['Králi Isildur a Anárion. Hľadia na sever už tri tisícročia a ešte sa neunavili.', 'Za Argonathom je Nen Hithoel a vodopády Rauros. Kto sa po nich pustí na lodi, už sa nevráti.', 'Prevoz stojí dve mince. Pre dedičov kráľov zadarmo – ale tých tu veľa nechodí.']],
        hobbit: ['Smiešok Brandylen', { race: 'hobbit', skin: 0, hair: 'curly', hcol: '#8a5a30', beard: 'none', eyes: '#5a7a5a', smile: 1 }, ['Pšt! Stromobrad hovorí pomaly, ale počúva rýchlo. Nehovor nič unáhlené.', 'Enti sa radia už tri dni. Zatiaľ sa dohodli, že sa budeme volať „hobiti“ a že nie sme orkovia.', 'Ent-nápoj! Ochutnaj. Vraj po ňom človek rastie. U mňa to funguje.']]
    }[who];
    if (!T) return back();
    PORTRAIT = T[1];
    show(T[0], '„' + T[2][Math.floor(Math.random() * T[2].length)] + '“');
    btn('Povedz niečo', () => placeTalk(i, who), 0, 'talk');
    btn('Späť', back, 0, 'back');
}
