/*
 * Automatický test simulácie bez prehliadača.
 * Spustenie: node tests/sim.test.js
 * Načíta všetky skripty hry s náhradným plátnom a DOM, odohrá desiatky dní
 * a skontroluje, že sa nič nepokazilo (žiadne chyby, NaN ani zaseknuté bitky).
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
// skripty hry z hlavného súboru; Phaser, jeho scény a zbalené obrázky sa bez prehliadača nenačítavajú (ikony áno – kreslia sa na plátno)
const scripts = [...fs.readFileSync(path.join(ROOT, 'Vojvodca Stredozeme.html'), 'utf8').matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1])
    .filter(s => !/^(https?:|vendor\/)/.test(s) && (!/^js\/engine\//.test(s) || /icons\.js$/.test(s)));

const noop = () => { };
const grad = { addColorStop: noop };
const ctx2d = new Proxy({}, { get: (t, k) => k in t ? t[k] : k === 'measureText' ? () => ({ width: 50 }) : k === 'getTransform' ? () => ({}) : k.startsWith('create') ? () => grad : noop, set: (t, k, v) => { t[k] = v; return true; } });
const reg = {};
function el(id) {
    const e = { id, style: {}, dataset: {}, children: [], classList: { add: noop, remove: noop, contains: () => false }, value: id === 'fs' ? '6' : id === 'pn' ? 'Test' : '',
        appendChild(c) { this.children.push(c); c.parentNode = this; return c; }, insertBefore(c) { this.children.push(c); return c; }, setAttribute: noop, addEventListener: noop, focus: noop,
        getContext: () => ctx2d, toDataURL: () => '', getBoundingClientRect: () => ({ left: 0, top: 0, width: 720, height: 480 }),
        querySelector: () => null, querySelectorAll: () => [], get lastChild() { return this.children[this.children.length - 1]; } };
    Object.defineProperty(e, 'innerHTML', { set(v) { this._h = v; if (String(v).includes('id="bt"')) reg.bt = el('bt'); }, get() { return this._h || ''; } });
    Object.defineProperty(e, 'textContent', { set(v) { this._t = v; }, get() { return this._t || ''; } });
    return e;
}
const sandbox = {
    console, Math, JSON, Date, Object, Array, String, Number, Proxy, Set, Map, isFinite, parseInt,
    document: { getElementById: id => reg[id] || (reg[id] = el(id)), createElement: () => el(), head: el('head'), querySelector: () => null, querySelectorAll: () => [] },
    localStorage: { _: {}, setItem(k, v) { this._[k] = v; }, getItem(k) { return this._[k] || null; } },
    addEventListener: noop, requestAnimationFrame: noop, setTimeout: f => f(), setInterval: noop,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const s of scripts) vm.runInContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), sandbox, { filename: s });

const run = code => vm.runInContext(code, sandbox);
let fails = 0;
const check = (name, ok, info = '') => { console.log((ok ? 'OK   ' : 'CHYBA') + ' ' + name + (info ? ' – ' + info : '')); if (!ok) fails++; };
const closeMenus = `(()=>{ const b = document.getElementById('bt'); if (b && b.children.length && Math.random() < .5) { const x = b.children.find(c => c.onclick && !c.disabled); if (x) { try { x.onclick.call(x); } catch (e) { throw e; } } } mode = 'map'; })()`;

try {
    run('newGame(); mode = "map"; G.camp = 1; G.gold = 5000;');
    check('Nová hra', run('!!G && TW.length === 50 && VL.length === 100'), run('TW.length + " hradov, " + VL.length + " dedín"'));
    for (let i = 0; i < 40000; i++) {
        const m = run('mode');
        if (m === 'map') run('updMap(1)');
        else if (m === 'battle') { run('U[0].hp = 999; for (const u of U) if (u.t) u.hp = 0; updBattle(1)'); }
        else run(closeMenus);
    }
    check('Simulácia dní', run('G.day') > 40, 'deň ' + run('G.day'));
    check('Armády bez chýb v číslach', run('E.every(e => isFinite(e.x) && isFinite(e.y) && isFinite(e.n) && e.n >= 0)'), run('E.length') + ' armád');
    check('Hráč bez chýb v číslach', run('isFinite(G.x) && isFinite(G.y) && isFinite(G.gold) && isFinite(G.hp)'));
    run('mode = "map"; G.camp = 0; G.inf = 40; G.hp = 999;');
    run('var si = TW.findIndex(t => hos(t.f, G.fac) && t.f !== 9); siege(si); startBattle({ n: 10, f: TW[si].f, t: TW[si], siege: 1 });');
    let k = 0; while (run('mode') === 'battle' && k < 12000) { run('U[0].hp = 999; updBattle(1)'); k++; }
    check('Obliehanie sa skončí', run('mode') !== 'battle', k + ' snímok');
    run('mode = "map"; save(); var d = G.day; G = null; load();');
    check('Uloženie a načítanie', run('!!G && G.day === d'));
    // výbava: kováč podľa strany hradu, inventár, staré uloženia (tlačidlá okna sú v #bt)
    const btnRun = (t, exact) => `document.getElementById("bt").children.find(b => ${exact ? 'b.textContent === ' + JSON.stringify(t) : 'b.textContent.startsWith(' + JSON.stringify(t) + ')'}).onclick()`;
    check('Každá vec má vzhľad', run('SH.every(s => s.it.length === Soldiers.GEAR[s.k].length)'));
    run('mode = "map"; G.gold = 5000; var gi = TW.findIndex(t => !bloc(t.f) && t.f !== 9 && t.f !== 6), ei = TW.findIndex(t => bloc(t.f)); smithy(gi, "w"); var gw = document.getElementById("bt").children.map(b => b.textContent);');
    check('Hrad dobra predáva len výbavu dobra', run('gw.some(t => t.startsWith("Andúril")) && !gw.some(t => t.startsWith("Sauronov"))'));
    run('smithy(ei, "w"); var ew = document.getElementById("bt").children.map(b => b.textContent);');
    check('Hrad zla predáva len temnú výbavu', run('ew.some(t => t.startsWith("Sauronov")) && !ew.some(t => t.startsWith("Andúril"))'));
    run(btnRun('Orkská šabľa'));
    check('Kúpa: vec je v inventári a hrdina ju nosí', run('it("w").n === "Orkská šabľa" && G.own.w.length === 2 && G.gold === 4910'));
    run('mode = "map"; inv(); ' + btnRun('Železný meč'));
    check('Inventár: výmena za kúpenú vec', run('it("w").n === "Železný meč" && G.own.w.length === 2'));
    run(btnRun('Zavrieť', 1));
    check('Inventár sa zavrie', run('mode === "map"'));
    run('G.eq.a = 2; delete G.own; save(); G = null; load();');
    check('Staré uloženie: doterajšia výbava je v inventári', run('JSON.stringify(G.own.a) === "[0,1,2]" && G.own.w.length === 1'));
    check('Kráľ dobra: jeho hrady predávajú výbavu dobra', run('G.king = 1; G.side = 0; shopSide(6) === 0'));
    check('Kráľ zla: jeho hrady predávajú výbavu zla', run('G.side = 1; shopSide(6) === 1 && shopSide(0) === 0 && shopSide(2) === 1'));
    run('G.fac = 6; G.king = 1; chooseSide(1);');
    check('Strana zla: mier so zlom, vojna s dobrom', run('!WR[6][2] && !WR[6][3] && WR[6][0] && WR[6][1] && REL[6][2] >= 40 && REL[6][0] <= -60 && bloc(6) === 1'));
    run('chooseSide(0);');
    check('Strana dobra: mier s dobrom, vojna so zlom', run('!WR[6][0] && !WR[6][8] && WR[6][2] && WR[6][7] && REL[6][1] >= 40 && bloc(6) === 0'));
    check('Výbava sedí so svojím vzhľadom', run('shOf("w").findIndex(x => x.n === "Orkský nôž") === 16 && Soldiers.GEAR.w[16].L === 1.6 && Soldiers.GEAR.w[17].blade === "#d8c890"'));
    // rozhovory, obchod, budovy, počasie
    run('var le = E.find(e => e.f !== 9 && !e.nz) || E[0]; per(le); talk(le); var tb2 = document.getElementById("bt").children.map(b => b.textContent);');
    check('Rozhovor s veliteľom ponúka témy', run('tb2.length >= 8 && tb2.some(t => /svete/.test(t)) && tb2.some(t => /plány/.test(t))'));
    run('document.getElementById("bt").children.find(b => /plány/.test(b.textContent)).onclick(); var pt = document.querySelector && 1; var p1 = document.getElementById("ov")._h;');
    check('Odpoveď podľa povahy', run('(() => { const sp = ["slúžiť|slovo|brániť", "korisť|zbohatnúť|léno", "Prežiť|posteli|viac|vojsk", "léno|trón|schod", "Spálim|Zajatcov|šeptalo", "čas|Mapa|spojenectvá"][le.tr]; return new RegExp(sp).test(p1); })()'));
    check('Témy sa po použití už neponúkajú', run('!document.getElementById("bt").children.some(b => /plány/.test(b.textContent))'));
    run('G.gold = 500; G.cargo = {}; var v0 = VL.find(v => !hos(TW[v.t].f, G.fac)) || VL[0]; v0.st = 0; v0.good = v0.good || villageGood(v0, VL.indexOf(v0)); var inv0 = { ...stock(v0) }; var p0 = price(v0, v0.good); var g0 = G.gold; var nb2 = buyGood(v0, v0.good, 5);');
    check('Nákup tovaru v dedine', run('nb2 === 5 && G.cargo[v0.good] === 5 && G.gold < g0 && cargoCount() === 5'));
    check('Cena po nákupe stúpla', run('price(v0, v0.good) >= p0'));
    run('var t0 = TW.find(t => !hos(t.f, G.fac)); var g1 = G.gold; sellGood(t0, v0.good, 5);');
    check('Predaj tovaru v hrade', run('G.gold > g1 && cargoCount() === 0'));
    run('for (let i = 0; i < 3; i++) dailyTrade();');
    check('Dedina vyrába svoj tovar', run('stock(v0)[v0.good] > inv0[v0.good] - 5'));
    check('Budovy hradu sú definované', run('BUILDINGS.length === 7 && typeof castleIncome === "function"'));
    run('var tm0 = TW.find(t => t.mine) || TW[0]; tm0.mine = 1; tm0.bd = { c: 1, s: 1 };');
    check('Chrám chráni vojakov', run('temple() === true'));
    run('G.x = 300; G.y = 300; rollWeather(); var w1 = MW.n;');
    check('Počasie na severe', run('["snow", "fog", "storm", "clear"].includes(w1)'));
    run('MW = { n: "storm", l: 2 }; dayT = 300;');
    check('Búrka spomaľuje pochod, noc skracuje dostrel', run('weatherSlow() < 1 && isNight() && battleWeather().r < 110'));
    // úlohy, spoločníci, ukladanie do pozícií
    run('G.fac = 6; G.side = 0; G.king = 0; WR[6] = WR[6].map(() => false); for (let f = 0; f < 10; f++) WR[f][6] = false; WR[6][2] = WR[2][6] = true; var qf = [0, 1, 5, 8].find(f => TW.some(t => t.f === f)); if (qf == null) { TW[0].f = 0; qf = 0; } var ql = E.find(e => e.f === qf && !e.nz && !(G.qu || []).some(q => q.lord === e.nm)); if (!ql) { E.push({ id: ++NID, x: TW[6].x, y: TW[6].y, f: qf, n: 10, nm: "Testovací pán", vx: 0, vy: 0, w: 0 }); ql = E[E.length - 1]; } per(ql); ql.tr = 0; G.qu = []; G.qlast = {}; var qo = questFor(ql);');
    check('Pán dobra ponúka úlohu podľa povahy', run('!!qo && qo.def.tr.includes(0) && qo.def.side !== 1'));
    run('questAccept(ql, qo.def, qo.home); var qq = G.qu[0];');
    check('Úloha prijatá a v zozname', run('G.qu.length === 1 && qq.lord === ql.nm'));
    run('var st0 = qStep(qq); if (st0.k === "k") { for (let i = 0; i < st0.n; i++) questEvent("k", st0.a === "bandit" ? 9 : st0.a === "enemy" ? 2 : st0.a); } else if (st0.k === "v") questEvent("v", st0.a); else if (st0.k === "d") { G.cargo = {}; G.cargo[st0.a] = st0.n; questDeliver(qq); }');
    check('Prvý krok úlohy splnený', run('!G.qu.includes(qq) || qq.step === 1'));
    run('if (G.qu.includes(qq)) { var g2 = G.gold, r2 = ql.rl || 0; questComplete(qq); var okc = G.gold > g2 && (ql.rl || 0) > r2; } else var okc = true;');
    check('Uzavretie úlohy dá zlato a vzťah', run('okc && G.qu.length === 0 && Object.values(G.qdone).reduce((a, b) => a + b, 0) === 1'));
    check('Spoločníci dobra čakajú v hradoch', run('compsAt(TW.find(t => t.n === "Bree")).some(c => c.id === "aragorn") && !compsAt(TW.find(t => t.n === "Isengard")).length'));
    run('G.gold = 1000; G.ren = 10; compJoin(compDef("aragorn")); compJoin(compDef("gimli")); G.inf = 3; mode = "map"; startBattle(E.find(e => hos(e.f, G.fac) && !e.nz));');
    check('Spoločníci bojujú v bitke', run('U.filter(u => u.cp).length === 2 && U.find(u => u.cp === "aragorn").hp === 220'));
    run('U[0].hp = 999; U.find(u => u.cp === "gimli").hp = 0; for (const u of U) if (u.t) u.hp = 0; updBattle(1); run2 = 0;');
    check('Ranený spoločník sa zotavuje', run('mode !== "battle" && G.cwound.gimli > G.day && G.chp.gimli === .3 && G.inf === 3'));
    run(closeMenus + '; mode = "map"; G.gold = 500; G.ren = 3; var tI = TW.findIndex(t => t.n === "Bree"); tavKeeper(tI); var rb = document.getElementById("bt").children.find(b => /rundu/.test(b.textContent)); rb.onclick();');
    check('Krčmár: runda pre všetkých zvýši slávu', run('G.ren === 4 && G.tround === G.day && typeof rumor(TW[tI]) === "string" && rumor(TW[tI]).length > 10'));
    run('tavKeeper(tI); var rb2 = document.getElementById("bt").children.find(b => /rundu/.test(b.textContent));');
    check('Runda sa dá zaplatiť raz za deň', run('rb2.disabled === true'));
    check('Postavičky na mape: lordi podľa frakcie, hrdina podľa výbavy', run('[0,1,2,3,4,5,7,8,9].every(f => { const [eq, o] = Figures.lordEq({ f, id: f, nm: "L" }); return eq.w != null && o.flag === f; }) && Figures.key(G.eq, { flag: 6 }) !== Figures.key({ ...G.eq, m: 2 }, { flag: 6 }) && Figures.compEq(compDef("gimli"), true)[0].m === 0'));
    check('Tvorba postavy: rasa, povaha a schopnosti sa prenesú do hry', run('G.look && G.look.race === "human" && G.race === "human" && RACES.elf.side === 0 && RACES.orc.side === 1 && Object.values(RACES).every(r => typeof r.fx === "function") && G.trait === "cestny" && (G.hon || 0) >= 3 && Object.values(G.s).reduce((a, b) => a + b, 0) >= 5 && TRAITS.mudry && traitName() === "Čestný"'));
    check('Portréty: lordi, spoločníci a hrdina', run('[0,2,3,5,8,9].every(f => typeof Portraits.forLord({ nm: "L", f }).race === "string") && COMPANIONS.every(c => c.look && c.look.race) && Portraits.hero().race === "human" && Portraits.forLord({ nm: "L", f: 2, kr: 1 }).race === "orc"'));
    run(closeMenus + '; mode = "map"; enterCastle(0, "yard");');
    check('Bez Phaseru vedie nádvorie na okno hradu', run('mode === "town" && ROOM === null && document.getElementById("bt").children.some(b => /Verbovanie/.test(b.textContent))'));
    run(closeMenus + '; mode = "map"; G.hp = 30; stayInCastle(0); var hp0 = G.hp; daily2();');
    check('Pobyt v hrade: čas plynie a hojí sa rýchlejšie', run('G.camp === 1 && G.stay === TW[0].n && G.hp >= hp0 + 20') );
    run('G.camp = 0; G.stay = null; mode = "map";');
    check('Lordi majú úlohy: strážcovia lén a poľné vojsko maršala', run('E.filter(e => e.role === "guard").length > 5 && E.filter(e => e.role === "army").length > 5 && [0,1,2,3,4,5,7,8].every(f => !E.some(e => e.f === f) || marshal(f))'));
    run('var gd = E.find(e => e.role === "guard" && TW[e.home] && TW[e.home].f === e.f); var gh = gd ? gd.home : null; mode = "map"; G.camp = 1; for (let i = 0; i < 1200; i++) worldTick(1); G.camp = 0;');
    check('Strážca léna ostáva pri svojom hrade', run('!gd || gd.dead || gd.home !== gh || Math.hypot(gd.x - TW[gh].x, gd.y - TW[gh].y) < 110 * K || E.some(o => o !== gd && hos(o.f, gd.f) && Math.hypot(o.x - gd.x, o.y - gd.y) < 100 * K)'));
    run('var m0 = marshal(0); if (m0) m0.n = 3; mst(0).losses = 5; mst(0).since = -10; marshalDaily(); var m1 = marshal(0); G.fac = 0; WR[0][2] = WR[2][0] = true; CP[0] = TW.findIndex(t => hos(t.f, 0)); LETTERS.length = 0; onMuster(m1, CP[0]);');
    check('Maršal: zvrhnutie po prehrách a list hráčovi pri zvolaní vojska', run('m1 && (m1 !== m0 || E.filter(e => e.f === 0).length < 2) && LETTERS.length === 1 && /zvolávam zraz/.test(LETTERS[0].text)'));
    run('if (LETTERS.length) { readLetter(); var jb = document.getElementById("bt").children.find(b => /Pridať sa/.test(b.textContent)); jb.onclick(); }');
    check('Prijatie výzvy nastaví cieľ na zraz', run('!LETTERS.length && (G.join == null || (G.join.f === 0 && Math.hypot(G.tx - G.x, G.ty - G.y) >= 0))'));
    run('G.fac = 6; var ev0 = EVENTS.length; captureEvent(TW[0], 0, 2, "Test"); G.dest = -1; G.vd = -1; G.chase = null; G.talk = null; G.pd = 1; G.x = G.tx = PLACES[1].x * K; G.y = G.ty = PLACES[1].y * K + 10; mode = "map"; worldTick(1);');
    check('Oznámenie o dobytí a miesto na mape (Argonath)', run('EVENTS.length === ev0 + 1 && mode === "town" && document.getElementById("bt").children.some(b => /Kráľov/.test(b.textContent))'), run('JSON.stringify([mode, G.pd, G.dest, G.vd, G.qd, document.getElementById("bt").children.map(b => b.textContent)])'));
    run(closeMenus + '; mode = "map"; EVENTS.length = 0;');
    check('Dediny majú jedinečné mená podľa kraja', run('new Set(VL.map(v => v.n)).size === VL.length && VL.length >= 90'));
    check('Väčší svet a polohy podľa mierky', run('K > 6 && WW === 1800 * K && TW.every(t => t.x <= WW && t.y <= WH) && regionAt(10, 10) === "s"'));
    check('Ikony rozhrania k tlačidlám a lište', run('Icons.forButton("Denník") === "diary" && Icons.forHud("Zdravie 10/10") === "heart" && Icons.forHud("Zlato 5") === "coins" && Icons.forDialog("Späť") === "back" && Icons.has("mug")'));
    run(closeMenus + '; mode = "map"; save(2); var d2 = G.day; G.day = 999; load(2);');
    check('Uloženie do pozície 2 a načítanie', run('G.day === d2 && slotInfo(2) && slotInfo(2).includes("deň " + d2) && G.comp.includes("aragorn")'));
    run('G.king = 0; delete G.side; startGear(1);');
    check('Hrdina zla začína s orkskou výbavou', run('it("w").n === "Orkský nôž" && it("a").n === "Orkské kože" && it("h").n === "Orkská kukla" && G.own.w.length === 1'));
    check('Základná výbava sa nepredáva', run('smithy(gi, "w"); !document.getElementById("bt").children.some(b => /Železný meč|Orkský nôž/.test(b.textContent))'));
    // nové systémy: tlupy, udalosti na ceste, zajatci, dvor, kráľovstvo, pozície uloženia, bojisko podľa mapy
    run('mode = "map"; G.fac = 6; G.gold = 5000; G.day = 20; for (let i = 0; i < 6; i++) spawnX();');
    check('Tlupy rôznych druhov na mape', run('E.filter(e => e.f === 9).length >= 4 && E.some(e => e.f === 9 && e.kind)'), run('JSON.stringify([...new Set(E.filter(e => e.f === 9).map(e => e.kind))])'));
    run('G.evt = 1; G.dest = -1; G.vd = -1; G.pd = -1; G.chase = null; G.tx = G.x + 500; G.ty = G.y; mode = "map"; var ev1 = travelTick(2);');
    check('Udalosť na ceste otvorí okno', run('ev1 === true && mode === "town" && document.getElementById("bt").children.length > 0 && G.evt > 500'), run('document.getElementById("bt").children.map(b => b.textContent).join(" | ")'));
    run(closeMenus + '; mode = "map"; G.safe = 0;');
    run('var cl = E.find(e => e.f === 0 && !e.kr) || E.find(e => e.f !== 9 && !e.nz && !e.kr); cl.n0 = 12; cl.f = 0; var pr0 = G.pri.length; capturePrisoner(cl); var ro = ransomOf(G.pri[G.pri.length - 1]);');
    check('Zajatie veliteľa a výkupné', run('G.pri.length === pr0 + 1 && typeof G.pri[G.pri.length - 1] === "object" && ro > 60'), 'výkupné ' + run('ro'));
    run('G.pri = G.pri.filter(p => p.f !== 9); G.pri.forEach(p => { p.day = G.day - 5; p.offered = null; }); LETTERS.length = 0; for (let i = 0; i < 60 && !LETTERS.length && G.pri.length; i++) { prisonersDaily(); G.pri.forEach(p => { p.offered = null; }); }');
    check('List s ponukou výkupného', run('LETTERS.some(L => L.kind === "ransom") || !G.pri.length'));
    run('LETTERS.sort((a, b) => (b.kind === "ransom") - (a.kind === "ransom")); if (LETTERS.length && LETTERS[0].kind === "ransom") { readLetter(); var ab = document.getElementById("bt").children.find(b => /Prijať výkupné/.test(b.textContent)); if (ab && !ab.disabled) { var g0 = G.gold; ab.onclick(); } }');
    check('Prijatie výkupného pridá zlato', run('typeof g0 === "undefined" || G.gold > g0 || !G.pri.length'));
    run('mode = "map"; var vic = E.find(e => e.f === 0 && !e.nz) || E.find(e => e.f !== 9 && !e.nz); G.captive = null; var cap = captureHero(vic);');
    check('Zajatie hráča: žalár v hrade víťaza', run('cap && G.captive && TW[G.captive.t].f === G.captive.f'));
    run('captiveDay(); var ebtn = document.getElementById("bt").children.find(b => /výkupné/.test(b.textContent)); ebtn.onclick();');
    check('Výkupné za seba oslobodí hráča', run('!G.captive'));
    run(closeMenus + '; mode = "map"; var ce = E.find(e => e.f === 0 && !e.nz && !e.kr); ce.loy = 1; ce.rl = 30; G.king = 1; LETTERS.length = 0; for (let i = 0; i < 60 && !LETTERS.length; i++) courtDaily();');
    check('Nespokojný lord ponúkne prestup listom', run('LETTERS.some(L => L.kind === "court")'));
    run('readLetter(); var acc = document.getElementById("bt").children.find(b => /Prijať do služieb/.test(b.textContent)); if (acc) acc.onclick();');
    check('Prestup lorda k hráčovi', run('ce.f === G.fac'));
    run('mode = "map"; G.king = 0; G.fac = 0; var own = TW.find(t => t.f === 0); own.mine = 1; kingdom(TW.indexOf(own)); var ib = document.getElementById("bt").children.find(b => /nezávislosť/.test(b.textContent)); ib.onclick();');
    check('Vyhlásenie nezávislosti: vojna s bývalým pánom', run('G.fac === 6 && own.f === 6 && WR[6][0]'));
    run(closeMenus + '; mode = "map"; var oi = TW.indexOf(own); kingdom(oi, "f"); var cb = document.getElementById("bt").children.find(b => /Udeliť spoločníkovi/.test(b.textContent)); if (cb) cb.onclick();');
    check('Léno pre spoločníka: stane sa lordom hradu', run('!own.lord || (E.some(e => e.cp && e.home === oi) && !G.comp.includes(Object.keys(G.cfief)[0]))'));
    run(closeMenus + '; mode = "map"; G.tax = "high"; var gH = 0; TW.forEach(t => { if (t.mine) gH += Math.round(castleIncome(t) * taxMul() * fiefShare(t)); }); G.tax = "low"; var gL = 0; TW.forEach(t => { if (t.mine) gL += Math.round(castleIncome(t) * taxMul() * fiefShare(t)); });');
    check('Dane menia príjem', run('gH > gL'));
    check('Šesť pozícií uloženia s náhľadom', run('SLOTS.length === 7 && (save(6), slotData(6) && slotData(6).text.includes("deň"))'));
    run('var ft = battleTerrain(riverPoints()[50][0], riverPoints()[50][1]); var ff = battleTerrain(100, 100);');
    check('Bojisko podľa mapy: rieka pri Anduine, inde nie', run('ft.river === true && ff.river === false && Array.isArray(ft.trees)'));
    run('mode = "map"; G.ent = 2; G.uH3 = 1; startBattle(E.find(e => hos(e.f, G.fac) && !e.nz) || { n: 5, f: 2, nm: "Test" }); var hasEnt = U.some(u => !u.t && u.k === "n"), hasMum = U.some(u => !u.t && u.uk === "uH3"); for (const u of U) if (u.t) u.hp = 0; U[0].hp = 999; var kk = 0; while (mode === "battle" && kk < 2000) { updBattle(1); kk++; }');
    check('Enti a mûmak v bitke', run('hasEnt && hasMum'));
    run(closeMenus + '; mode = "map";');
    check('Správa družiny: záložky', run('party(); document.getElementById("bt").children.some(b => /Vojsko/.test(b.textContent)) && (party(null, "o"), document.getElementById("bt").children.some(b => /Držať líniu/.test(b.textContent)))'));
    run(closeMenus + '; mode = "map";');
    // čas a obliehanie
    run('mode = "map"; G.camp = 1; G.besiege = -1; G.defend = -1; G.captive = null; G.tmul = 8; var tmA = timeMul(); G.camp = 0; var tmB = timeMul(); G.tmul = 1;');
    check('Zrýchlenie času len pri čakaní', run('tmA === 8 && tmB === 1'));
    run('mode = "map"; G.inf = 60; G.cav = 0; G.arc = 0; G.vet = 0; G.elf = 0; G.roh = 0; var ps = TW.findIndex(t => hos(t.f, G.fac) && t.f !== 9 && !t.sg); TW[ps].sg = null; siege(ps); var psg = TW[ps].sg; var food0 = psg.food; var aDis = document.getElementById("bt").children.find(b => b.textContent.startsWith("Zaútočiť")).disabled; siegeDaily(); siegeDaily(); siegeMenu(ps); var aOn = document.getElementById("bt").children.find(b => b.textContent.startsWith("Zaútočiť")).disabled;');
    check('Hráč oblieha: tábor, rebríky za dva dni, zásoby ubúdajú', run('psg.lead === "G" && G.besiege === ps && aDis === true && psg.lad === 1 && !aOn && psg.food === food0 - 2'));
    run('leaveSiege(ps); ov.classList.add("hide"); mode = "map";');
    check('Odtiahnutie: obliehanie skončí alebo ho prevezme spojenec', run('G.besiege === -1 && (!TW[ps].sg || TW[ps].sg.lead !== "G")'));
    run('TW[ps].sg = null;');
    // AI obliehanie trvá niekoľko dní a končí útokom
    run(`G.x = G.tx = 50; G.y = G.ty = 50; var ai = TW.findIndex(t => t.f !== 9 && t.f !== 6 && t.f !== G.fac && !t.mine && !t.sg); var tf = TW[ai].f; var af = [0,1,2,3,4,5,7,8].find(f => f !== tf && f !== G.fac);
        WR[af][tf] = WR[tf][af] = true; AL[af][tf] = AL[tf][af] = false; TW[ai].g = 8; TW[ai].wl = 1;
        E.filter(e => e.f === tf && Math.hypot(e.x - TW[ai].x, e.y - TW[ai].y) < 400).forEach(e => { e.x += 3000; });
        var al3 = E.filter(e => e.f === af && !e.nz).slice(0, 3); al3.forEach((e, k) => { e.x = TW[ai].x + 60 + k * 20; e.y = TW[ai].y + 40; e.n = 60; });
        startSiege(ai, af, al3[0].id); var aiDays = 0; while (TW[ai].f !== af && aiDays < 15) { G.day++; aiDays++; siegeDaily(); }`);
    check('AI obliehanie: technika, potom útok a dobytie (nie hneď)', run('TW[ai].f === af && !TW[ai].sg && aiDays >= 3'), run('aiDays') + ' dní');
    // spojenci v okolí sa pridajú do bitky
    run(`mode = "map"; G.safe = 0; var foe = { nm: "Testovacia tlupa", n: 12, f: 9, x: G.x + 40, y: G.y, id: 99901 }; E.push(foe);
        var friend = E.find(e => e.f !== 9 && !e.nz && !hos(e.f, G.fac)); friend.x = G.x + 60; friend.y = G.y + 30; friend.n = 30; friend.dead = 0; var rl0 = friend.rl || 0;
        startBattle(foe); var allyU = U.filter(u => u.src === friend).length; for (const u of U) if (u.t) u.hp = 0; U[0].hp = 999; var kb = 0; while (mode === "battle" && kb < 2000) { updBattle(1); kb++; }`);
    check('Spojenci v okolí sa pridajú do bitky', run('allyU > 0 && (friend.rl || 0) > rl0'), run('allyU') + ' vojakov spojenca');
    run(closeMenus + '; mode = "map";');
    // obrana spojeneckého hradu
    run(`var di = TW.findIndex(t => t.f !== 9 && !hos(t.f, G.fac) && !t.sg); var ef = [0,1,2,3,4,5,7,8].find(f => f !== TW[di].f && f !== G.fac && !AL[G.fac][f]); WR[ef][TW[di].f] = WR[TW[di].f][ef] = true; WR[ef][G.fac] = WR[G.fac][ef] = true;
        var en2 = E.filter(e => e.f === ef && !e.nz).slice(0, 2); en2.forEach((e, k) => { e.x = TW[di].x + 70 + k * 15; e.y = TW[di].y + 50; e.n = 15; });
        startSiege(di, ef, en2[0].id); town(di); var defBtn = document.getElementById("bt").children.some(b => b.textContent.startsWith("Vstúpiť do hradu a brániť")); defendCastle(di); ov.classList.add("hide"); mode = "map";
        defendBattle(di); var garr = U.filter(u => u.garrison).length; for (const u of U) if (u.t) u.hp = 0; U[0].hp = 999; var kd2 = 0; while (mode === "battle" && kd2 < 2000) { updBattle(1); kd2++; }`);
    check('Obrana hradu: posádka bojuje s hráčom, obliehanie je prelomené', run('defBtn && garr > 0 && !TW[di].sg && G.defend === -1'), run('garr') + ' vojakov posádky');
    run(closeMenus + '; mode = "map";');
    // výzva pridať sa k útoku spojencov
    run(`mode = "map"; var ji = TW.findIndex(t => t.f !== 9 && hos(t.f, G.fac) && !t.sg); var jf = [0,1,2,3,4,5,7,8].find(f => f !== TW[ji].f && f !== G.fac && !hos(f, G.fac));
        WR[jf][TW[ji].f] = WR[TW[ji].f][jf] = true; E.filter(e => e.f === TW[ji].f && Math.hypot(e.x - TW[ji].x, e.y - TW[ji].y) < 400).forEach(e => { e.x += 3000; });
        var jl = E.filter(e => e.f === jf && !e.nz).slice(0, 2); jl.forEach((e, k) => { e.x = TW[ji].x + 80 + k * 20; e.y = TW[ji].y + 50; e.n = 40; });
        startSiege(ji, jf, jl[0].id); var js = TW[ji].sg; js.lad = 1; js.d0 = G.day - 5; if ((TW[ji].wl || 0) >= 1) js.ram = 1; if ((TW[ji].wl || 0) >= 2) js.tow = 1;
        G.x = G.tx = TW[ji].x - 60; G.y = G.ty = TW[ji].y + 60; G.besiege = -1; G.defend = -1; SIEGE_EVENT = null; siegeDaily(); var jev = SIEGE_EVENT && SIEGE_EVENT.kind; if (SIEGE_EVENT) siegeEventUI(); var jbtn = document.getElementById("bt").children.some(b => b.textContent.startsWith("Pridať sa k útoku"));`);
    check('Útok spojencov: výzva pridať sa', run('jev === "assault" && jbtn'));
    run('TW[ji].sg = null; SIEGE_EVENT = null; ov.classList.add("hide"); mode = "map";');
    run('save(5); var sgOk = true; TW[ai].sg = { f: 0, d0: 1, lead: "G", w: { lad: 10, ram: 0, tow: 0 }, lad: 0, ram: 0, tow: 0, build: "lad", food: 4, fail: 0 }; save(5); TW[ai].sg = null; load(5);');
    check('Obliehanie sa uloží s hradom', run('!!TW[ai].sg && TW[ai].sg.w.lad === 10'));
    run('TW[ai].sg = null; mode = "map";');
    // nový boj (combat.js): kryt, úder zozadu, morálka a útek, utečenci prežijú, skupiny a šík
    run(closeMenus + '; mode = "map"; G.inf = 20; G.arc = 6; G.cav = 4; G.hp = mh(); G.eq.s = 1; G.s.ls = 1;');
    run(`startBattle({ n: 12, f: 2, nm: "Gorbag" }); var h = U[0], e1 = U.find(u => u.t && !u.cmd); e1.x = h.x + 12; e1.y = h.y; e1.f = Math.PI; h.f = 0;
        CMB.blk = 1; CMB.blkT = 30; CMB.st = 100; var hp0 = h.hp; var res1 = meleeHit(e1, h, 20, "ai"); var blocked = !res1 && h.hp === hp0 && CMB.shp < CMB.shMax;
        CMB.blk = 0; e1.f = 0; var hpE = e1.hp = 500; meleeHit(h, e1, 10, "swing"); var back = Math.round(500 - e1.hp);
        var hasCmd = U.some(u => u.cmd); var ammo = CMB.ammo;`);
    check('Kryt štítom zastaví úder, úder zozadu +50 %, veliteľ a šípy hrdinu', run('blocked && back === 15 && hasCmd && ammo > 0'), run('blocked + " " + back + " " + hasCmd + " " + ammo'));
    run(`var mine0 = U.filter(u => !u.t && !u.h && !u.cp).length; CMB.sel = "l"; setOrd("l"); var archLine = U.filter(u => !u.t && !u.ally && u.k === "a").every(u => u.hx != null) && U.filter(u => !u.t && !u.ally && u.k === "i").every(u => u.hx == null) && CMB.og.l === "l" && CMB.og.p === "a";
        CMB.sel = "all"; setOrd("a"); CMB.M[1] = 0; for (const u of U) if (u.t && fearless(u)) u.hp = 0; var kr = 0; while (mode === "battle" && kr < 3000) { U[0].hp = 999; for (const u of U) if (!u.t) u.stun = 99; updBattle(1); kr++; }
        var fledN = U.filter(u => u.t && u.fled).length, deadN = U.filter(u => u.t && fallen(u)).length;`);
    check('Šík len pre lukostrelcov; pri nulovej morálke nepriatelia utečú a bitka je vyhraná', run('archLine && mode !== "battle" && fledN > 0'), run('archLine + ", utieklo " + fledN + ", padlo " + deadN + ", " + kr + " snímok"'));
    run(closeMenus + '; mode = "map";');
    run(`G.inf = 20; startBattle({ n: 30, f: 2, nm: "Shagrat" }); var inf0 = G.inf; CMB.M[0] = 0; var kf = 0; while (mode === "battle" && kf < 3000) { U[0].hp = 999; for (const u of U) if (u.t) u.stun = 99; if (kf > 500) for (const u of U) if (u.t) u.hp = 0; updBattle(1); kf++; }
        var ownFled = U.filter(u => !u.t && u.fled && u.k === "i" && !u.ally).length;`);
    check('Tvoji utečenci prežijú (neodpočítajú sa z družiny)', run('ownFled > 0 && G.inf === inf0'), run('"utieklo " + ownFled + ", pešiakov " + inf0 + " → " + G.inf'));
    run(closeMenus + '; mode = "map";');
} catch (e) { fails++; console.log('CHYBA výnimka: ' + e.stack); }
console.log(fails ? '\n' + fails + ' testov zlyhalo.' : '\nVšetky testy prešli.');
process.exit(fails ? 1 : 0);
