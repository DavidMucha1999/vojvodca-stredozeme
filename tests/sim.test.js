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
    performance: { now: () => Date.now() },
    console, Math, JSON, Date, Object, Array, String, Number, Proxy, Set, Map, isFinite, parseInt,
    document: { body: el('body'), getElementById: id => reg[id] || (reg[id] = el(id)), createElement: () => el(), head: el('head'), querySelector: () => null, querySelectorAll: () => [] },
    localStorage: { _: {}, setItem(k, v) { this._[k] = v; }, getItem(k) { return this._[k] || null; } },
    addEventListener: noop, requestAnimationFrame: f => { global.__d = (global.__d || 0); if (global.__d < 3) { global.__d++; try { f(); } finally { global.__d--; } } }, setTimeout: f => f(), setInterval: noop,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const s of scripts) vm.runInContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), sandbox, { filename: s });

const run = code => vm.runInContext(code, sandbox);
let fails = 0;
const check = (name, ok, info = '') => { console.log((ok ? 'OK   ' : 'CHYBA') + ' ' + name + (info ? ' – ' + info : '')); if (!ok) fails++; };
// všetky skripty hry (aj tie, ktoré tento test nenačítava – Phaser scény, 3D, grafika) zdieľajú jeden globálny priestor:
// rovnaké meno const/let/class v dvoch súboroch v prehliadači zastaví načítanie a hra ostane na úvodnej obrazovke
{
    const all = [...fs.readFileSync(path.join(ROOT, 'Vojvodca Stredozeme.html'), 'utf8').matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => !/^(https?:|vendor\/)/.test(s));
    const seen = {}, dup = [];
    for (const f of all) for (const m of fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/^(?:const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) { if (seen[m[1]] && seen[m[1]] !== f) dup.push(m[1] + ' (' + seen[m[1]] + ', ' + f + ')'); else seen[m[1]] = f; }
    check('Žiadne meno const/let/class nie je v dvoch skriptoch hry', !dup.length, dup.join('; '));
}
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
    run(`mode = "map"; G.camp = 0; G.inf = 30; G.hp = 999; startBattle({ n: 12, f: 2, nm: "Save" }); var svBW = BW; var sk = 0; while (mode === "battle" && sk < 20000) { U[0].hp = 999; updBattle(1); sk++; } mode = "map";`);
    run('var sg0 = { day: G.day, gold: G.gold, inf: G.inf, cav: G.cav, arc: G.arc, hp: G.hp, x: G.x, y: G.y }; save(); G = null; load();');
    check('Uloženie po poľnej bitke: hodnoty sa po načítaní zhodujú', run('!!G && Object.keys(sg0).every(k => G[k] === sg0[k]) && svBW === 2200'), run('JSON.stringify([sg0, { day: G.day, gold: G.gold, inf: G.inf, hp: G.hp }, svBW])'));
    run('mode = "map"; var si2 = TW.findIndex(t => hos(t.f, G.fac) && t.f !== 9); siege(si2); startBattle({ n: 5, f: TW[si2].f, t: TW[si2], siege: 1 }); var svBW2 = BW, svBH2 = BH; mode = "map"; SGB = null;');
    check('Po poľnej bitke má obliehanie opäť malé bojisko (1440×960)', run('svBW2 === 1440 && svBH2 === 960'), run('svBW2 + "×" + svBH2'));
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
    check('Šesť ručných a tri automatické pozície s náhľadom', run('SLOTS.length === 9 && (save(6), slotData(6) && slotData(6).text.includes("deň"))'));
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
    // družina (supply.js, perks.js): jedlo, hlad a dezercie, ranení, zajatci, perky
    run(`mode = "map"; G.inf = 30; G.cav = 0; G.arc = 0; G.fd = { bread: 20, meat: 20, cheese: 20 }; G.pm = 50; G.hungry = 0; var f0 = foodTotal(), need = foodNeed(); supplyDaily(); var ate = f0 - foodTotal(), pmUp = G.pm > 50;
        G.fd = {}; G.pm = 5; G.pmv = 0; var inf0 = G.inf; supplyDaily(); var deserted = G.inf < inf0 && G.hungry === 1;`);
    check('Družina je jedlo (pestrá strava dvíha morálku), hlad a nízka morálka vedú k dezerciám', run('ate === need && pmUp && deserted'), run('"zjedli " + ate + "/" + need + ", pešiakov " + inf0 + " → " + G.inf'));
    run(`G.inf = 20; G.wd = {}; G.pm = 60; G.fd = { bread: 50 }; startBattle({ n: 10, f: 2, nm: "Test" }); for (const u of U) if (!u.t && u.k === "i" && !u.ally) { u.hp = 0; } for (const u of U) if (u.t) u.hp = 0; updBattle(1);
        var wnd = (G.wd.inf || 0), infAfter = G.inf; G.camp = 1; G.stay = 1; for (let d = 0; d < 6; d++) supplyDaily(); var healed = G.inf > infAfter && !(G.wd.inf > 0);`);
    check('Časť padlých je ranená a vylieči sa', run('wnd > 0 && healed'), run('"ranení " + wnd + ", pešiaci po hojení " + G.inf'));
    run(closeMenus + '; mode = "map"; G.camp = 0; G.stay = 0;');
    run(`G.cap = 40; G.prd = -1; G.s.pr = 3; var c0 = G.cap, i0 = G.inf; var nr = recruitPrisoners(); var again = recruitPrisoners();`);
    check('Zajatci sa dajú presvedčiť raz denne', run('nr > 0 && G.cap === c0 - nr && G.inf === i0 + nr && again === 0'), run('"pridalo sa " + nr'));
    run(`G.lv = 4; G.pp = 2; G.perk = {}; var noJump = !takePerk(0, 2); var a1 = takePerk(0, 0), a2 = takePerk(0, 1), a3 = takePerk(0, 2); var d0 = dmg();`);
    check('Perky: poradie vo vetve, úroveň a body', run('noJump && a1 && a2 && !a3 && G.pp === 0 && perk("sermiar")'));
    run(`G.perk = {}; G.lv = 1; G.pp = 0; var sv = JSON.parse(JSON.stringify(G)); delete sv.fd; delete sv.pp; var mg = migrateSave({ G: sv, K, E: [], T: TW.map(t => ({})) });`);
    check('Staršie uloženie dostane zásoby a body perkov', run('mg.G.fd && mg.G.fd.bread > 0 && mg.G.pp === 0 && mg.G.pm === 60'));
    // svet (chronicle.js, settings.js): udalosti sveta, kronika, konce, zálohy uložení, obťažnosť, tipy
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    run(`G.wev = null; G.ent = 0; G.ren = 10; if (!TW.some(t => t.f === 3)) TW[castleIdx("Isengard")].f = 3; TW.filter(t => t.f === 3).forEach(t => t.g = Math.max(t.g, 10)); var g3 = TW.filter(t => t.f === 3).reduce((s, t) => s + t.g, 0); startWorldEvent("ents"); var g3b = TW.filter(t => t.f === 3).reduce((s, t) => s + t.g, 0);
        var entsOk = worldEv("ents") && g3b < g3 && (heroSide() !== 0 || G.ent === 1) && G.chron.some(c => /Pochod entov/.test(c.s)); ov.classList.add("hide"); mode = "map";
        G.wev = { k: "winter", end: G.day + 3 }; var fw = foodNeed(); G.wev = null; var fn0 = foodNeed();
        TW[castleIdx("Osgiliath")].f = 0; WR[0][2] = WR[2][0] = true; G.wev = { k: "gondor", end: G.day + 5 }; worldDaily(); var cpG = CP[2] != null && hos(TW[CP[2]].f, 2); G.wev = null;`);
    check('Udalosti sveta: pochod entov, krutá zima, vojna o Gondor', run('entsOk && fw > fn0 && cpG'), run('"zima " + fw + " vs " + fn0'));
    run(`lg("Dobyl si hrad Testov aj s okolitými dedinami."); var chOk = G.chron.some(c => /Testov/.test(c.s)); G.ring = 0; G.fac = 0; G.king = 0; G.hon = 15; ending("story"); var endT = G.ending; chronicle(); var chRows = document.getElementById("bt").children.length;`);
    check('Kronika zapisuje skutky, koniec podľa cti', run('chOk && endT === "Mierový vládca" && chRows > 3'), run('endT'));
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    run(`localStorage._ = {}; G.day = 100; save("auto"); rotateAutosaves(); G.day = 101; save("auto"); var a2 = slotData("auto2"), a1 = slotData("auto"); OPT.diff = "hard"; var b0 = { t: 0, hp: 100, x: 0, y: 0 }; hit(b0, 10); var hd = 100 - b0.hp; OPT.diff = "normal";`);
    check('Tri automatické uloženia a obťažnosť', run('a2 && a2.g.day === 100 && a1.g.day === 101 && Math.abs(hd - 12.5 * (temple() ? .9 : 1)) < .01'), run('hd'));
    run(`G.tips = {}; town(0); var tipRow = document.getElementById("bt").children.some(c => /^Tip:/.test(c.textContent)); town(0); var tipOnce = document.getElementById("bt").children.filter(c => /^Tip:/.test(c.textContent)).length === 0;`);
    check('Tip pri prvom vstupe do hradu (len raz)', run('tipRow && tipOnce'));
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    // kráľovstvo (realm.js): prímerie, posol, karavána, stavby, vzbura, hlasovanie, pamäť lordov
    run(closeMenus + '; mode = "map"; ov.classList.add("hide"); LETTERS.length = 0;');
    run(`G.fac = 6; G.king = 1; var tf = a0x.find(f => bloc(f) !== bloc(6) && TW.some(t => t.f === f)); WR[6][tf] = WR[tf][6] = true; REL[6][tf] = REL[tf][6] = -40; makeTruce(tf, 2); var tr1 = !WR[6][tf] && truceLeft(tf) === 2; G.day += 3; truceDaily(); var tr2 = WR[6][tf]; G.day -= 3;`);
    check('Prímerie a obnovenie vojny', run('tr1 && tr2'));
    run(`G.envs = [{ f: tf, offer: "peace", x: G.x + 30, y: G.y, from: "X" }]; realmTick(1); var envL = LETTERS.length && LETTERS[0].kind === "envoy"; readLetter(); var envDlg = document.getElementById("bt").children.some(b => /Prijať mier/.test(b.textContent));`);
    check('Posol dorazí a prinesie ponuku', run('envL && envDlg'));
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    run(`TW.forEach(t => t.mine = 0); TW[0].mine = 1; TW[0].f = 6; G.gold = 1000; var cOk = sendCaravan(0); var car = G.cars[0]; car.x = TW[car.to].x; car.y = TW[car.to].y; var g0 = G.gold; realmTick(1); var paid = G.gold > g0 + 200;`);
    check('Karavána dorazí a prinesie zisk', run('cOk && paid'), run('"zisk " + (G.gold - g0 - 200)'));
    run(`var vv = VL.find(v => v.t === 0); vv.st = 0; vv.bd = { m: 1, p: 1 }; var gd = G.gold, md = (G.fd.meat || 0); villageDaily(); var vOk = G.gold === gd + 3 && G.fd.meat === md + 2;
        G.tax = "high"; G.hon = -10; TW[0].pr = 10; TW[0].g = 5; TW[0].unrest = 11.5; var nE = E.length; unrestDaily(); var rebels = E.length === nE + 1 && /Vzbúrenci/.test(E[E.length - 1].nm); G.tax = "normal"; G.hon = 0;`);
    check('Stavby v dedine a vzbura pri nespokojnosti', run('vOk && rebels'));
    run(`var vs = E.filter(e => !e.nz && e.f !== 9).slice(0, 3); vs.forEach(e => { e.f = 6; e.dead = 0; }); TW[0].lord = 0; var fv = fiefVote(0); var fvOk = fv && TW[0].lord === fv.win.nm && fv.win.mem.length > 0;`);
    check('Rada vazalov hlasuje o léne', run('fvOk'), run('fv && fv.votes'));
    // spoločníci (fellowship.js): rola, osobná úloha, hádka
    run(`G.comp = ["aragorn", "legolas", "gimli"]; G.cjoin = { aragorn: G.day - 9, legolas: G.day - 9, gimli: G.day - 9 }; G.cq = {}; G.crel = {}; var roleOk = hasRole("ranhojic") && hasRole("inzinier") && !hasRole("velitel");
        fellowshipDaily(); var qStart = !!G.cq.aragorn; G.st.w = (G.cq.aragorn.w0 || 0) + 2; var done = compQuestVisit("Rivendell"); var qDone = !!G.cq.aragorn.done && done.length > 0;`);
    check('Spoločníci: role a osobná úloha', run('roleOk && qStart && qDone'));
    run(`LETTERS.length = 0; LETTERS.push({ kind: "quarrel", a: "legolas", b: "gimli", topic: "test" }); readLetter(); var qb = document.getElementById("bt").children.find(b => /^Dať za pravdu: Legolas/.test(b.textContent)); qb.onclick(); var qOk = G.crel.gimli < 60 && G.crel.legolas > 60;
        G.crel.gimli = 5; mode = "map"; fellowshipDaily(); var left = !G.comp.includes("gimli");`);
    check('Hádka v družine a odchod nespokojného', run('qOk && left'));
    run(closeMenus + '; mode = "map"; ov.classList.add("hide"); G.comp = []; G.king = 0;');
    // výpravy (bosses.js, voyage.js, sidequests.js): bossovia, súboj, plavba, vedľajšie výpravy
    run(closeMenus + '; mode = "map"; ov.classList.add("hide"); G.relic = {}; G.inf = 20;');
    for (const bk of ['balrog', 'trollking', 'fell', 'dragon']) {
        run(`mode = "map"; ov.classList.add("hide"); bossBattle("${bk}"); var bo = U.find(u => u.boss); var atkSeen = 0, flew = 0; for (let k = 0; k < 900 && mode === "battle"; k++) { U[0].hp = 999; bo.hp = Math.max(bo.hp, 500); updBattle(1); if (bo.atk) atkSeen = 1; if (bo.fly > 0) flew = 1; }
            var hp1 = bo.hp; bo.fly = 5; hit(bo, 100); var inv = bo.hp === hp1; bo.fly = 0; for (const u of U) if (u.t) u.hp = 0; var g0 = G.gold; var kb = 0; while (mode === "battle" && kb < 50) { U[0].hp = 999; updBattle(1); kb++; }`);
        check('Boss ' + bk + ': útoky, odmena a relikvia', run(`atkSeen && relic("${bk}") && G.gold > g0 && inv && ("${bk}" !== "dragon" || flew)`), run('atkSeen + " " + flew + " " + inv'));
        run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    }
    run(`var de = E.find(e => hos(e.f, G.fac) && !e.nz && e.f !== 9 && e.nm) || E.find(e => !e.nz && e.f !== 9); de.f = [0,1,2,3,4,5,7,8].find(f => hos(f, G.fac)) ?? de.f; meetFoe(de, null); var meetDlg = document.getElementById("bt").children.some(b => /na súboj/.test(b.textContent));
        ov.classList.add("hide"); duelLord(de); var duelU = U.filter(u => u.t).length === 1 && U.find(u => u.t).duelist; for (const u of U) if (u.t) u.hp = 0; var kdz = 0; while (mode === "battle" && kdz < 50) { U[0].hp = 999; updBattle(1); kdz++; } var dWin = G.duel && G.duel.win === 1;
        ov.classList.add("hide"); mode = "map"; startBattle(de); var mBroken = CMB.M[1] < CMB.M0[1] || CMB.M[1] <= 35; for (const u of U) if (u.t) u.hp = 0; kdz = 0; while (mode === "battle" && kdz < 50) { U[0].hp = 999; updBattle(1); kdz++; }`);
    check('Stretnutie a súboj veliteľov zlomí morálku nepriateľa', run('meetDlg && duelU && dWin && mBroken'));
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    run(`var pi = portIdx("Pelargir"), oi = portIdx("Osgiliath"); var hasPorts = portsFrom(pi).includes(oi) && !portsFrom(oi).includes(portIdx("Umbar")); G.gold = 2000; var d0 = G.day, g0 = G.gold; var sr = sail(pi, oi); var sOk = G.day > d0 && G.gold < g0 && Math.hypot(G.x - TW[oi].x, G.y - TW[oi].y) < 200;`);
    check('Plavba medzi prístavmi', run('hasPorts && sOk'), run('sr.text'));
    run(`G.sq = {}; G.wf = {}; var hi = portIdx("Hobitov"), bi = portIdx("Bree"); TW[hi].f = TW[bi].f = G.fac; ov.classList.add("hide"); mode = "map"; town(hi); var s0 = G.sq.kraj && G.sq.kraj.s === 1; ov.classList.add("hide"); mode = "map"; town(bi); var s1 = G.sq.kraj.s === 2; G.wf[9] = (G.wf[9] || 0) + 1; ov.classList.add("hide"); mode = "map"; town(hi);
        var ch = document.getElementById("bt").children.find(b => /Naverbovať odvážnych hobitov/.test(b.textContent)); var i0 = G.inf; ch.onclick(); var sDone = G.sq.kraj.done && G.inf === i0 + 8;`);
    check('Vedľajšia výprava: Tiene nad Krajom', run('s0 && s1 && sDone'));
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    // bojisko (časť C): strelná výbava, obojručné zbrane, kone, šík kopijníkov, obrana hradieb, klávesy, portréty
    run(closeMenus + '; mode = "map"; ov.classList.add("hide"); for (const k in keys) keys[k] = false;');
    run(`G.eq.r = 3; G.own.r = [0, 3]; G.eq.m = 0; G.inf = 5; startBattle({ n: 6, f: 9, nm: "T" }); var ammo0 = CMB.ammo; keys.q = true; CMB.bowC = 0; U[0].c = 0; cmbHero(U[0], 1, null); keys.q = false; var bolt = AR.some(a => a.bolt) && CMB.ammo === ammo0 - 1 && ammo0 >= 10;
        for (const u of U) if (u.t) u.hp = 0; var kk = 0; while (mode === "battle" && kk < 50) { U[0].hp = 999; updBattle(1); kk++; }`);
    check('Kuša ako strelná zbraň', run('bolt'));
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    run(`var tw = SH.find(s => s.k === "w").it.findIndex(x => x.t2 && !x.z); G.eq.w = tw; G.eq.s = 2; var t2ok = twoHand() && !heroShield() && Math.abs(red() - (1 - it("a").v - it("h").v) * (G.ring === 1 ? .7 : 1) * (relic("dragon") ? .92 : 1)) < 1e-9; G.eq.w = 0;
        var geq = Soldiers.GEAR.w.length === SH.find(s => s.k === "w").it.length && Soldiers.GEAR.r.length === SH.find(s => s.k === "r").it.length; Soldiers.icon("r", 3); Soldiers.icon("w", tw);`);
    check('Obojručná zbraň vypne štít, výbava má vzhľad aj ikonky', run('t2ok && geq'));
    run(`G.eq.m = 2; G.own.m = [0, 2]; startBattle({ n: 6, f: 9, nm: "T" }); var h0 = CMB.horse; for (let k = 0; k < 20 && !U[0].dis; k++) hit(U[0], 40); var dis = U[0].dis && CMB.horse <= 0 && U[0].bs < 3;
        var spear = U.find(u => u.t); spear.uk = "uG1"; spear.f = 0; spear.x = 500; spear.y = 300; spear.stun = 0; spear.rout = 0; var cav = U.find(u => !u.t && !u.h) || U[0]; cav.x = 512; cav.y = 300; cav.stun = 0; var chp = cav.hp; meleeHit(cav, spear, 50, "charge"); var braceOk = cav.hp < chp;
        for (const u of U) if (u.t) u.hp = 0; var kk2 = 0; while (mode === "battle" && kk2 < 50) { U[0].hp = 999; updBattle(1); kk2++; }`);
    check('Kôň padne a hrdina bojuje pešo; šík kopijníkov zastaví nápor', run('h0 > 0 && dis && braceOk'));
    run(closeMenus + '; mode = "map"; ov.classList.add("hide"); G.eq.m = 0;');
    run(`var dx = TW.findIndex(t => t.f !== 9 && !hos(t.f, G.fac)); var ef2 = [0,1,2,3,4,5,7,8].find(f => f !== TW[dx].f && f !== G.fac && hos(f, G.fac)) ?? 2; TW[dx].sg = { f: ef2, d0: G.day, lead: null, w: {}, lad: 1, ram: 0, tow: 0, food: 5 };
        G.arc = 4; startBattle({ nm: "Obliehatelia", n: 10, f: ef2, def: dx, foes: [], t: TW[dx] }); var defOk = SGB && SGB.att === 1 && U[0].x > 1000 && U.filter(u => u.t).every(u => u.x < 400) && U.some(u => !u.t && u.k === "a" && u.x >= 1000 && u.x <= 1050);
        U[0].x = 1020; U[0].y = 250; keys.b = true; cmbHero(U[0], 1, null); keys.b = false; var ladOff = SGB.ladOff && SGB.ladOff[0] > 0;
        var atk = U.find(u => u.t); atk.x = 990; atk.y = 400; var dfn = U.find(u => !u.t && !u.h); dfn.x = 1004; dfn.y = 400; var blk = wallBlocked(atk, dfn);
        for (const u of U) if (u.t) u.hp = 0; var kk3 = 0; while (mode === "battle" && kk3 < 50) { U[0].hp = 999; updBattle(1); kk3++; } TW[dx].sg = null; G.defend = -1;`);
    check('Obrana hradieb: obrancovia na hradbách, zhodený rebrík, útočník pod hradbami nedosiahne', run('defOk && ladOff && blk'));
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    run(`OPT.keys = { atk: "j" }; keys.j = true; var kOk = kd("atk") && !kd("thrust"); keys.j = false; OPT.keys = {}; Portraits.canvas({ race: "human", blink: 1, mood: "angry" }); Portraits.canvas({ race: "elf", mood: "scared" }); var pOk = true;`);
    check('Zmena kláves a živé portréty', run('kOk && pOk'));
    // smerový boj (etapa 2 – ako Warband): smer z pohybu myši, držaný nápriah, kryt do smeru, klam, luk so zameriavačom, sklopená kopija
    run(closeMenus + '; mode = "map"; ov.classList.add("hide"); for (const k in keys) keys[k] = false; G.eq.w = 0; G.eq.s = 0; G.eq.m = 0; G.eq.r = 0; G.eq.a = 0; G.eq.h = 0; G.s.ls = 2;');   // ľahká výbava: časovanie úderov bez postihu za hmotnosť
    run(`startBattle({ n: 6, f: 9, nm: "T" }); CMB.km = 1; var h = U[0], fq = U.filter(u => u.t); fq.forEach((u, i) => { u.x = 2000 + i * 40; u.y = 2000; u.stun = 999; }); U.filter(u => !u.t && !u.h).forEach(u => { u.x = 20; u.y = 30; u.stun = 999; }); var e = fq[0]; e.x = h.x + 18; e.y = h.y; e.hp = e.mh = 9999; e.f = Math.PI; e.stun = 999; h.f = 0; ptr.x = e.x - bc.x; ptr.y = e.y - bc.y; h.c = 0;
        var tick = n => { for (let i = 0; i < n; i++) cmbHero(h, 1, null); };
        CMB.mdx = -30; CMB.mdy = 0; var dL = mouseDir(); CMB.mdx = 0; CMB.mdy = -30; var dU = mouseDir(); CMB.mdy = 30; var dT = mouseDir(); CMB.mdx = 0; CMB.mdy = 0;
        var R0 = Math.random; Math.random = () => .999;
        CMB.mdx = 30; keys[" "] = true; tick(1); var rdOk = CMB.rd && CMB.rd.d === "r"; tick(3); keys[" "] = false; tick(40); var hp1 = e.hp, quick = 9999 - hp1;
        h.c = 0; CMB.st = 100; CMB.mdx = 30; keys[" "] = true; tick(55); keys[" "] = false; tick(30); var strong = hp1 - e.hp;
        h.c = 0; CMB.st = 100; keys[" "] = true; tick(5); CMB.blk = 0; keys.Shift = true; tick(1); keys.Shift = false; keys[" "] = false; var feint = !CMB.rd; tick(2);`);
    check('Smer úderu z pohybu myši, držaný nápriah je silnejší, kryt počas nápriahu je klam', run('dL === "l" && dU === "u" && dT === "t" && rdOk && quick > 0 && strong > quick * 1.3 && feint'), run('[dL, dU, dT, rdOk, quick, strong, feint].join(" ")'));
    // boj ako Warband: čepeľ v pohybe, štatistiky zbraní, brnenie odráta pevnú hodnotu, bez výdrže
    run(`h.c = 0; e.hp = e.mh = 9999; e.x = h.x + 18; e.y = h.y; CMB.mdx = 30; CMB.sw = null; CMB.rd = { d: "r", t: 99, key: "atk", ready: 9, rel: 1 }; cmbHero(h, 1, null); var swAct = !!CMB.sw, hpA = e.hp; tick(1); var late = e.hp === hpA ? 0 : 1; tick(24); var swHit = e.hp < hpA && !CMB.sw;
        h.c = 0; e.hp = e.mh = 9999; e.x = h.x + 80; CMB.rd = { d: "r", t: 99, key: "atk", ready: 9, rel: 1 }; cmbHero(h, 1, null); tick(26); var far = e.hp === 9999; e.x = h.x + 18;
        var kS = ["Železný meč", "Rohanská kopija", "Trpasličia sekera z Ereboru", "Orkský nôž", "Gondorský obojručný meč", "Sauronov palcát"].map(n => wkind(shOf("w").find(w => w.n === n)));
        var stOk = kS.join() === "sword,spear,axe,knife,two,mace" && wstat({ n: "x" }).sp === 1;
        var tp = U.find(u => u.t && u !== e); tp.hp = tp.mh = 9999; tp.cp = 0; tp.boss = 0; tp.uk = null; tp.k = "i";
        var weak = 0, big = 0; var pl = plated; var Rn = Math.random; Math.random = () => .999;
        plated = () => true; tp.hp = 9999; hitZ(tp, 6, h, { zone: "torso", type: "c" }); weak = 9999 - tp.hp; tp.hp = 9999; hitZ(tp, 40, h, { zone: "torso", type: "c" }); big = 9999 - tp.hp;
        plated = () => false; tp.hp = 9999; hitZ(tp, 6, h, { zone: "torso", type: "c" }); var weakN = 9999 - tp.hp; plated = pl; Math.random = Rn;
        OPT.noStam = true; CMB.st = 10; h.c = 0; tick(1); var noSt = CMB.st === 100; OPT.noStam = undefined;`);
    check('Warband: čepeľ zasiahne počas seku (nie hneď), mimo dosahu nič; druhy zbraní; plát odráta pevnú hodnotu (slabý úder sa stratí, silný prejde); bez výdrže', run('swAct && late === 0 && swHit && far && stOk && weak < weakN * .85 && big > 33 && noSt'), run('[swAct, late, swHit, far, kS, weak, weakN, big, noSt].join(" ")'));
    // etapa 1 (duel ako vo Warbande): úder AI v pohybe, uskočenie, rýchlosť oboch strán, zarazenie o kryt, hmotnosť výbavy
    run(`startBattle({ n: 6, f: 2, nm: "T" }); var sh = U[0], sa = U.find(u => u.t); U.filter(u => u.t && u !== sa).forEach(u => { u.x = 3000; u.y = 3000; u.stun = 999; });
        sh.x = 300; sh.y = 300; sh.hp = 5000; sh.vx3 = sh.vy3 = 0; sa.x = 312; sa.y = 300; sa.f = Math.PI; sa.hp = sa.mh = 9999; sa.stun = 0; sa.rout = 0; sa.c = 0; sa.wu = 0; sa.as = null; sa.uk = null; sa.k = "i"; sa.d = 10; sa.vx3 = sa.vy3 = 0;
        CMB.blk = 0; CMB.swing = null; var S0 = Math.random; Math.random = () => .5;
        aiMelee(sa, sh, 12, 1); var g = 0; while (sa.wu > 0 && g++ < 200) aiMelee(sa, sh, 12, 1); var atRel = sh.hp === 5000 && !!sa.as; g = 0; while (sa.as && g++ < 50) aiMelee(sa, sh, 12, 1); var landed = sh.hp < 5000;
        sh.hp = 5000; sa.c = 0; aiMelee(sa, sh, 12, 1); g = 0; while (sa.wu > 0 && g++ < 200) aiMelee(sa, sh, 12, 1); sh.x = 260; g = 0; while (sa.as && g++ < 50) aiMelee(sa, sh, 52, 1); var dodged = sh.hp === 5000 && !sa.as;
        Math.random = S0; var spdOk = speedK(2, false) > speedK(0, false) && speedK(0, false) > speedK(-2, false) && speedK(2, true) > speedK(2, false);
        sh.x = 300; sa.x = 314; sa.y = 300; sa.f = Math.PI; sh.f = 0; sa.stun = 0; sa.wu = 0; sa.as = null; sa.hp = 9999; CMB.hist = []; CMB.sw = { hit: [] }; sh.c = 0;
        Math.random = () => 0; var blocked = meleeHit(sh, sa, 10, "swing", { d: "l", pow: 1, vis: 2 }) === false; Math.random = S0; var bounced = blocked && CMB.sw.hit.length >= 99 && sh.c >= 8; CMB.sw = null;
        var ia = shOf("a").findIndex(w => /plát/i.test(w.n)), im = shOf("a").findIndex(w => /Mithril/.test(w.n)), s0 = [G.eq.a, G.eq.s, G.eq.h, G.eq.m, G.s.ob];
        G.eq.m = 0; G.s.ob = 0; G.eq.a = 0; G.eq.s = 0; G.eq.h = 0; var l0 = heroLoad();
        G.eq.a = ia; G.eq.s = shOf("s").length - 1; G.eq.h = shOf("h").length - 1; var lH = heroLoad(), spH = loadSpeed(), swH = loadSwing();
        G.eq.a = im; G.eq.s = 0; G.eq.h = 0; var lM = heroLoad(); G.eq.a = ia; G.s.ob = 4; var lOb = heroLoad();
        G.eq.a = s0[0]; G.eq.s = s0[1]; G.eq.h = s0[2]; G.eq.m = s0[3]; G.s.ob = s0[4];`);
    check('Duel ako vo Warbande: úder AI zasiahne až čepeľou v pohybe a dá sa mu uskočiť; rýchlosť oboch strán; úder zachytený krytom odskočí; ťažká výbava spomalí (mithril nie)', run('atRel && landed && dodged && spdOk && bounced && l0 === 0 && lH > .5 && spH < .9 && swH > 1.07 && lM < lH * .5 && lOb < lH'), run('[atRel, landed, dodged, spdOk, bounced, l0, lH, spH, swH, lM, lOb].join(" ")'));
    // etapa 2 (bitka ako vo Warbande): zálohy a posily vo vlnách, bitka po páde hrdinu, zásahy vlastných, počty strán pre morálku
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    run(`var sv2 = { inf: G.inf, cav: G.cav, arc: G.arc, vet: G.vet, elf: G.elf, roh: G.roh, gold: G.gold, x: G.x, y: G.y, tx: G.tx, ty: G.ty, hp: G.hp, ent: G.ent }; G.inf = 300; G.cav = G.arc = G.vet = G.elf = G.roh = G.ent = 0; OPT.bsize = "n";
        startBattle({ n: 200, f: 2, nm: "T" }); var fe = U.filter(u => u.t && !u.src), resF = BRES[1].length, resM = BRES[0].length, n0ok = CMB.n0[0] > 20 && CMB.n0[1] > 20 && CMB.fc[1] === fe.length;
        fe.slice(0, Math.ceil(fe.length * .6)).forEach(u => { u.hp = 0; }); CMB.M[1] = 60; CMB.rfT = 59; reinforce(1);
        var waved = BRES[1].length < resF && U.filter(u => u.t && u.hp > 0 && !u.src).length > fe.length * .45 && U.some(u => u.rf);
        U[0].hp = 0; var stepOk = true; try { updBattle(1); } catch (er) { stepOk = String(er); } var goes = mode === "battle" && CMB.down === 1 && camUnit() !== U[0] && !camUnit().t;
        BRES[1] = []; for (const u of U) if (u.t) u.hp = 0; updBattle(1); var wonDown = mode !== "battle";`);
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    run(`G.inf = 5; startBattle({ n: 3, f: 9, nm: "T" }); for (const u of U) if (!u.t && !u.h) u.hp = 0; BRES[0] = []; U[0].hp = 0; updBattle(1); var lostDown = mode !== "battle";`);
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    run(`G.inf = 10; startBattle({ n: 3, f: 9, nm: "T" }); var fa = U.find(u => !u.t && !u.h), fs2 = U.find(u => !u.t && !u.h && u !== fa); U.filter(u => u !== fa && u !== fs2 && !u.h).forEach(u => { u.x = 3000; u.y = 3000; u.stun = 999; });
        fs2.x = 200; fs2.y = 300; fa.x = 260; fa.y = 300; fa.f = 0; fa.hp = fa.mh = 999; AR.length = 0; var R3 = Math.random; Math.random = () => .9;
        fireArrow(fs2, 0, 0, 7, { d: 6 }); var k3 = 0; while (AR.length && k3++ < 100) stepArrows(1); var ffArrow = fa.hp < 999;
        OPT.ff = false; fa.hp = 999; AR.length = 0; fireArrow(fs2, 0, 0, 7, { d: 6 }); k3 = 0; while (AR.length && k3++ < 100) stepArrows(1); var ffOff = fa.hp === 999; OPT.ff = undefined;
        var hh = U[0]; hh.hp = 500; hh.x = 500; hh.y = 500; hh.f = 0; fa.x = 515; fa.y = 500; fa.hp = 999; CMB.sw = { vis: 10, d: "u", t: 0, dur: 11, P: { arc: .5, n: 1, m: 1.2, r: 1 }, pow: 1, reach: 34, hit: [], bl: 0, pitch: null };
        for (let i = 0; i < 12 && CMB.sw; i++) swingTick(hh, 1, wpnTimes()); var ffMelee = fa.hp < 999; Math.random = R3;
        Object.assign(G, sv2); OPT.bsize = undefined;`);
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    check('Bitka ako vo Warbande: zálohy prídu vo vlnách, po páde hrdinu bitka pokračuje (výhra aj prehra), zásahy vlastných šípom aj úderom (dajú sa vypnúť), počty strán pre morálku', run('resF === 120 && resM > 200 && n0ok && waved && stepOk === true && goes && wonDown && lostDown && ffArrow && ffOff && ffMelee'), run('[resF, resM, n0ok, waved, stepOk, goes, wonDown, lostDown, ffArrow, ffOff, ffMelee].join(" ")'));
    // etapa 3 (rozvoj ako vo Warbande): zdatnosti so zbraňami, bojové schopnosti, kôň ako bojovník
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    run(`var sv3 = { wp: G.wp, cs: G.cs, bk: G.bk, lv: G.lv, eq: { ...G.eq }, hp: G.hp, inf: G.inf };
        G.wp = null; G.cs = null; G.bk = null; G.lv = 5; wpInit(); var initOk = G.wp.one === 40 && G.wp.bow === 40 && G.bk === 4;
        G.eq.w = 0; G.eq.m = 0; G.eq.a = 0; G.eq.s = 0; G.eq.h = 0; var d0 = heroMeleeDmg(), t0 = wpnTimes().ready; G.wp.one = 300; var d1 = heroMeleeDmg(), t1 = wpnTimes().ready; var profOk = d1 > d0 * 1.25 && t1 < t0 * .85;
        G.wp.one = 40; startBattle({ n: 3, f: 9, nm: "T" }); var gv = U.find(u => u.t); gv.hp = gv.mh = 9999; var w0 = G.wp.one; hitZ(gv, 30, U[0], { zone: "torso", type: "c" }); var grow = G.wp.one > w0; var wk = G.wp.one; hitZ(gv, 2, U[0], { zone: "torso", type: "b", noWp: 1 }); var noKick = G.wp.one === wk;
        var bk0 = G.bk, ps0 = heroMeleeDmg(), mh0 = mh(); var took = csTake("ps") && csTake("ir") && G.bk === bk0 - 2; var csOk = took && heroMeleeDmg() > ps0 * 1.07 && mh() === mh0 + 8; G.cs.ps = 5; var capOk = !csTake("ps");
        G.cs.at = 5; var spAt = heroSpeedK(); G.cs.at = 0; var spOk = spAt > heroSpeedK() * 1.15;
        var lvB = G.bk; G.xp = 9999; G.lv = 5; endBattle(true); var lvUp = G.bk > lvB;`);
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    run(`G.eq.m = 1; startBattle({ n: 4, f: 9, nm: "T" }); var hr = U[0]; U.filter(u => u.t).forEach(u => { u.x = 3000; u.y = 3000; u.stun = 999; }); var pz = U.find(u => u.t); pz.k = "i"; pz.uk = null; pz.hp = pz.mh = 999; pz.stun = 0; pz.f = 0;
        hr.x = 400; hr.y = 300; pz.x = 418; pz.y = 300; CMB.mvA = 0; CMB.mvS = hr.sp; CMB.charging = 0; CMB.rear = 0; CMB.run = 0; hr.tt = 100; horseBump(hr); var bumped = pz.hp < 999 && pz.stun > 0 && CMB.mvS < hr.sp;
        var R4 = Math.random; Math.random = () => .1; CMB.rear = 0; CMB.horse = 100; horseHurt(10); var reared = CMB.rear > 0; Math.random = R4;
        Object.assign(G, { wp: sv3.wp, cs: sv3.cs, bk: sv3.bk, eq: sv3.eq, hp: sv3.hp, inf: sv3.inf }); wpInit();`);
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    check('Rozvoj ako vo Warbande: zdatnosti so zbraňami rastú používaním a zrýchlia a posilnia údery; bojové schopnosti za body z úrovní; kôň zrazí pešiaka a po zásahu sa vzopne', run('initOk && profOk && grow && noKick && csOk && capOk && spOk && lvUp && bumped && reared'), run('[initOk, profOk, grow, noKick, csOk, capOk, spOk, lvUp, bumped, reared].join(" ")'));
    run(`startBattle({ n: 6, f: 2, nm: "T" }); var bwT = U[0]; bwT.x = 300; bwT.y = 300; bwT.vx3 = 0; bwT.vy3 = 0; var bwA = U.find(u => u.t); bwA.hp = bwA.mh = 99; bwA.k = "i"; bwA.uk = null; bwA.d = 5; bwA.x = 400; bwA.y = 300;
        var bwM = Math.random; Math.random = (() => { let q = 12345; return () => (q = (q * 1664525 + 1013904223) % 4294967296) / 4294967296; })(); var bwS = '', firstShot = 0, bwH = 0, bwN = 300; for (let n = 0; n < bwN; n++) { AR.length = 0; bwA.c = 0; bwA.aim = 0; bwT.hp = 1e9; for (let k = 0; k < 80 && !AR.length; k++) { aiBow(bwA, bwT, 7); if (!firstShot && AR.length) firstShot = k + 1; }
            const bwa = AR[0]; if (!bwa) continue; let bwt = 0; while (AR.includes(bwa) && bwt++ < 400) stepArrows(1); const dy = Math.abs(bwa.y - bwT.y), dx = Math.abs(bwa.x - bwT.x); if (dx < 12 && dy < 6) bwH++; if (n < 4) bwS += [bwa.x | 0, bwa.y | 0, bwT.x | 0, bwT.y | 0].join(',') + ' '; }
        Math.random = bwM; var hitPct = bwH / bwN;`);
    check('Warband: lukostrelec najprv mieri (napína) a netrafí každý šíp (stojaci cieľ do 100 jednotiek)', run('firstShot >= 25 && hitPct < .55 && hitPct > .05'), run('[firstShot, hitPct, bwH, bwN, bwS].join(" ")'));
    run(`startBattle({ n: 6, f: 2, nm: "T" }); var sT = U[0], sA = U.find(u => u.t); sA.uk = "uG3"; sA.k = "i"; sA.hp = sA.mh = 9999; sA.stun = 0; sA.rout = 0; sA.wu = 0; sA.c = 0; sA.sp = 1;
        var spOk = aiWpn(sA) === "spear" || (sA.uk = Object.keys(FU).find(k => FU[k].wp === "sp"), aiWpn(sA) === "spear"); sA.x = sT.x + 6; sA.y = sT.y; var d0 = Math.hypot(sA.x - sT.x, sA.y - sT.y); aiSpacing(sA, sT, d0, 1); var back = Math.hypot(sA.x - sT.x, sA.y - sT.y) > d0;
        sA.uk = null; sA.k = "i"; sA.d = 15; sA.c = 30; sA.x = sT.x + 10; sA.y = sT.y; sA.sd = 1; sA.sdT = 50; var y0 = sA.y; aiSpacing(sA, sT, 10, 1); var side = Math.abs(sA.y - y0) > .1, skMove = Math.abs(sA.y - y0);
        sA.d = 5; sA.x = sT.x + 10; sA.y = sT.y; y0 = sA.y; aiSpacing(sA, sT, 10, 1); var still = Math.abs(sA.y - y0) > 0 && Math.abs(sA.y - y0) < skMove; var stopOk = aiStop(sA) < 13;`);
    run(`G.inf = 30; startBattle({ n: 30, f: 0, nm: "Sep" }); for (const u of U) if (u.t) { u.x = 700 + Math.random() * 20; u.y = 480 + Math.random() * 20; } var sepK = 0; for (let n = 0; n < 400; n++) sepUnits(1); var sepOv = 0, sepEx = null; { const L = U.filter(u => u.hp > 0 && !u.h); for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if (Math.hypot(L[i].x - L[j].x, L[i].y - L[j].y) < 5) { sepOv++; if (!sepEx) sepEx = JSON.stringify([L[i].x, L[i].y, L[i].t, L[i].k, L[i].r, L[i].ride, L[i].fled, typeof SGB === 'object' ? !!SGB : SGB, L.length]); } }`);
    check('Telesná kolízia: vojaci natlačení na jednom mieste sa po chvíli neprekrývajú', run('sepOv === 0'), run('sepOv + " " + sepEx'));
    run(`G.inf = 30; G.arc = 0; startBattle({ n: 40, f: 0, nm: "Tac" }); var tI = 0; for (const u of U) if (u.t) { Object.assign(u, mkBase(1, ["i", "i", "a", "c"][tI++ % 4], 0)); } U[0].hp = U[0].mh = 150; var tcOk = 0, tcF = 0, tcN = 0; for (let n = 0; n < 700; n++) { updBattle(1); if (n > 150 && n % 50 === 0 && TAC.on) { const E = U.filter(u => u.t && u.hp > 0), pi = E.filter(u => u.k === "i").map(tacProj), pa = E.filter(u => u.k === "a").map(tacProj); if (pi.length && pa.length) { tcN++; if (pa.reduce((s, p) => s + p, 0) / pa.length < pi.reduce((s, p) => s + p, 0) / pi.length) tcOk++; } } } tcF = U.filter(u => u.t && u.k === "c" && u.flk).length;`);
    run(`G.inf = 10; startBattle({ n: 10, f: 0, nm: "Obs" }); obsSet([[600, 500, 3, 26], [900, 500, 5, 5]]); var oU = U.find(u => !u.t && !u.h); oU.x = 601; oU.y = 500; obsUnits(); var obsPush = Math.hypot(oU.x - 600, oU.y - 500) >= 3 + (oU.r || 7) * .45 - .01;
        var oA = fireArrow(U[0], 0, 0, 7, {}); oA.x = 590; oA.y = 500; oA.z = 10; oA.sx = 500; oA.sy = 500; oA.vx = 7; oA.vy = 0; oA.vz = 0; oA.t = 0; oA.by = U[0]; oA.l = 100; var oB = fireArrow(U[0], 0, 0, 7, {}); oB.x = 590; oB.y = 500; oB.z = 40; oB.sx = 500; oB.sy = 500; oB.vx = 7; oB.vy = 0; oB.vz = 0; oB.by = U[0];
        var aLow = obsArrow(oA, 590, 500) === false; oA.x = 603; var stopLow = obsArrow(oA, 596, 500); oB.x = 603; var overHigh = obsArrow(oB, 596, 500) === false; obsSet([]);`);
    run(`G.inf = 5; startBattle({ n: 5, f: 0, nm: "Jav" }); obsSet([]); var jT = U.find(u => u.t), jU = U.find(u => !u.t && !u.h); Object.assign(jU, { x: 400, y: 400, k: "i", jv: 2, c: 0, wu: 0, as: null }); Object.assign(jT, { x: 480, y: 400 }); var jAr0 = AR.length, jThrown = 0; for (let n = 0; n < 80; n++) { aiThrow(jU, jT, 80, 1); if (AR.some(a => a.jav && a.by === jU)) { jThrown = 1; break; } } var jLeft = jU.jv;
        var cT = U.find(u => u.t && u !== jT) || jT, cU = mk(0, "c"); U.push(cU); Object.assign(cU, { x: 300, y: 300, vx3: 2, vy3: 0, bs: 2, sp: 2, stun: 0, t: 0 }); Object.assign(cT, { x: 306, y: 300, hp: 500, mh: 500, k: "i", uk: undefined, stun: 0, bmpT: 0 }); var cHp = cT.hp; aiTrample(cU); var trampled = cT.hp < cHp && cT.stun > 0 && cT.x > 306;`);
    check('Výzbroj: pešiak AI hodí oštep (ubudne mu), jazdec AI v rýchlom pohybe zrazí pešiaka', run('jThrown && jLeft === 1 && trampled'), run('[jThrown, jLeft, trampled].join(" ")'));
    run(`G.inf = 12; G.arc = 6; startBattle({ n: 12, f: 0, nm: "Ord" }); obsSet([]); CMB.sel = "p"; var oi = U.find(u => !u.t && !u.h && u.k === "i"); var ox0 = oi.x; for (const u of U) if (u.t) { u.x = 1400; u.y = oi.y; } tacOrder("o_adv"); var advOk = oi.hx > ox0 + 100 && CMB.og.p === "h"; tacOrder("o_bk"); var bkOk = oi.hx < oi.x - 100 + 5;
        CMB.sel = "l"; tacOrder("o_hf"); var hfOn = CMB.hf === true; var oa = U.find(u => !u.t && u.k === "a" && !u.h); if (oa) { oa.aim = 5; oa.c = 0; aiBow(oa, U.find(u => u.t), 7); } var hfHold = !oa || oa.aim === 0; tacOrder("o_hf"); var hfOff = CMB.hf === false;`);
    check('Rozkazy: vpred a vzad o 10 krokov nastavia miesta, držať palbu zastaví lukostrelcov', run('advOk && bkOk && hfOn && hfHold && hfOff'), run('[advOk, bkOk, hfOn, hfHold, hfOff].join(" ")'));
    check('Terén: vojak sa o kmeň neprekrýva, šíp sa zastaví o kmeň, ale preletí nad ním', run('obsPush && aLow && stopLow && overHigh'), run('[obsPush, aLow, stopLow, overHigh].join(" ")'));
    check('Taktická AI: nepriateľskí lukostrelci držia za líniou pešiakov a jazda dostane obchvat', run('tcN > 3 && tcOk >= tcN - 1 && tcF > 0'), run('[tcN, tcOk, tcF].join(" ")'));
    check('Warband: kopijník pri malom odstupe cúva, zručný vojak pri dobíjaní krúži rýchlejšie ako slabý', run('spOk && back && side && still && stopOk'), run('[spOk, back, side, still, stopOk].join(" ")'));
    run(`startBattle({ n: 6, f: 2, nm: "T" }); var pH = U[0], pA = U.find(u => u.t); pH.f = 0; pA.x = pH.x + 10; pA.y = pH.y; pA.hp = pA.mh = 9999; pA.stun = 0; CMB.blk = 1; CMB.blkT = 3; CMB.st = 100; CMB.shp = 50; CMB.perfT = 0;
        var pBl = meleeHit(pA, pH, 10, "ai"); var perfOk = pBl === false && CMB.perfT > 0 && pA.stun > 0; CMB.blk = 0;
        var bwM2 = Math.random; Math.random = (() => { let q = 777; return () => (q = (q * 1664525 + 1013904223) % 4294967296) / 4294967296; })();
        var df = U.find(u => !u.t && u !== pH && u.k === "i"); if (!df) { df = mk(0, "uG1"); U.push(df); } df.hp = df.mh = 99999; df.stun = 0; df.rout = 0; df.wu = 0; df.d = 15; df.uk = null; df.k = "i"; df.x = pH.x + 14; df.y = pH.y; df.f = Math.PI; pH.f = 0; CMB.hist = [];
        var rb = vis => { let b = 0; for (let n = 0; n < 400; n++) { CMB.hist = ["l", "r", "u"]; df.hp = 99999; if (meleeHit(pH, df, 5, "swing", { d: "l", pow: 1, vis }) === false) b++; } return b / 400; };
        var slowB = rb(40), fastB = rb(2); Math.random = bwM2;`);
    check('Warband: dokonalý kryt dá odozvu a zapotáca útočníka; zručný vojak prečíta dlho držaný nápriah, rýchly úder ho zaskočí', run('perfOk && slowB > fastB + .1'), run('[perfOk, slowB, fastB].join(" ")'));
    run(`var ai = U.find(u => u.t && u !== e); ai.uk = null; ai.k = "i"; ai.d = 5; ai.hp = ai.mh = 9999; ai.stun = 0; ai.rout = 0; ai.wu = 10; ai.wt = h; var R1 = Math.random; Math.random = () => .99; hitZ(ai, 8, h, { zone: "torso", type: "c" }); Math.random = R1; var flinch = ai.wu === 0 && ai.c >= 16;
        ai.wu = 10; ai.d = 15; ai.hp = ai.mh = 9999; Math.random = () => .1; hitZ(ai, 8, h, { zone: "torso", type: "c" }); Math.random = R1; var skilled = ai.wu === 10 - 0 || ai.wu > 0;
        ai.uk = "uG1"; var wkA = aiWpn(ai); ai.uk = "uE1"; var wkB = aiWpn(ai); ai.uk = null; var wOk = wkA === "spear" && wkB === "axe" && aiSkill({ d: 5 }) === 0 && aiSkill({ d: 15 }) === 1;`);
    check('Warband: zásah preruší nápriah slabého vojaka, zručný vydrží; druh zbrane a zručnosť AI', run('flinch && skilled && wOk'), run('[flinch, skilled, wkA, wkB].join(" ")'));
    run(`OPT.blkDir = "manual"; CMB.shp = 0; CMB.shMax = 0; CMB.st = 100; CMB.blk = 1; CMB.blkT = 40; CMB.bd = "r"; e.lwd = "l"; e.f = Math.PI; h.f = 0; var hpA = h.hp = 500; meleeHit(e, h, 20, "ai"); var wrongDir = h.hp < hpA;
        CMB.bd = "l"; CMB.st = 100; var hpB = h.hp; var res = meleeHit(e, h, 20, "ai"); var rightDir = !res && h.hp === hpB; OPT.blkDir = "auto"; CMB.blk = 0;
        e.stun = 0; e.c = 0; e.wu = 0; Math.random = R0; e.x = h.x + 10; aiMelee(e, h, 10, 1); var aiDir = ["l", "r", "u", "t"].includes(e.wd);`);
    check('Kryt do smeru (Nastavenia: myšou): zlý smer neubráni, správny áno; vojaci volia smer úderu', run('wrongDir && rightDir && aiDir'), run('[wrongDir, rightDir, aiDir].join(" ")'));
    run(`e.wu = 0; e.stun = 999; var far = U.filter(u => u.t)[1]; far.x = h.x + 1000; CMB.ammo = 20; CMB.bowC = 0; AR.length = 0; ptr.x = h.x + 200 - bc.x; ptr.y = h.y - bc.y; e.x = h.x + 400; e.y = h.y + 300;
        keys.q = true; tick(3); var early = CMB.aim && CMB.aim.r; tick(30); var full = CMB.aim && CMB.aim.r; keys.q = false; tick(1); var arw = AR[AR.length - 1]; for (const v of U) if (v !== h) v.x += 5000; for (let k = 0; k < 400 && AR.includes(arw); k++) stepArrows(1); var land = arw && arw.land && Math.hypot(arw.x - (h.x + 200), arw.y - h.y);`);
    check('Luk: držaním sa napína, zameriavač sa zúži, šíp dopadne k bodu pod kurzorom', run('early > full && arw && land < 30'), run('[early, full, land].join(" ")'));
    run(`for (const u of U) if (u.t) u.hp = 0; var kq = 0; while (mode === "battle" && kq < 50) { U[0].hp = 999; updBattle(1); kq++; }`);
    run(closeMenus + '; mode = "map"; ov.classList.add("hide"); for (const k in keys) keys[k] = false;');
    run(`G.eq.w = 2; G.eq.m = 2; G.own.m = [0, 2]; startBattle({ n: 6, f: 9, nm: "T" }); CMB.km = 1; var h = U[0], fq = U.filter(u => u.t); fq.forEach((u, i) => { u.x = 2000 + i * 40; u.y = 2000; u.stun = 999; }); U.filter(u => !u.t && !u.h).forEach(u => { u.x = 20; u.y = 30; u.stun = 999; }); var e = fq[0]; e.hp = e.mh = 9999; e.stun = 999; e.uk = null; e.k = "o";
        h.x = 300; h.y = 400; h.f = 0; e.x = 360; e.y = 400; CMB.run = 30; CMB.lastA = 0; CMB.chg = 99; CMB.px = 290; CMB.py = 400; keys.e = true; cmbHero(h, 1, 0); keys.e = false; var couchHit = 9999 - e.hp; var couchOk = couchHit > dmg() * 2;
        for (const u of U) if (u.t) u.hp = 0; var kc = 0; while (mode === "battle" && kc < 50) { U[0].hp = 999; updBattle(1); kc++; } G.eq.m = 0; G.eq.w = 0;`);
    check('Sklopená kopija v cvale: veľký zásah podľa rýchlosti koňa', run('couchOk'), run('couchHit'));
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    // útvary a rozkazy na miesto (etapa 3): riadky, štítový val, voľný útvar; skupina sa postaví k bodu pod kurzorom
    run(closeMenus + '; mode = "map"; ov.classList.add("hide"); for (const k in keys) keys[k] = false; G.eq.m = 0;');
    run(`G.inf = 24; G.arc = 8; G.cav = 0; startBattle({ n: 10, f: 2, nm: "T" }); CMB.sel = "p"; setOrd("l"); var inf = U.filter(u => !u.t && !u.ally && u.k === "i");
        var gap = us => { let m = 1e9; for (const a of us) for (const b of us) if (a !== b) m = Math.min(m, Math.hypot(a.hx - b.hx, a.hy - b.hy)); return m; };
        var g0 = gap(inf), bc0 = blockChance(inf[0]); cycleFormation(); var fmW = CMB.fm.p === "wall", g1 = gap(inf), bc1 = blockChance(inf[0]); cycleFormation(); var g2 = gap(inf); cycleFormation();
        var at = { x: 400, y: 700 }; ordPlace(["p"], "h", at); var cx = inf.reduce((s, u) => s + u.hx, 0) / inf.length, cy = inf.reduce((s, u) => s + u.hy, 0) / inf.length; var placed = Math.hypot(cx - at.x, cy - at.y) < 40;
        CMB.prev = slotsFor(["p"], "l", at); var prevOk = CMB.prev.length === U.filter(u => !u.t && !u.ally && !u.h && u.hp > 0 && !u.rout && grpOf(u) === "p").length && CMB.prev.length >= inf.length; CMB.prev = null;`);
    check('Útvary: štítový val je tesnejší a lepšie kryje, voľný útvar je rozostúpený; rozkaz na miesto postaví skupinu k bodu', run('fmW && g1 < g0 && g2 > g0 && bc1 > bc0 && placed && prevOk'), run('[fmW, g0, g1, g2, bc0, bc1, placed, prevOk].join(" ")'));
    run(`FX3.length = 0; var hb = U[0]; hb.x = 1020; hb.y = 600; SGB = null; var hasRock = false; for (const u of U) if (u.t) u.hp = 0; var kf3 = 0; while (mode === "battle" && kf3 < 50) { U[0].hp = 999; updBattle(1); kf3++; }`);
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    run(`bossBattle("trollking"); var bo = U.find(u => u.boss); FX3.length = 0; bossStrike(bo, { k: "circle", x: bo.x, y: bo.y, r: 80, t: 0, t0: 30, dmg: 1 }); var bossFx = FX3.some(e => e.k === "boss" && e.b === "trollking"); for (const u of U) if (u.t) u.hp = 0; var kb3 = 0; while (mode === "battle" && kb3 < 60) { U[0].hp = 999; updBattle(1); kb3++; }`);
    check('Údery bossov posielajú udalosti pre 3D efekty', run('bossFx'));
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    // Warband: miesto zásahu, smrteľný zásah do hlavy, typy poškodenia, kopnutie, kryt útokom, koliesko, zbieranie šípov, kôň, jazdecký lukostrelec, kuša
    run(closeMenus + '; mode = "map"; ov.classList.add("hide"); for (const k in keys) keys[k] = false; G.eq.w = 0; G.eq.m = 0; G.eq.r = 0; G.eq.s = 1; G.s.ls = 1;');
    run(`startBattle({ n: 6, f: 2, nm: "T" }); CMB.km = 1; var h = U[0]; h.x = 300; h.y = 400; h.f = 0; var fq = U.filter(u => u.t && !u.cmd); fq.forEach((u, i) => { u.x = 2000 + i * 40; u.y = 2000; u.stun = 1e9; });
        var R0 = Math.random; Math.random = () => .999;
        var e = fq.find(u => !heavy(u) && !onMount(u)); e.x = 420; e.y = 400; e.hp = e.mh = 9999; var z0 = elevSim(h.x, h.y) + seatH(h) + bodyH(h) * .72;
        var shot = (zt) => { AR.length = 0; const a = fireArrow(h, 0, ballistic(120, zt - z0, 10), 10, { t: 0, d: 6 }); for (let k = 0; k < 200 && AR.includes(a); k++) stepArrows(1); return a; };
        var aT = shot(bodyH(e) * .6); var torsoOk = e.lz === 'torso' && e.hp < 9999 && e.hp > 0 && aT.hitU === e;
        var aH = shot(bodyH(e) * .93); var headOk = e.lz === 'head' && e.hp <= 0;
        Math.random = R0;
        var hp0 = h.hp = 500; hitZ(h, 10, fq[1], { zone: 'torso', type: 'c' }); var dT = hp0 - h.hp; h.hp = 500; hitZ(h, 10, fq[1], { zone: 'head', type: 'c' }); var dH = 500 - h.hp; h.hp = h.mh;
        var e3 = fq.filter(u => !heavy(u))[1]; e3.hp = 5; Math.random = () => .1; hitZ(e3, 50, h, { zone: 'torso', type: 'b' }); Math.random = R0; var koOk = e3.ko === 1 && e3.hp <= 0;`);
    check('Šíp v 3D: zásah do trupu zraní, zásah do hlavy obyčajného vojaka zabije; hrdina dostane do hlavy viac; tupá zbraň omráči', run('torsoOk && headOk && dH > dT * 1.5 && koOk'), run('[torsoOk, headOk, dT, dH, koOk].join(" ")'));
    run(`var e4 = fq.filter(u => !heavy(u))[2] || fq[3]; e4.x = h.x + 14; e4.y = h.y; e4.stun = 0; e4.hp = e4.mh = 999; ptr.x = e4.x - bc.x; ptr.y = e4.y - bc.y; CMB.aim3 = null; CMB.kick = 0; CMB.st = 100; keys.y = true; cmbHero(h, 1, null); keys.y = false; var kickOk = e4.stun > 20;
        e4.stun = 0; e4.lwd = "l"; CMB.swing = { t: 9, d: "l", k: "s", a: 0, r: 30 }; var hpC = h.hp; var chOk = meleeHit(e4, h, 30, "ai") === false && e4.stun > 20 && h.hp === hpC; CMB.swing = null;
        CMB.ammo0 = 10; CMB.ammo = 5; CMB.wpn = "m"; wpnSwitch(); var wOk = CMB.wpn === "r"; wpnSwitch(); wOk = wOk && CMB.wpn === "m";
        GA.length = 0; GA.push({ x: h.x + 3, y: h.y, k: "arrow" }); pickups(h); var pkOk = CMB.ammo === 6 && GA.length === 0;`);
    check('Kopnutie zapotáca, kryt útokom odrazí úder, koliesko mení zbraň, šípy sa zbierajú zo zeme', run('kickOk && chOk && wOk && pkOk'), run('[kickOk, chOk, wOk, pkOk].join(" ")'));
    run(`for (const u of U) if (u.t) u.hp = 0; var kw = 0; while (mode === "battle" && kw < 60) { U[0].hp = 999; updBattle(1); kw++; }`);
    run(closeMenus + '; mode = "map"; ov.classList.add("hide"); for (const k in keys) keys[k] = false;');
    run(`G.eq.m = 2; G.own.m = [0, 2]; G.eq.r = 3; G.own.r = [0, 3]; startBattle({ n: 6, f: 7, nm: "T" }); var h = U[0]; CMB.mvA = 0; CMB.mvS = 0; var x0 = h.x; horseMove(h, 1, 0, 1, 1); var step1 = h.x - x0; for (let i = 0; i < 60; i++) horseMove(h, 1, 0, 1, 1); var x1 = h.x; horseMove(h, 1, 0, 1, 1); var stepN = h.x - x1; var horseOk = step1 < stepN * .5 && stepN > 0;
        G.eq.m = 0; CMB.bowC = 30; cmbHero(h, 1, 0); var b1 = CMB.bowC; cmbHero(h, 1, null); var xbOk = b1 === 30 && CMB.bowC < 30;
        var ha = mk(1, "uN3"); ha.x = 600; ha.y = 400; U.push(ha); var tgtU = U[0]; tgtU.x = 600; tgtU.y = 500; ha.c = 0; AR.length = 0; for (let i = 0; i < 90; i++) haAI(ha, tgtU, Math.hypot(tgtU.x - ha.x, tgtU.y - ha.y), 1); var haOk = isHA(ha) && AR.some(a => a.by === ha);
        CMB.rear = 0; CMB.mvA = 0; CMB.mvS = 0; h.x = 500; h.y = 400; for (let i = 0; i < 60; i++) horseDrive(h, 1, 0, 1); var dvFwd = h.x > 520 && Math.abs(h.y - 400) < .01;   // W: kôň ide rovno dopredu
        var yb = h.y; for (let i = 0; i < 20; i++) horseDrive(h, 1, 1, 1); var dvTurn = CMB.mvA > .3 && CMB.mvA < 1.6 && h.y > yb;   // D: otáča sa doprava oblúkom, nie bokom
        for (let i = 0; i < 200; i++) horseDrive(h, -1, 0, 1); var dvBack = CMB.mvS < 0 && CMB.mvS >= -.22 * h.sp - 1e-9;   // S: zabrzdí a pomaly cúva
        var hc = mk(1, Object.keys(FU).find(k => FU[k].b === "c" && FU[k].wp !== "bow") || "uN3"); hc.f = hc.hd = 0; hc.x = 700; hc.y = 400; var cx0 = hc.x, cy0 = hc.y; hc.y += 3; horseAI(hc, cx0, cy0, 1); var aiSide = Math.abs(hc.y - cy0) < 1 && hc.x > cx0;   // AI kôň nejde bokom
        var horseDrv = dvFwd && dvTurn && dvBack && aiSide;
        for (const u of U) if (u.t) u.hp = 0; var kh = 0; while (mode === "battle" && kh < 60) { U[0].hp = 999; updBattle(1); kh++; } G.eq.r = 0; G.eq.m = 0;`);
    check('Kôň má zotrvačnosť, kuša sa nabíja len postojačky, jazdecký lukostrelec strieľa; kôň ako vo Warbande (W/S plyn, A/D otáčanie, nejde bokom)', run('horseOk && xbOk && haOk && horseDrv'), run('[horseOk, xbOk, haOk, dvFwd, dvTurn, dvBack, aiSide].join(" ")'));
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    // verzia 44: veľké bitky, meniace sa počasie, spätný ráz zbrane od krytu, krv predvolene vypnutá
    run(`var bs0 = OPT.bsize; G.inf = 300; G.cav = 0; G.arc = 0; G.vet = 0; G.elf = 0; G.roh = 0; OPT.bsize = "n"; startBattle({ n: 300, f: 2, nm: "T" }); var nN = U.filter(u => !u.t && !u.h).length; for (const u of U) if (u.t) u.hp = 0; var kb = 0; while (mode === "battle" && kb < 60) { U[0].hp = 999; updBattle(1); kb++; }`);
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
    run(`OPT.bsize = "o"; startBattle({ n: 300, f: 2, nm: "T" }); var nO = U.filter(u => !u.t && !u.h).length, nAll = U.length;
        var t0 = Date.now(); for (let i = 0; i < 20; i++) updBattle(1); var msO = (Date.now() - t0) / 20;
        BI = "g"; WX.n = "clear"; WX.r = 190; WX.k0 = null; var R1 = Math.random; Math.random = () => .1; for (let i = 0; i < 6000 && WX.n === "clear"; i++) wxTick(1); Math.random = R1; var wxOk = WX.n === "rain" && WX.r < 190;
        FX3.length = 0; var ca = U.find(u => u.t && u.hp > 0 && !heavy(u)), cd = U.find(u => !u.t && !u.h && u.hp > 0 && u.k === 'a') || U.find(u => !u.t && !u.h && u.hp > 0); cd.hp = cd.mh = 999; meleeHit(ca, cd, 10, "charge"); var chOk2 = FX3.some(e => e.k === 'charge' && e.u === cd);
        var a1 = U.find(u => u.t && u.hp > 0 && !heavy(u)), d1 = U.find(u => !u.t && !u.h && u.hp > 0); a1.rc = 0; Math.random = () => 0; var blocked = meleeHit(a1, d1, 5, "ai") === false; Math.random = R1; var rcOk = blocked && a1.rc > 0;
        for (const u of U) if (u.t) u.hp = 0; var kb2 = 0; while (mode === "battle" && kb2 < 60) { U[0].hp = 999; updBattle(1); kb2++; } OPT.bsize = bs0; G.inf = 20;`);
    check('Veľké bitky: obrovská bitka postaví 5× viac vojakov (500+ spolu) a simulácia ostane rýchla; počasie sa mení počas bitky; zbraň odskočí od krytu; krv predvolene vypnutá',
        run('nO >= nN * 4 && nAll >= 500 && msO < 120 && wxOk && rcOk && chOk2 && OPT.blood === false'), run('[nN, nO, nAll, msO, wxOk, rcOk, chOk2, OPT.blood].join(" ")'));
    run(closeMenus + '; mode = "map"; ov.classList.add("hide");');
} catch (e) { fails++; console.log('CHYBA výnimka: ' + e.stack); }
console.log(fails ? '\n' + fails + ' testov zlyhalo.' : '\nVšetky testy prešli.');
process.exit(fails ? 1 : 0);
