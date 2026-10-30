/*
 * Automatický test simulácie bez prehliadača.
 * Spustenie: node tests/sim.test.js
 * Načíta všetky skripty hry s náhradným plátnom a DOM, odohrá desiatky dní
 * a skontroluje, že sa nič nepokazilo (žiadne chyby, NaN ani zaseknuté bitky).
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const scripts = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);

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
    check('Strážca léna ostáva pri svojom hrade', run('!gd || gd.dead || gd.home !== gh || Math.hypot(gd.x - TW[gh].x, gd.y - TW[gh].y) < 60 * K'));
    check('Dediny majú jedinečné mená podľa kraja', run('new Set(VL.map(v => v.n)).size === VL.length && VL.length >= 90'));
    check('Väčší svet a polohy podľa mierky', run('K > 6 && WW === 1800 * K && TW.every(t => t.x <= WW && t.y <= WH) && regionAt(10, 10) === "s"'));
    check('Ikony rozhrania k tlačidlám a lište', run('Icons.forButton("Denník") === "diary" && Icons.forHud("Zdravie 10/10") === "heart" && Icons.forHud("Zlato 5") === "coins" && Icons.forDialog("Späť") === "back" && Icons.has("mug")'));
    run(closeMenus + '; mode = "map"; save(2); var d2 = G.day; G.day = 999; load(2);');
    check('Uloženie do pozície 2 a načítanie', run('G.day === d2 && slotInfo(2) && slotInfo(2).includes("deň " + d2) && G.comp.includes("aragorn")'));
    run('G.king = 0; delete G.side; startGear(1);');
    check('Hrdina zla začína s orkskou výbavou', run('it("w").n === "Orkský nôž" && it("a").n === "Orkské kože" && it("h").n === "Orkská kukla" && G.own.w.length === 1'));
    check('Základná výbava sa nepredáva', run('smithy(gi, "w"); !document.getElementById("bt").children.some(b => /Železný meč|Orkský nôž/.test(b.textContent))'));
} catch (e) { fails++; console.log('CHYBA výnimka: ' + e.stack); }
console.log(fails ? '\n' + fails + ' testov zlyhalo.' : '\nVšetky testy prešli.');
process.exit(fails ? 1 : 0);
