/*
 * Udalosti počas cesty po mape: kupecká karavána, pútnici, zranený pocestný, nočný prepad, stratený vojak,
 * bard, dedinčania prosiaci o pomoc, trpasličí kupec, nález… Udalosť príde raz za 1,5–3 dni pochodu (G.evt odpočítava
 * herný čas iba počas pohybu) a otvorí okno s voľbami. Voľby menia zlato, vojsko, česť (G.hon), strach (G.fear), slávu.
 * Zoznam TRAVEL: { id, w (váha), cond(), run() }. run() ukáže okno cez show/btn.
 */
const TRAVEL = [];
const trEnd = () => { ov.classList.add('hide'); mode = 'map'; };
const trMsg = (t, fn) => msg(t, fn || trEnd);
const trAdd = (id, w, cond, run) => TRAVEL.push({ id, w, cond, run });
const trNight = () => isNight();
const trReg = () => regionAt(G.x, G.y);
const trEvil = () => heroSide() === 1;

/* --- dobro aj zlo --- */
trAdd('caravan', 3, () => true, () => {
    const g = GOODS[Math.floor(Math.random() * GOODS.length)], n = 4 + Math.floor(Math.random() * 5), price = Math.max(4, Math.round(g.p * .6)) * n;
    evShow('Kupecká karavána', 'Na ceste stretávaš karavánu kupcov z ' + (trReg() === 'a' ? 'Rhûnu' : trReg() === 'd' ? 'Haradu' : 'Dolu') + '. Vozy sú plné a kupec ponúka ' + n + '× ' + g.n + ' (' + g.ico + ') za ' + price + ' zlata – pod cenou, lebo sa ponáhľa.');
    btn('Kúpiť (' + price + ' zlata)', () => { G.gold -= price; G.cargo = G.cargo || {}; G.cargo[g.k] = (G.cargo[g.k] || 0) + n; upd(); trMsg('Tovar je naložený vo voze.'); }, G.gold < price || cargoCount() + n > 40, 'scales');
    btn('Prepadnúť karavánu', () => { trEnd(); startBattle({ n: 4 + Math.floor(Math.random() * 4), f: 9, nm: 'Stráž karavány', loot: 1 }); G.hon = (G.hon || 0) - 4; G.fear = (G.fear || 0) + 2; }, 0, 'attack');
    btn('Popriať šťastnú cestu', trEnd, 0, 'door');
});
trAdd('wounded', 3, () => true, () => {
    evShow('Zranený pocestný', 'Pri ceste leží muž s ranou na nohe. Vraví, že ho prepadli ' + (trEvil() ? 'gondorskí hraničiari' : 'orkovia') + ' a vzali mu všetko okrem života.');
    btn('Ošetriť ho a dať mu jedlo (česť +2)', () => { G.hon = (G.hon || 0) + 2; const r = Math.random(); trMsg(r < .4 ? 'Muž sa po dvoch dňoch postaví a chce ti slúžiť. Pešiaci +1.' : 'Vďačne ti stisne ruku. „Ak budeš niekedy v núdzi, spomeň si na mňa.“ Sláva +1.'); if (r < .4) G.inf++; else G.ren++; upd(); }, 0, 'heart');
    btn('Obrať ho o zvyšok (zlato +15, česť −3)', () => { G.gold += 15; G.hon = (G.hon || 0) - 3; G.fear = (G.fear || 0) + 1; upd(); trMsg('Muž ťa prekľaje. Tvoji vojaci sa po sebe pozrú.'); }, 0, 'coins');
    btn('Ísť ďalej', trEnd, 0, 'door');
});
trAdd('lost', 2, () => ar() < 60, () => {
    const k = trEvil() ? 'ork' : 'vojak';
    evShow('Stratený ' + k, 'Z lesa vyjde ' + (trEvil() ? 'ork so zlomeným kopijou a hlasno šomre o veliteľovi, ktorý ho nechal za sebou' : 'vojak v roztrhanom plášti; jeho oddiel padol a on blúdi už tretí deň') + '. Chce sa pridať k tvojej družine.');
    btn('Prijať ho (pešiak +1)', () => { G.inf++; upd(); trMsg(trEvil() ? '„Budem bojovať za toho, kto mi dá mäso.“' : '„Ďakujem, pane. Už som myslel, že tu zahyniem.“'); }, 0, { u: 'i' });
    btn('Poslať ho preč', trEnd, 0, 'door');
});
trAdd('bard', 2, () => G.gold >= 20, () => {
    evShow('Potulný pevec', 'Pri ohni sedí pevec s lutnou. Za pár mincí vraj zloží pieseň o tvojich činoch, ktorá sa roznesie po krčmách.');
    btn('Zaplatiť 20 zlata (sláva +1)', () => { G.gold -= 20; G.ren++; upd(); trMsg('„…a ' + G.name + ' tasil meč a tma sa rozostúpila!“ Pieseň nie je zlá.'); }, G.gold < 20, 'coins');
    btn('Zaplatiť 60 zlata (sláva +3)', () => { G.gold -= 60; G.ren += 3; upd(); trMsg('Pevec sa rozžiari a sľubuje baladu na dvanásť slôh.'); }, G.gold < 60, 'coins');
    btn('Vypočuť si pieseň zadarmo', () => trMsg('Pevec spieva o Berenovi a Lúthien. Vojaci počúvajú v tichu a ráno kráčajú ľahšie.'), 0, 'mug');
});
trAdd('shrine', 1, () => true, () => {
    const found = Math.random() < .5;
    evShow(trEvil() ? 'Starý oltár' : 'Zabudnutý pamätník', trEvil() ? 'V skalách stojí čierny oltár so starými obeťami. Niečo pod ním zaujímavo cinká.' : 'Medzi stromami stojí kamenný stĺp s elfským písmom a kôpkou kameňov pri päte.');
    btn('Prehľadať', () => { if (found) { const g = 20 + Math.floor(Math.random() * 60); G.gold += g; upd(); trMsg('Pod kameňmi nájdeš mešec. +' + g + ' zlata.'); } else trMsg('Nič okrem kostí a hliny.'); }, 0, 'chest');
    btn(trEvil() ? 'Priniesť obetu (strach +2)' : 'Uctiť si pamiatku (česť +1)', () => { if (trEvil()) G.fear = (G.fear || 0) + 2; else G.hon = (G.hon || 0) + 1; upd(); trMsg(trEvil() ? 'Orkovia v družine zamrmlú čosi v Čiernej reči a pozerajú na teba s rešpektom.' : 'Ticho. Vietor v korunách. Pokračuješ s ľahším srdcom.'); }, 0, trEvil() ? 'skull' : 'honor');
    btn('Ísť ďalej', trEnd, 0, 'door');
});
trAdd('ambush', 3, () => trNight(), () => {
    const bands = E.filter(e => e.f === 9), b = bands.length ? bands[Math.floor(Math.random() * bands.length)] : null;
    evShow('Nočný prepad', 'V tme za táborom zapraská konár. Než stihneš zakričať, zo tmy sa valia ' + (trReg() === 'a' || trReg() === 'd' ? 'orkovia' : 'lupiči') + ' s fakľami!');
    btn('Do zbrane!', () => { trEnd(); startBattle({ n: 5 + Math.floor(Math.random() * 5 + G.day / 6), f: 9, nm: 'Nočná tlupa', kind: trReg() === 'a' || trReg() === 'd' ? 'orcs' : 'bandit' }); }, 0, 'attack');
    btn('Zaplatiť výpalné (' + Math.min(G.gold, 40) + ' zlata)', () => { G.gold -= Math.min(G.gold, 40); G.hon = (G.hon || 0) - 1; upd(); trMsg('Lupiči si vezmú mešec a zmiznú v tme. Vojaci si šomrú pod nos.'); }, 0, 'coins');
});
trAdd('plea', 3, () => E.some(e => e.f === 9 && Math.hypot(e.x - G.x, e.y - G.y) < 400 * K), () => {
    const b = E.filter(e => e.f === 9).sort((p, q) => Math.hypot(p.x - G.x, p.y - G.y) - Math.hypot(q.x - G.x, q.y - G.y))[0];
    evShow('Prosba dedinčanov', 'Pribehne k tebe starec s vnučkou: „Pane, ' + b.nm + ' nám vypaľuje polia a kradne dobytok! Ty máš meč a vojakov. Pomôž nám a dáme ti, čo máme.“');
    btn('Vyraziť na nich (cieľ nastavený)', () => { G.chase = b; G.bounty = { id: b.id, nm: b.nm, g: 40 + Math.floor(b.n * 5) }; trEnd(); }, 0, 'attack');
    btn('Odmietnuť', () => { G.hon = (G.hon || 0) - 1; trEnd(); }, 0, 'door');
});
trAdd('dwarf', 1, () => !trEvil() || trReg() === 's', () => {
    const SHw = SH.find(x => x.k === 'w'), own = G.own && G.own.w || [0], cand = SHw.it.map((it, i) => i).filter(i => !own.includes(i) && i <= G.eq.w + 3 && SHw.it[i].p && SHw.it[i].p < 400);
    const i = cand.length ? cand[Math.floor(Math.random() * cand.length)] : -1, it2 = i >= 0 ? SHw.it[i] : null, price = it2 ? Math.round(it2.p * .7) : 0;
    evShow('Trpasličí kupec', 'Na poníkovi s dvoma ťažkými vakmi sedí trpaslík z Ereboru. ' + (it2 ? 'Ponúka ti ' + it2.n + ' za ' + price + ' zlata – „o tretinu lacnejšie než u kováča, lebo sa mi nechce ťahať to domov“.' : 'Všetko už predal, ale rád sa s tebou podelí o pivo.'));
    if (it2) btn('Kúpiť ' + it2.n + ' (' + price + ')', () => { G.gold -= price; G.own.w.push(i); G.own.w.sort((a, b) => a - b); upd(); trMsg('Trpaslík zamrmle „Baruk Khazâd“ a odkluše ďalej.'); }, G.gold < price, { k: 'w', i });
    btn('Vypiť s ním pivo', () => { G.hp = Math.min(mh(), G.hp + 15); upd(); trMsg('Pivo z Ereboru je husté ako kaša. Zdravie +15.'); }, 0, 'mug');
    btn('Ísť ďalej', trEnd, 0, 'door');
});
trAdd('storm', 1, () => MW.n === 'storm' || MW.n === 'snow', () => {
    evShow(MW.n === 'snow' ? 'Snehová víchrica' : 'Búrka na ceste', MW.n === 'snow' ? 'Sneh zasype cestu a mráz štípe. Dvaja vojaci omrzli a jeden kôň sa zranil na ľade.' : 'Prudký lejak strhne tábor, blesk rozštiepi strom vedľa vozov.');
    btn('Prečkať (strata dňa, zdravie družiny)', () => { endDay(); G.inf = Math.max(0, G.inf - 1); if (G.cav > 0 && Math.random() < .5) G.cav--; upd(); trMsg('Ráno je ticho. Zrátaš straty a ideš ďalej.'); }, 0, 'rest');
    btn('Prebiť sa (zdravie −10)', () => { G.hp = Math.max(10, G.hp - 10); upd(); trMsg('Premočený a zmrznutý, ale na ceste.'); }, 0, 'sword');
});
/* --- iba dobro / iba zlo --- */
trAdd('elfscout', 2, () => !trEvil() && (trReg() === 'g' || trReg() === 's'), () => {
    const en = E.filter(e => hos(e.f, G.fac) && e.f !== 9).sort((a, b) => Math.hypot(a.x - G.x, a.y - G.y) - Math.hypot(b.x - G.x, b.y - G.y))[0];
    evShow('Elfský zved', 'Z konárov zoskočí elf v sivom plášti. „Tieň sa hýbe. ' + (en ? en.nm + ' z ' + FN[en.f] + ' tiahne s ' + Math.ceil(en.n) + ' mužmi ' + (en.x < G.x ? 'na západ od teba' : 'na východ od teba') + '.' : 'Ale dnes je kraj tichý.') + '“');
    btn('Poďakovať (sláva +1)', () => { G.ren++; upd(); trMsg('Elf sa ukloní a zmizne, ako keby nikdy nebol.'); }, 0, 'leaf');
    btn('Požiadať o lembas (zdravie družiny)', () => { G.hp = mh(); if (G.chp) Object.keys(G.chp).forEach(k => G.chp[k] = Math.min(1, G.chp[k] + .3)); upd(); trMsg('Jeden chlebík stačí na celý deň pochodu. Zdravie plné.'); }, 0, 'heart');
});
trAdd('orcpatrol', 2, () => trEvil(), () => {
    evShow('Orkská hliadka', 'Hliadka orkov z Mordoru ťa zastaví: „Kto ide? Ukáž znak!“ Keď uvidia tvoju zástavu, uvoľnia sa. Kapitán ponúka výmenu: dvoch svojich najhorších za sud piva.');
    btn('Vymeniť (pešiaci +2, zlato −10)', () => { G.gold -= 10; G.inf += 2; upd(); trMsg('„Sú slabí, ale hryzú.“ Orkovia sa zaradia na koniec tvojej kolóny.'); }, G.gold < 10, { u: 'i' });
    btn('Zastrašiť ich (strach +1)', () => { G.fear = (G.fear || 0) + 1; upd(); trMsg('Kapitán zbledne, ak ork môže zblednúť, a hliadka ustúpi z cesty.'); }, 0, 'skull');
});
trAdd('refugees', 2, () => !trEvil(), () => {
    evShow('Utečenci', 'Po ceste sa vlečie zástup ľudí s vozíkmi. Ich dedinu vypálili. Prosia o jedlo a ochranu do najbližšieho hradu.');
    btn('Dať im zásoby (zlato −20, česť +2)', () => { G.gold -= 20; G.hon = (G.hon || 0) + 2; G.ren++; upd(); trMsg('Ženy ti bozkávajú ruky. Príbeh o tvojej dobrote sa roznesie.'); }, G.gold < 20, 'heart');
    btn('Naverbovať mladých (pešiaci +2)', () => { G.inf += 2; upd(); trMsg('Dvaja mladíci vezmú kopije. Starší sa pozerajú so strachom aj nádejou.'); }, 0, { u: 'i' });
    btn('Ísť ďalej', trEnd, 0, 'door');
});
trAdd('slaves', 2, () => trEvil(), () => {
    evShow('Zajatí dedinčania', 'Tvoji orkovia privlečú troch zviazaných sedliakov, ktorých chytili na poli.');
    btn('Predať ich (zlato +30, strach +1)', () => { G.gold += 30; G.fear = (G.fear || 0) + 1; G.hon = (G.hon || 0) - 2; upd(); trMsg('Mešec zacinká. Sedliaci odchádzajú v reťaziach na východ.'); }, 0, 'coins');
    btn('Prepustiť ich (česť +1)', () => { G.hon = (G.hon || 0) + 1; upd(); trMsg('Orkovia vrčia, ale poslúchnu.'); }, 0, 'door');
});
trAdd('horse', 1, () => G.eq.m === 0 && (G.own.m || []).length < 2 && !trEvil(), () => {
    evShow('Zatúlaný kôň', 'Na lúke sa pasie osedlaný kôň bez jazdca. Na sedle je znak Rohanu.');
    btn('Chytiť ho (kôň do stajne)', () => { if (!G.own.m.includes(1)) G.own.m.push(1); G.own.m.sort((a, b) => a - b); upd(); trMsg('Kôň sa dá chytiť po chvíli. Máš nového koňa – nasadni v inventári.'); }, 0, 'horse');
    btn('Nechať ho', trEnd, 0, 'door');
});

/** Odpočítavanie počas pochodu; vráti true, ak sa otvorilo okno udalosti. */
function travelTick(dt) {
    if (mode !== 'map') return false;
    if (G.evt == null) G.evt = 500 + Math.random() * 600;
    G.evt -= dt;
    if (G.evt > 0) return false;
    G.evt = 900 + Math.random() * 900;
    const list = TRAVEL.filter(t => { try { return t.cond(); } catch (e) { return false; } });
    if (!list.length) return false;
    let w = list.reduce((s, t) => s + t.w, 0), r = Math.random() * w, pick = list[0];
    for (const t of list) { r -= t.w; if (r <= 0) { pick = t; break; } }
    mode = 'town'; G.tx = G.x; G.ty = G.y; G.dest = -1; G.vd = -1; G.pd = -1;
    pick.run();
    lg('Udalosť na ceste: ' + (ov.querySelector('h1') || {}).textContent);
    return true;
}
