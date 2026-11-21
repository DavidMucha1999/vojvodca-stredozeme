/*
 * Boj ako v Mount & Blade: Warband (update „Ostrie“). Napája sa na bitku v js/sim/battle.js.
 *
 * Hrdina (klávesnica a myš): WASD alebo šípky pohyb, myš mieri (hrdina sa natáča k nej),
 *   ľavé tlačidlo alebo medzerník = SEK (oblúk pred hrdinom, zasiahne až troch), E = BOD (úzky, dlhší dosah, silnejší),
 *   pravé tlačidlo alebo Shift = KRYT (so štítom široký, bez štítu len zbraňou spredu; kryt tesne pred úderom = dokonalý kryt, útočník sa zapotáca),
 *   Q = výstrel z luku (ak má hrdina lukostreľbu alebo je elf; ide aj z koňa), V = bojový pokrik (morálka).
 *   Na koni: rovný cval dlhšie ako ~0,7 s = NÁPOR – prvý nepriateľ v ceste dostane veľký zásah a odletí (kopija ešte viac).
 *   Na dotykovej obrazovke ostáva pôvodné ovládanie (drž prst, kam bežať; hrdina útočí sám).
 * Nepriatelia: pred úderom sa napriahnu (červený oblúk), pešiaci so štítom kryjú údery a šípy spredu;
 *   úder zboku +25 %, zozadu +50 %. Jazda v plnom cvale narazí s dvojnásobnou silou.
 * Výdrž: útok aj kryt ju míňajú; pri nízkej výdrži sú údery pomalšie a prelomený kryt na chvíľu nejde.
 * Morálka: každá strana má morálku 0–100 (pomer síl, úroveň a sláva hrdinu, strach z hrdinu u nepriateľa).
 *   Padlí, padlý veliteľ (zlatý kruh) a útek ju znižujú; pod 35 začnú vojaci utekať z bojiska, pod 10 utečú všetci.
 *   Utečenci prežijú (nepočítajú sa medzi padlých); keď už všetci nepriatelia utekajú, bitka je vyhraná.
 *   Trollovia, olifanty, enti, Nazgûl, hrdina a spoločníci neutekajú.
 * Skupiny a rozkazy: 1 Všetci, 2 Pechota, 3 Lukostrelci, 4 Jazda; T Útok, H Držať (na mieste), F Za mnou, G Šík (línia čelom k nepriateľovi), R Ústup.
 */
/** Nastavenia hráča (Hlavné menu → Nastavenia): krv v bitke. */
const OPT = (() => { const d = { blood: false, blkDir: 'manual' }; /* kryt do smeru myšou ako vo Warbande (automatický sa dá zapnúť v Nastaveniach) */ try { return Object.assign(d, JSON.parse(localStorage.getItem('vsOpt') || '{}')); } catch (e) { return d; } })();
if (!OPT.v44) { OPT.blood = false; OPT.v44 = 1; }   // verzia 44: krv na obrazovke predvolene vypnutá (dá sa zapnúť v Nastaveniach)
const saveOpt = () => { try { localStorage.setItem('vsOpt', JSON.stringify(OPT)); } catch (e) { } };
/** Udalosti pre 3D efekty (kamene, olej, zásahy bossov); B3 ich spotrebuje, bez 3D sa len zahodia. */
let FX3 = [];
const fx3 = o => { if (FX3.length < 60) FX3.push(o); };
const CMB = { km: 0, blk: 0, blkT: 99, gb: 0, st: 100, shp: 0, shMax: 0, run: 0, lastA: null, chg: 0, charging: 0, ammo: 0, ammo0: 0, bowC: 0, cry: 0, swing: null,
    sel: 'all', og: { p: 'a', l: 'a', j: 'a' }, M: [60, 60], M0: [60, 60], n0: [1, 1], endT: 0, noRout: 0, lmb: 0, rmb: 0, said: {} };
/** Klávesy akcií (dajú sa zmeniť v Nastaveniach → Ovládanie; OPT.keys) a stav ovládača (GP, js/sim/combat.js pollPad). */
const KEYS_DEF = { atk: ' ', thrust: 'e', block: 'Shift', shoot: 'q', cry: 'v', wall: 'b', fm: 'x', kick: 'y', cam: 'Tab', o_a: 't', o_h: 'h', o_f: 'f', o_l: 'g', o_r: 'r', o_adv: 'c', o_bk: 'z', o_hf: 'j' };
const KEY_N = { atk: 'Sek (útok)', thrust: 'Bod', block: 'Kryt', shoot: 'Výstrel / hod', cry: 'Bojový pokrik', wall: 'Na hradbách: rebrík, olej, kameň', fm: 'Útvar (riadky, štítový val, voľný)', kick: 'Kopnutie', cam: 'Kamera: prvá / tretia osoba (3D)', o_a: 'Rozkaz Útok', o_h: 'Rozkaz Držať', o_f: 'Rozkaz Za mnou', o_l: 'Rozkaz Šík', o_r: 'Rozkaz Ústup', o_adv: 'Rozkaz Vpred (10 krokov)', o_bk: 'Rozkaz Vzad (10 krokov)', o_hf: 'Lukostrelci: palba na povel / držať palbu' };
const KB = () => Object.assign({}, KEYS_DEF, (typeof OPT !== 'undefined' && OPT.keys) || {});
let GP = null;
const kd = a => !!keys[KB()[a]] || !!(GP && GP[a]);
const keyName = k => k === ' ' ? 'Medzerník' : k === 'Shift' ? 'Shift' : k === 'Control' ? 'Ctrl' : k === 'Alt' ? 'Alt' : String(k || '?').length === 1 ? String(k).toUpperCase() : k;
let CAPTURE = null;   // čaká sa na nový kláves pre akciu (Nastavenia → Ovládanie)
/** Ovládač (gamepad): ľavá páčka pohyb, pravá mierenie, A/RT sek, X bod, RB/LT kryt, Y výstrel, B pokrik, LB hradby;
 *  šípky na kríži rozkazy (hore Útok, dole Ústup, vľavo Držať, vpravo Šík), Select Za mnou, Start ďalšia skupina. Na mape ľavá páčka vedie družinu. */
let padPrev = {};
function pollPad() {
    const ps = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : null, p = ps && [...ps].find(Boolean);
    if (!p) { GP = null; return; }
    const ax = i => Math.abs(p.axes[i] || 0) > .2 ? p.axes[i] : 0, b = i => !!(p.buttons[i] && p.buttons[i].pressed), edge = i => b(i) && !padPrev[i];
    GP = { mx: ax(0), my: ax(1), ax: ax(2), ay: ax(3), atk: b(0) || b(7), cry: b(1), thrust: b(2), shoot: b(3), wall: b(4), block: b(5) || b(6) };
    if (mode === 'battle' && typeof setOrd === 'function') {
        if (edge(12)) setOrd('a'); if (edge(13)) setOrd('r'); if (edge(14)) setOrd('h'); if (edge(15)) setOrd('l'); if (edge(8)) setOrd('f');
        if (edge(9)) selGroup({ all: 'p', p: 'l', l: 'j', j: 'all' }[CMB.sel] || 'all');
    }
    padPrev = {}; p.buttons.forEach((x, i) => { padPrev[i] = x.pressed; });
}
const heroMounted = () => !!(G && G.eq.m > 0 && !(U && U[0] && U[0].dis));
const rangedW = () => (G && G.eq.r > 0 ? it('r') : null);
const GRP_N = { all: 'Všetci', p: 'Pechota', l: 'Lukostrelci', j: 'Jazda' };
const ORD_KEYS = { t: 'a', h: 'h', f: 'f', g: 'l', r: 'r' };
/** Uhol medzi dvoma smermi (0 až π). */
const angD = (a, b) => { let d = Math.abs(a - b) % 6.2832; return d > Math.PI ? 6.2832 - d : d; };
const dirTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
/** Skupina vojaka: pechota, lukostrelci, jazda. */
const grpOf = u => u.k === 'a' || u.k === 'e' ? 'l' : u.k === 'c' || u.k === 'r' || u.k === 'w' || u.k === 'x' ? 'j' : 'p';
const mounted = u => u.k === 'c' || u.k === 'r' || u.k === 'w';
const heavy = u => u.k === 't' || u.k === 'x' || u.k === 'n' || u.k === 'z' || u.uk === 'uM2';
const fearless = u => !!(u.h || u.cp || heavy(u) || u.k === 'fx');
/** Padol v boji (nie utiekol). */
const fallen = u => u.hp <= 0 && !u.fled;
const heroShield = () => !!(G && G.eq.s > 0 && it('s').v > 0 && !twoHand());
/** Šanca, že vojak kryje úder spredu (štít, výcvik). */
function blockChance(u) {
    if (u.h || u.rout || u.stun > 0 || u.wu > 0 || u.as) return 0;
    if (!u.t && u.hx != null && fmOf(u) === 'wall' && grpOf(u) === 'p') return Math.min(.8, blockChance0(u) * 1.6 + .15);   // štítový val
    return blockChance0(u);
}
/** Súdržnosť línie 0 – 1: pešiak so štítom, vedľa ktorého stoja (do ~26) spolubojovníci s podobným smerom pohľadu, sa kryje štítmi o rameno
 *  (až 3 susedia = plná línia). Štítový val ju zosilní. Spredu údery slabnú a lepšie sa kryjú, zboku a zozadu ho línia nechráni a pád susedov ju rozbije. */
function cohesion(u) {
    if (u.h || u.rout || u.stun > 0 || !(blockChance0(u) > 0)) return 0;
    let n = 0;
    for (const v of U) if (v !== u && v.t === u.t && v.hp > 0 && !v.fled && !v.h && !v.rout && Math.abs(v.x - u.x) < 26 && Math.abs(v.y - u.y) < 26 && Math.hypot(v.x - u.x, v.y - u.y) < 26 && angD(u.f, v.f) < .8 && blockChance0(v) > 0) n++;
    const wall = !u.t && u.hx != null && fmOf(u) === 'wall';
    return Math.min(1, n / 3 * (wall ? 1.5 : 1));
}
function blockChance0(u) {
    if (u.cp) return .4;
    if (u.uk && FU[u.uk] && FU[u.uk].b) { const F = FU[u.uk]; return F.b === 'i' && F.wp !== 'ax' ? .35 : F.b === 'c' ? .2 : 0; }
    return { i: .3, v: .4, o: .15, c: .2, r: .25 }[u.k] || 0;
}
const cmbSay = (id, s, l = 180) => { if (CMB.said[id]) return; CMB.said[id] = 1; TS = { s, l }; };

/** Začiatok bitky: morálka podľa síl, veliteľ nepriateľa, výdrž, štít a šípy hrdinu. */
function cmbStart(en) {
    const C = CMB;
    Object.assign(C, { hf: false, lanceN: 0, lanceBr: 0, blk: 0, blkT: 99, gb: 0, st: 100, run: 0, lastA: null, chg: 0, charging: 0, bowC: 0, cry: 0, swing: null, rd: null, draw: 0, aim: null, couch: 0, wpn: 'm', msgs: [], kick: 0, kickT: 0, rear: 0, mvA: null, mvS: 0, aim3: null, fm: { p: 'line', l: 'line', j: 'line' }, at: {}, place: null, prev: null, mkT: 0, hist: [], bd: 't', mdx: 0, mdy: 0, px: null, py: null, vx: 0, vy: 0, sel: 'all', endT: 0, lmb: 0, rmb: 0, said: {}, noRout: en && en.ar ? 1 : 0, rip: 0, chT: 0, chN: 0 });
    for (const k of Object.keys(C)) if (/^(hd|hw|tut)\d+$/.test(k)) delete C[k];   // príznaky správ a vĺn z predošlej bitky (js/sim/tactics.js)
    const mine = U.filter(u => !u.t), foe = U.filter(u => u.t), pw = s => s.reduce((a, u) => a + u.mh * (u.d || 5), 0) + 1, r = pw(mine) / pw(foe);
    const cl = v => Math.max(-18, Math.min(18, v));
    const m0 = 62 + cl((r - 1) * 12) + Math.min(12, G.lv || 1) + (G.king ? 5 : 0) + Math.min(6, (G.ren || 0) / 3) + ((G.pm ?? 60) - 50) * .3 + (perk('vodca') ? 8 : 0) + (hasRole('velitel') ? 6 : 0);   // morálka družiny, Charizma, spoločník veliteľ
    const m1 = 62 + cl((1 / r - 1) * 12) - Math.min(15, (G.fear || 0) * 1.2) + (en && en.nz ? 40 : 0) + (en && en.siege ? 10 : 0);
    C.M = [Math.min(95, m0), Math.max(25, Math.min(95, m1 - (relic('fell') ? 8 : 0)))];
    if (G.duel && en && en.id === G.duel.id && !en.duel) { if (G.duel.win) C.M[1] = Math.max(10, C.M[1] - 30); else C.M[0] = Math.max(10, C.M[0] - 25); G.duel = null; }   // výsledok súboja veliteľov
    C.M0 = C.M.slice(); C.n0 = [mine.length, foe.length];
    C.fc = [mine.filter(u => !u.h && !u.ally && !u.src && !u.garrison && !u.cp).length, foe.filter(u => !u.src && !u.boss).length];   // vlastné vojsko strán na bojisku (limit pre posily)
    C.down = 0; C.camU = null; C.rfT = 0; C.endT0 = 0;
    wpInit(); C.horseLow = 0;
    C.shMax = heroShield() ? Math.round((70 + it('s').v * 500) * (perk('stit') ? 1.6 : 1) * (1 + .1 * csLv('sh'))) : 0;   // schopnosť Štít C.shp = C.shMax;
    const RW = rangedW();   // strelná výbava (luk, kuša, oštepy), inak lovecký luk podľa lukostreľby
    C.ammo = C.ammo0 = RW ? RW.ammo + G.s.ls * 2 + (perk('konilu') ? 6 : 0) : G.s.ls >= 1 || G.race === 'elf' || perk('konilu') ? 6 + 4 * G.s.ls + (G.race === 'elf' ? 4 : 0) + (perk('konilu') ? 6 : 0) : 0;
    C.horse = C.horse0 = heroMounted() ? Math.round((70 + it('m').v * 25) * (1 + .1 * csLv('ri'))) : 0;   // zdravie koňa hrdinu
    const o0 = G.ord0 || 'a'; C.og = { p: o0, l: o0, j: o0 }; FX3 = []; GA = []; HITSTOP = 0;
    // veliteľ nepriateľa: najsilnejší vojak hlavnej armády nesie zástavu; jeho pád zlomí morálku
    if (en && en.nm && !en.ar && !en.nz) { const c = foe.filter(u => !u.src && !heavy(u)).sort((a, b) => b.mh - a.mh)[0]; if (c) { c.cmd = 1; c.bn = 1; c.hp = c.mh = c.mh * 1.6; c.d *= 1.2; } }
    { const L = heroLoad(); if (L > .3) wbMsg('Ťažká výbava: pešo si o ' + Math.round((1 - loadSpeed()) * 100) + ' % pomalší, údery o ' + Math.round((loadSwing() - 1) * 100) + ' % pomalšie.', '#e0c080'); }
    if (G && !G.cmbTip) { G.cmbTip = 1; const K = KB(), n = a => keyName(K[a]); TS = { s: 'Klik zamkne myš · smer pohybom myši · drž ľavé a pusť = úder · pravé = kryt · koliesko = zbraň · ' + n('kick') + ' kop · ' + n('cam') + ' 1./3. osoba', l: 720 }; }
}

/** Hrdina: mierenie, kryt, výdrž, sek a bod, luk, pokrik, nápor na koni. mv = smer pohybu (alebo null). */
function cmbHero(u, dt, mv) {
    const C = CMB;
    if (C.km && C.aim3) u.f = C.aim3.yaw;   // mierenie ako vo Warbande: hrdina hľadí smerom kamery
    else if (C.km && (!ptr.down || C.lmb)) { const ax = ptr.x + bc.x - u.x, ay = ptr.y + bc.y - u.y; if (Math.hypot(ax, ay) > 8) u.f = Math.atan2(ay, ax); }
    if (C.gb > 0) C.gb -= dt;
    if (C.mkT > 0) C.mkT -= dt;
    placeTick();
    if (GP && Math.hypot(GP.ax, GP.ay) > .35) { u.f = Math.atan2(GP.ay, GP.ax); C.km = 1; }   // pravá páčka ovládača mieri
    if (OPT.noStam !== false) C.st = 100;   // boj ako vo Warbande: bez výdrže (kryt obmedzuje len štít a načasovanie)
    const want = !!(kd('block') || C.rmb) && C.gb <= 0 && C.st > 2;
    if (want && !C.blk) C.blkT = 0;
    C.blk = want ? 1 : 0;
    C.blkT += dt;
    C.st = Math.min(100, C.st + dt * (C.blk ? .1 : mv != null && !G.eq.m ? .22 : .38) * (perk('neunavny') ? 1.4 : 1));
    const cost = perk('neunavny') ? .75 : 1;   // perk Neúnavný
    const RW0 = rangedW(), xb = RW0 && RW0.rt === 'xbow';
    if (C.bowC > 0) { if (xb && (mv != null || heroMounted())) { if (C.bowC < (RW0.cd || 60) - 2) cmbSay('xbreload', 'Kušu nabíjaš len postojačky – zastav sa.', 140); } else C.bowC -= dt; }   // kuša sa nabíja len postojačky
    if (C.kick > 0) C.kick -= dt; if (C.kickT > 0) C.kickT -= dt;
    if (C.rip > 0) C.rip -= dt; if (C.chT > 0 && (C.chT -= dt) <= 0) C.chN = 0;   // okno riposty po dokonalom kryte; séria úderov sa po pauze obnoví
    heroKick(u); pickups(u);
    if (C.wpn === 'r' && !C.ammo) { C.wpn = 'm'; wbMsg('Došli strely – zbraň na blízko.', '#ff9a80'); }
    if (C.cry > 0) C.cry -= dt;
    if (C.swing && (C.swing.t -= dt) <= 0) C.swing = null;
    const slow = C.st < 15 ? 1.6 : 1, rg = it('w').r || 34;
    // nápor na koni: rovný cval bez zmeny smeru
    if (C.chg > 0) C.chg -= dt;
    if (heroMounted() && mv != null) { C.run = C.lastA != null && angD(mv, C.lastA) < .22 ? C.run + dt : Math.max(0, C.run - 14); C.lastA = mv; }
    else { C.run = 0; C.lastA = null; }
    C.charging = C.run > (perk('kopija') ? 28 : 40) && C.chg <= 0 ? 1 : 0;
    if (C.charging) {
        const hits = U.filter(v => v.t && v.hp > 0 && Math.hypot(v.x - u.x, v.y - u.y) < u.r + v.r + 10 && angD(mv, dirTo(u, v)) < .8).slice(0, 2);
        if (hits.length) {
            const lance = it('w').r ? 1 : 0, spd = Math.min(1.5, u.sp / 1.7) * (perk('kopija') ? 1.4 : 1);
            hits.forEach(v => { if (meleeHit(u, v, heroMeleeDmg() * (1.6 + lance) * spd, 'charge') && v.hp > 0) { v.x += Math.cos(mv) * 16; v.y += Math.sin(mv) * 16; v.stun = 25; } });
            SHAKE = Math.max(SHAKE, 2.5); C.run = 0; C.chg = 40; C.swing = { t: 12, a: mv, k: 'c', r: u.r + 22 };
            cmbSay('chg', 'Nápor! Rovný cval na koni drví nepriateľov – s kopijou ešte viac.');
        }
    }
    horseBump(u);   // náraz koňa do pešiakov v ceste (js/sim/mastery.js)
    // pohyb hrdinu (rýchlosť sa pripočíta k úderu, ako vo Warbande)
    C.vx = C.px != null ? (u.x - C.px) / Math.max(.3, dt) : 0; C.vy = C.py != null ? (u.y - C.py) / Math.max(.3, dt) : 0; C.px = u.x; C.py = u.y;
    const dk = Math.pow(.8, dt); C.mdx = (C.mdx || 0) * dk; C.mdy = (C.mdy || 0) * dk;
    if (C.blk && OPT.blkDir === 'manual') { const d = mouseDir(); if (d) C.bd = d; }
    if (C.km) heroDirectional(u, dt, mv, slow, cost, rg);
    // útok: sek alebo bod (dotyková obrazovka: hrdina útočí sám)
    else if (u.c <= 0 && !C.blk) {
        const near = U.some(v => v.t && v.hp > 0 && Math.hypot(v.x - u.x, v.y - u.y) < rg);
        if (kd('thrust')) {
            const tg = U.filter(v => v.t && v.hp > 0 && Math.hypot(v.x - u.x, v.y - u.y) < rg * 1.35 + v.r * .5 && !wallBlocked(u, v)).sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y))[0];
            if (tg) { u.f = dirTo(u, tg); meleeHit(u, tg, heroMeleeDmg() * 1.35, 'thrust'); }
            u.c = 18 * slow; C.st -= 7 * cost; fx = 6; C.swing = { t: 8, a: u.f, k: 't', d: 't', r: rg * 1.35 };
        } else if (kd('atk') || C.lmb || (ptr.down && near)) {
            const t2 = twoHand(), arc = t2 ? 1.3 : 1.05;   // obojručná zbraň: širší sek, viac zasiahnutých, pomalšia
            const tg = U.filter(v => v.t && v.hp > 0 && Math.hypot(v.x - u.x, v.y - u.y) < rg + v.r * .5 && !wallBlocked(u, v)).sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y));
            tg.forEach((v, i) => meleeHit(u, v, heroMeleeDmg() * (t2 ? 1.1 : 1) * (i ? .75 : 1), 'swing'));
            u.c = (t2 ? 27 : 22) * slow; C.st -= (t2 ? 13 : 10) * cost; fx = 10; C.swing = { t: 10, a: u.f, k: 's', d: 'r', r: rg, w: arc };
            if (t2) cmbSay('t2', 'Obojručná zbraň: široký sek, ale bez štítu.');
        }
        if (C.st < 0) C.st = 0;
    }
    // strelná zbraň: s myšou sa luk napína držaním klávesu a pustením vystrelí (zameriavač, dolet po bod pod kurzorom); kuša strieľa hneď
    const RW = rangedW(), rt = RW ? RW.rt : 'bow';
    C.aim = null;
    const shootKey = kd('shoot') || (C.wpn === 'r' && (kd('atk') || C.lmb));
    if (C.km && rt !== 'xbow') {
        if (shootKey && C.ammo > 0 && C.bowC <= 0 && !C.blk) {
            C.draw = (C.draw || 0) + dt;
            C.aim = aimInfo(u, mv, rt);
        } else if (C.draw > 0) {
            if (C.draw >= (rt === 'jav' ? 6 : 8)) heroShoot(u, mv, RW, rt); else C.draw = 0;
        }
    } else if (shootKey && C.ammo > 0 && C.bowC <= 0 && !C.blk) {
        if (RW && RW.rt === 'xbow' && heroMounted()) cmbSay('xbow', 'Kušu na koni nenabiješ – zosadni, alebo použi luk či oštepy.');
        else { if (!C.km) { const t = U.filter(v => v.t && v.hp > 0).sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y))[0]; if (t) u.f = dirTo(u, t); } C.draw = 30; heroShoot(u, mv, RW, rt); }
    }
    // bojový pokrik: morálka tvojej strany hore, utekajúci sa vrátia
    wallAction(u);   // na hradbách: zhodiť rebrík, vriaci olej, kameň
    if (kd('cry') && C.cry <= 0 && C.st > 20) {
        C.cry = 900; C.st -= 20; C.M[0] = Math.min(100, C.M[0] + 14); C.M[1] = Math.max(0, C.M[1] - 4);
        for (const v of U) if (!v.t && v.rout && !v.fled && Math.hypot(v.x - u.x, v.y - u.y) < 240) v.rout = 0;
        PT.push({ x: u.x, y: u.y, ring: 1, rr: 60, l: 22, c: '#ffd24a' });
        snd('horn'); TS = { s: 'Bojový pokrik! Tvoji muži sa vzchopili.', l: 120 };
    }
}

/** Smer z pohybu myši za posledné chvíle (ako vo Warbande): hore = úder zhora, dole = bod, vľavo/vpravo = sek z danej strany. */
function mouseDir() {
    const C = CMB, x = C.mdx || 0, y = C.mdy || 0;
    if (Math.hypot(x, y) < 5) return null;
    return Math.abs(y) > Math.abs(x) * 1.15 ? (y < 0 ? 'u' : 't') : x < 0 ? 'l' : 'r';
}
const DIR_N = { l: 'zľava', r: 'sprava', u: 'zhora', t: 'bod' };
/** Vlastnosti zbrane: čas nápriahu, zotavenie, dosah. */
function wpnTimes() {
    const W = it('w') || {}, t2 = twoHand(), spear = !!W.r, S = wstat(W), L = loadSwing();   // ťažká výbava spomalí nápriah aj zotavenie
    const P = wpTimeK();   // zdatnosť so zbraňou zrýchli nápriah aj zotavenie (js/sim/mastery.js)
    return { ready: (t2 ? 24 : spear ? 20 : 17) / S.sp * L * P, rec: (t2 ? 36 : 27) / S.sp * L * P,   // tempo ako vo Warbande: nápriah asi pol sekundy, potom zotavenie
        spear, t2, S, reach: W.r || 34 * S.len, kind: wkind(W) };
}
/** Hrdina s myšou: nápriah do smeru (drž tlačidlo = silnejší úder, kryt počas nápriahu = klam), sklopená kopija v cvale. */
function heroDirectional(u, dt, mv, slow, cost, rg) {
    const C = CMB, WT = wpnTimes();
    if (C.sw) swingTick(u, dt, WT);   // čepeľ práve letí: zasiahne to, cez čo prejde
    // sklopená kopija: kopija + rovný cval + drž bod (E) → každý v ceste dostane zásah podľa rýchlosti koňa
    const spd = Math.hypot(C.vx || 0, C.vy || 0);
    if (C.lanceBr > 0) { C.lanceBr -= dt; if (C.lanceBr <= 0) { C.lanceN = 0; wbMsg('Máš novú kopiju.', '#e8d8a8'); } }
    if (heroMounted() && WT.spear && !(C.lanceBr > 0) && kd('thrust') && C.run > 18 && spd > (u.bs || u.sp) * .55) {
        if (!C.couch) { C.couch = 1; C.rd = null; cmbSay('couch', 'Sklopená kopija! Drž bod (E) v rovnom cvale – kto stojí v ceste, ten padne.'); }
        const a = Math.atan2(C.vy, C.vx);
        for (const v of U) if (v.t && v.hp > 0 && !(v.couchT > 0) && Math.hypot(v.x - u.x, v.y - u.y) < WT.reach * 1.2 + v.r && angD(a, dirTo(u, v)) < .3 && !wallBlocked(u, v)) {
            v.couchT = 50;
            if (meleeHit(u, v, heroMeleeDmg() * (2 + spd / (u.bs || u.sp) * 1.2) * (perk('kopija') ? 1.3 : 1), 'charge') && v.hp > 0) { v.x += Math.cos(a) * 18; v.y += Math.sin(a) * 18; v.stun = 30; }
            SHAKE = Math.max(SHAKE, 2); C.swing = { t: 10, a, k: 't', d: 't', r: WT.reach * 1.2 };
            C.lanceN = (C.lanceN || 0) + 1;
            if (C.lanceN >= 4) { C.lanceBr = 420; C.couch = 0; wbMsg('Kopija sa zlomila! Dočasne bojuj inak.', '#e0a070'); break; }
        }
        for (const v of U) if (v.couchT > 0) v.couchT -= dt;
        return;
    }
    C.couch = 0;
    if (C.wpn === 'r') { C.rd = null; return; }   // v ruke je strelná zbraň (ľavé tlačidlo strieľa)
    if (C.rd) {
        const R = C.rd; R.t += dt;
        if (C.blk) { C.rd = null; C.st = Math.max(0, C.st - 3); cmbSay('feint', 'Klam: kryt počas nápriahu zruší úder.', 120); return; }
        if (R.key === 'atk' && !WT.spear && !R.rel) {   // smer sa určuje do uvoľnenia (ako vo Warbande): pohyb myšou počas nápriahu ho zmení, zručný vojak to ale vidí
            const nd = mouseDir();
            if (nd && nd !== R.d) { R.d = nd; R.dh.push([R.t, nd]); if (R.t > R.ready * .6) cmbSay('rdir', 'Zmena smeru počas nápriahu – kto ťa čítal podľa predošlého smeru, skryje sa zle.', 200); }
        }
        if (!(R.key === 'thrust' ? kd('thrust') : kd('atk') || C.lmb)) R.rel = 1;
        if (R.t > 150) C.st = Math.max(0, C.st - .12 * dt);   // ruka sa unaví
        if (R.rel && R.t >= R.ready) heroStrike(u, R, slow, cost, rg);
        return;
    }
    if (u.c > 0 || C.blk) return;
    if (kd('thrust')) C.rd = { d: 't', t: 0, key: 'thrust', ready: WT.ready * slow, dh: [[0, 't']] };
    else if (kd('atk') || C.lmb) { let d = mouseDir() || (C.alt = C.alt === 'l' ? 'r' : 'l'); if (WT.spear) d = d === 'u' ? 'u' : 't'; C.rd = { d, t: 0, key: 'atk', ready: WT.ready * slow, dh: [[0, d]] }; }   // kopija ako vo Warbande: len bod zospodu a bod zhora (myš hore)
}
/** Úder do smeru (uvoľnenie nápriahu): sek zľava/sprava zasiahne viac nepriateľov v oblúku, úder zhora jedného silnejšie, bod má dlhší dosah.
 *  Zbraň sa potom pohybuje (swingTick): zasiahne len to, cez čo čepeľ prejde, a silnejšie uprostred seku a hrotom než pri rúčke.
 *  Sila: držaný nápriah až +45 %, pohyb proti nepriateľovi (najmä na koni) pridá, pohyb od neho uberie. */
function heroStrike(u, R, slow, cost, rg) {
    const C = CMB, WT = wpnTimes(), d = R.d, S = WT.S, held = Math.max(0, R.t - R.ready);
    let pow = 1 + .45 * Math.min(1, held / 30) * (R.t > 200 ? Math.max(0, 1 - (R.t - 200) / 120) : 1);
    // séria úderov unavuje (každý ďalší úder v rade: dlhšie zotavenie a väčšia spotreba výdrže), riposta po dokonalom kryte je rýchla a silnejšia
    const prior = C.chT > 0 ? C.chN || 0 : 0, tire = Math.min(4, prior), rip = C.rip > 0;
    if (rip) { pow *= 1.3; C.rip = 0; cmbSay('rip', 'Riposta! Úder hneď po dokonalom kryte je rýchlejší a silnejší.', 160); }
    else if (tire >= 2) cmbSay('tire', 'Séria úderov ťa unavuje – zotavenie je dlhšie. Po pauze alebo krytí sa obnovíš.', 220);
    C.chN = prior + 1; C.chT = 110;
    const a2 = WT.t2 ? 1.3 : 1.05, n2 = WT.t2 ? 4 : 3;
    const P = { u: WT.spear ? { arc: .42, n: 1, m: 1.25 * S.th, r: 1.4 } : { arc: .5, n: 1, m: 1.2 * S.sw, r: 1 }, l: { arc: a2, n: n2, m: S.sw, r: 1 }, r: { arc: a2, n: n2, m: S.sw, r: 1 }, t: { arc: .42, n: 1, m: 1.35 * S.th, r: WT.spear ? 1.5 : 1.35 } }[d];
    C.hist = (C.hist || []).concat(d).slice(-4);
    const reach = WT.reach * P.r;
    C.sw = { vis: R.t, dh: R.dh, d, t: 0, dur: (d === 't' ? 12 : WT.t2 ? 21 : 16) / S.sp * slow, P, pow, reach, hit: [], bl: 0, pitch: C.aim3 ? C.aim3.pitch : null };
    u.c = WT.rec * slow * (d === 't' ? .85 : 1) * (1 + .1 * tire) * (rip ? .7 : 1); C.st -= (d === 't' ? 7 : WT.t2 ? 13 : 10) * cost * (pow > 1.2 ? 1.2 : 1) * (1 + .12 * tire); if (C.st < 0) C.st = 0;
    fx = 10; C.swing = { t: 10, a: u.f, k: d === 't' ? 't' : 's', d, r: reach, w: P.arc, pow };
    C.rd = null;
    if (pow > 1.3) cmbSay('pow', 'Silný úder! Dlhšie držaný nápriah udrie tvrdšie – ale ruka sa unaví.', 150);
    if (WT.t2) cmbSay('t2', 'Obojručná zbraň: široký sek, ale bez štítu.');
    swingTick(u, 0, WT);
}
/** Čepeľ v pohybe: pozícia čepele (uhol, dosah) sa mení s časom seku; nepriateľ, cez ktorého prejde, dostane zásah (raz za sek).
 *  Rýchlosť čepele je najvyššia v strede seku a hrot udiera silnejšie než rúčka – preto záleží na vzdialenosti aj na načasovaní. */
function swingTick(u, dt, WT) {
    const C = CMB, s = C.sw; if (!s) return;
    s.t += dt; const p = Math.min(1, s.t / s.dur), P = s.P, d = s.d;
    const sa = v => { const x = dirTo(u, v) - u.f; return Math.atan2(Math.sin(x), Math.cos(x)); };
    const th = d === 'l' ? -P.arc + 2 * P.arc * p : d === 'r' ? P.arc - 2 * P.arc * p : 0;   // uhol čepele voči smeru pohľadu
    const stab = d === 't' || (WT.spear && d === 'u'), tip = s.reach * (stab ? Math.sin(Math.min(1, p * 1.6) * Math.PI / 2) : 1);   // bod: hrot sa vysúva
    const vel = stab ? .7 + .5 * Math.min(1, p * 1.6) : .7 + .5 * Math.sin(p * Math.PI);   // rýchlosť čepele (bod aj bod kopijou zhora rastie, sek je najrýchlejší v strede)
    for (const v of U) {
        if (v === u || v.hp <= 0 || s.hit.includes(v) || s.hit.length >= P.n || wallBlocked(u, v)) continue;
        const fr = !v.t;   // vlastný vojak: sek zboku sa o neho zarazí (swingBlocked), úder zhora a bod ho zasiahnu
        if (fr && (v.h || !ffOn() || (d !== 'u' && d !== 't'))) continue;
        const dist = Math.hypot(v.x - u.x, v.y - u.y), r = v.r || 6, ang = sa(v), wide = Math.atan2(r * .8, Math.max(8, dist));
        if (dist - r * .5 > tip) continue;
        if (d === 'l' || d === 'r') { if (Math.abs(ang - th) > .32 + wide || Math.abs(ang) > P.arc + wide) continue; }
        else { if (Math.abs(ang) > P.arc) continue; if (d === 'u' && p < .4) continue; }
        if (fr) { s.hit = new Array(99); hitZ(v, heroMeleeDmg() * P.m * s.pow * vel * .6, null, { zone: 'torso', type: dmgType(u, 'swing', d) }); wbMsg(v.hp > 0 ? 'Zasiahol si vlastného vojaka!' : 'Zabil si vlastného vojaka!', '#ff9a80'); C.M[0] = Math.max(0, C.M[0] - 2); fx3({ k: 'bounce', x: v.x, y: v.y }); break; }
        if (!s.bl) { s.bl = 1; const bl = swingBlocked(u, d, s.reach); if (bl) { s.hit = new Array(99); C.st = Math.max(0, C.st - 6); fx3({ k: 'bounce', x: u.x + Math.cos(u.f) * 12, y: u.y + Math.sin(u.f) * 12 }); wbMsg('Zbraň sa zarazila o ' + bl + '!', '#ff9a80'); snd('sh'); break; } }
        const i = s.hit.length; s.hit.push(v);
        const a = dirTo(u, v), close = Math.max(-.5, Math.min(1.2, (((C.vx || 0) - (v.vx3 || 0)) * Math.cos(a) + ((C.vy || 0) - (v.vy3 || 0)) * Math.sin(a)) / Math.max(1, u.bs || u.sp || 2)));   // rýchlosť oboch strán: nepriateľ, ktorý beží proti tebe, dostane viac
        const handle = dist - r * .5 < s.reach * (WT.spear || WT.t2 ? .42 : .26);   // príliš blízko: zasiahne len rúčka
        if (handle && !i) wbMsg(WT.spear && d === 't' ? 'Príliš blízko – kopija nemá odstup.' : 'Príliš blízko – zasiahla len rúčka.', '#ff9a80');
        const tipF = .85 + .3 * Math.min(1, dist / s.reach);   // hrot udiera silnejšie
        meleeHit(u, v, heroMeleeDmg() * P.m * s.pow * vel * tipF * (1 + close * (heroMounted() ? .5 : .2)) * (i ? .75 : 1) * (handle ? (WT.spear && d === 't' ? 0 : .2) : 1), d === 't' ? 'thrust' : 'swing', { d, pow: s.pow, pitch: s.pitch, sp: vel, vis: s.vis, dh: s.dh });
    }
    if (p >= 1) C.sw = null;
}
/** Zameriavač: bod pod kurzorom a rozptyl (napnutie, pohyb, zručnosť, trasúca sa ruka pri dlhom držaní). */
function aimInfo(u, mv, rt) {
    const C = CMB, tx = ptr.x + bc.x, ty = ptr.y + bc.y, dist = Math.hypot(tx - u.x, ty - u.y);
    const full = (rt === 'jav' ? 16 : 26) * wpDrawK(rt), p = Math.min(1, (C.draw || 0) / full);   // zdatnosť: rýchlejšie napínanie
    let sp = { bow: .035, jav: .05, xbow: .012 }[rt] || .035;
    if (mv != null) sp *= heroMounted() && (G.s.ls >= 2 || perk('konilu')) ? 1.5 : 3;
    sp *= 1 + (1 - p) * 3;
    if (rt === 'bow' && C.draw > 110) sp *= Math.min(3, 1 + (C.draw - 110) / 60);
    sp *= Math.max(.5, 1 - .08 * (G.s.ls || 0)) * wpSpreadK(rt);
    return { x: tx, y: ty, dist, p, sp, r: 3 + sp * Math.min(dist, 600) };
}
/** Výstrel: šíp letí k bodu pod kurzorom (dolet podľa napnutia), sila podľa napnutia. */
function heroShoot(u, mv, RW, rt) {
    const C = CMB, A = C.km ? aimInfo(u, mv, rt) : null, look = !!(C.km && C.aim3);
    const p = A ? A.p : 1, base = rt === 'xbow' ? 10 : rt === 'jav' ? 6.5 : 8, sp = base * (.55 + .45 * p);
    const spr = A ? A.sp : rt === 'xbow' ? (mv != null ? .025 : .005) : rt === 'jav' ? .03 : mv != null ? (heroMounted() && (G.s.ls >= 2 || perk('konilu')) ? .02 : .08) : .015;
    const z0 = elevSim(u.x, u.y) + seatH(u) + bodyH(u) * .72;
    let an, pitch, tl = 0;
    if (look) { an = C.aim3.yaw; pitch = C.aim3.pitch; }   // mierenie ako vo Warbande: šíp letí smerom zameriavača, gravitácia ho stiahne
    else if (A) { an = Math.atan2(A.y - u.y, A.x - u.x); pitch = ballistic(A.dist, elevSim(A.x, A.y) - z0, sp); }   // mierenie na zem: šíp dopadne k bodu pod kurzorom
    else { an = u.f; const t = U.filter(v => v.t && v.hp > 0).sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y))[0]; pitch = t ? ballistic(Math.hypot(t.x - u.x, t.y - u.y), elevSim(t.x, t.y) + seatH(t) + bodyH(t) * .6 - z0, sp) : .1; }
    u.f = an;
    const sk = A ? 1 : wpSpreadK(rt);   // bez zameriavača: zdatnosť zmenší rozptyl priamo
    an += (Math.random() - .5) * 2 * spr * sk; pitch += (Math.random() - .5) * 1.6 * spr * sk;
    const a = fireArrow(u, an, pitch, sp, { t: 0, d: ((RW ? RW.v : 6) + G.s.ls * (rt === 'xbow' ? .5 : 1.5)) * (.5 + .5 * p) * wpShotDmgK(rt), jav: rt === 'jav', bolt: rt === 'xbow' });
    if (!look && A) { const vz = a.vz; tl = (vz + Math.sqrt(Math.max(0, vz * vz + 2 * ARG * (a.z - elevSim(A.x, A.y))))) / ARG; a.l = tl + 1.5; }
    C.ammo--; C.bowC = RW ? RW.cd : 42; C.draw = 0; snd('ar');
    if (!C.ammo) cmbSay('ammo', 'Došli ti strely.');
    else if (C.km && rt === 'bow') cmbSay('bow', look ? 'Luk: drž ľavé tlačidlo (koliesko prepne na luk) alebo ' + keyName(KB().shoot) + '. Šíp padá – na diaľku mier vyššie. Zásah do hlavy zabije.' : 'Luk: drž ' + keyName(KB().shoot) + ' – zameriavač sa zúži, keď je luk napnutý. Šíp dopadne k bodu pod kurzorom.', 220);
}
/** Úder na blízko: kryt hrdinu, štít vojaka, úder zboku a zozadu. Vráti true, ak úder prešiel. kind: swing, thrust, charge, ai. */
function meleeHit(att, def, d, kind, info) {
    const C = CMB, from = dirTo(def, att), rel = angD(def.f, from);
    if (kind === 'ai' && def.h && typeof chamber === 'function' && chamber(att, def)) return false;   // kryt útokom
    if (kind === 'charge' && braced(def, att)) {   // šík kopijníkov zastaví nápor jazdy
        hit(att, def.d * 2.5, def); if (!att.h) { att.stun = 35; att.rear = 45; } else { C.run = 0; C.rear = 45; C.mvS = 0; wbMsg('Kôň sa vzopol pred kopijami!', '#ff9a80'); }
        blockFx(def, from, 0, att); cmbSay('brace', 'Šík kopijníkov zastavil nápor jazdy!', 150); return false;
    }
    if (def.h && C.blk && C.st > 0) {
        const sh = C.shp > 0;
        const man = !sh && OPT.blkDir === 'manual' && att.lwd;   // kryt zbraňou do smeru úderu (Nastavenia → Smer krytu: myšou)
        if (rel < (sh ? (perk('stit') ? 1.7 : 1.4) + .06 * csLv('sh') : .85) && (!man || C.bd === att.lwd)) {
            C.st -= kind === 'charge' ? 30 : sh ? 6 : 10;
            if (sh) { C.shp -= d * .6; if (C.shp <= 0) { C.shp = 0; TS = { s: 'Štít sa rozbil!', l: 120 }; } }
            if (!att.h) att.c = (att.c || 0) + 10;   // úder sa zarazil o kryt: útočník sa spamätáva dlhšie
            if (C.blkT < (man ? 18 : 12) + csLv('sh') && !att.h) { att.stun = 40; att.wu = 0; att.as = null; cmbSay('perf', 'Dokonalý kryt! Útočník sa zapotácal – teraz udri.'); C.perfT = 50; C.rip = 70; C.chN = 0; wbMsg('Dokonalý kryt!', '#ffd24a'); SHAKE = Math.max(SHAKE, 1.2); snd('sh'); }
            if (kind === 'charge') { def.x -= Math.cos(from) * 10; def.y -= Math.sin(from) * 10; }
            blockFx(def, from, sh, att); att.rc = 14;   // spätný ráz zbrane (3D póza)
            if (C.st <= 0) { C.st = 0; C.gb = 45; hit(def, d * .5, att); cmbSay('gb', 'Kryt prelomený – došla výdrž!'); }
            return false;
        }
    }
    let bc0 = blockChance(def); const coh = def.h ? 0 : cohesion(def);
    if (bc0 > 0 && rel < 1.1) bc0 = Math.min(.9, bc0 + .25 * coh);   // línia štítov kryje spredu
    if (info && att.h && bc0 > 0) {   // vojaci sa učia: rovnaký smer stále dookola kryjú ľahšie, zmena smeru ich zaskočí; silný obojručný úder kryt prerazí
        const H = (C.hist || []).slice(0, -1), same = H.filter(x => x === info.d).length;
        bc0 *= same >= 2 ? 1.6 : same === 0 ? .7 : 1;
        const sk = aiSkill(def), react = 22 - 12 * sk;   // reakčný čas v snímkach: zručný vojak vidí smer nápriahu skôr
        if (info.vis != null) bc0 = info.vis > react ? Math.min(.85, bc0 + .12 + .3 * sk) : bc0 * .8;   // dlho držaný nápriah sa prečíta, rýchly úder zaskočí
        if (info.dh && info.dh.length > 1 && info.vis != null) {   // klam smerom: vojak kryje smer, ktorý videl pred reakčným časom; zmena v poslednej chvíli ho zmýli
            const tSee = info.vis - react; let seen = info.dh[0][1]; for (const [t, d1] of info.dh) if (t <= tSee) seen = d1;
            if (seen !== info.d) { bc0 *= .25 * (1.3 - sk); if (att.h) cmbSay('dirfeint', 'Klam smerom! Súper kryl zlý smer.', 160); }
        }
        if (info.d === 'u' && !(def.k === 'i' || def.k === 'v')) bc0 *= .8;
        if (twoHand() && info.pow > 1.3) bc0 *= .4;
    }
    if (!def.h && kind !== 'charge' && rel < 1.1 && Math.random() < bc0) {
        blockFx(def, from, 1, att); att.rc = 14;
        if (att.h) {   // zarazenie (ako vo Warbande): úder zachytený krytom sa zastaví – ďalších v oblúku nezasiahne a zbraň odskočí
            C.rc = 14; C.st = Math.max(0, C.st - 4);
            if (C.sw) { C.sw.hit = new Array(99); att.c = (att.c || 0) + 8; fx3({ k: 'bounce', x: def.x, y: def.y }); }
            cmbSay('bounce', 'Úder zachytený krytom – zbraň odskočila. Mier tam, kde súper nekryje, alebo ho kopni (' + keyName(KB().kick) + ').', 160);
        } else att.c = (att.c || 0) + 8;
        return false;
    }
    let mult = rel > 2.1 ? 1.5 : rel > 1.2 ? 1.25 : 1;
    const spearAtt = att.h ? kind === 'thrust' && !!(it('w') || {}).r : kind === 'ai' && aiWpn(att) === 'spear';
    if (!def.h && mounted(def) && spearAtt) { mult *= 1.4; if (att.h) cmbSay('anticav', 'Kopija proti jazdcovi: +40 % zranenia – kopijníci sú postrachom jazdy.', 160); }   // kopija proti jazde
    if (coh) { mult *= rel < 1.1 ? 1 - .2 * coh : 1 + .2 * coh; if (att.h && rel > 1.2 && coh > .3) cmbSay('lineflank', 'Úder do boku línie štítov – tu ju nič nekryje!', 160); }
    if (info || kind === 'ai') {   // miesto zásahu a typ poškodenia (js/sim/warband.js)
        const dir = info ? info.d : att.lwd ? ({ l: 'r', r: 'l', u: 'u', t: 't' })[att.lwd] : 'r';
        hitZ(def, d * mult, att, { zone: meleeZone(att, def, dir, info ? info.pitch : null), type: dmgType(att, kind, dir), pow: info ? info.pow : 1 });
    } else hit(def, d * mult, att);
    if (def.h && !def.dis && heroMounted() && (kind === 'charge' || (kind === 'ai' && aiWpn(att) === 'spear')) && Math.random() < (kind === 'charge' ? .2 : .1)) unseat(def);   // nápor alebo kopijník vyrazí hrdinu zo sedla
    if (kind === 'charge') fx3({ k: 'charge', x: def.x, y: def.y, u: def, by: att, a: dirTo(att, def) });   // náraz jazdy (3D: odhodenie, triesky z kopije)
    if (mult > 1 && att.h) cmbSay('flank', rel > 2.1 ? 'Úder zozadu: +50 % zranenia.' : 'Úder zboku: +25 % zranenia.', 120);
    return true;
}
/** Útočník pod hradbami nedosiahne na obrancu na hradbách (len cez rebrík, vežu alebo zničenú bránu). */
function wallBlocked(u, b) {
    const S = SGB; if (!S || !b) return false;
    const att = S.att ?? 0; if (u.t !== att || b.t === att || b.x < 1000 || u.x >= 996) return false;
    const off = S.ladOff || [0, 0];
    return !((S.gate <= 0 && u.y > 440 && u.y < 520) || (S.lad && [250, 710].some((l, i) => Math.abs(u.y - l) < 26 && !(off[i] > 0))) || (S.tow && Math.abs(u.y - 610) < 36));
}
/** Kopijník (alebo pešiak v šíku) čelom k útočníkovi zachytí nápor jazdy. */
function braced(def, att) {
    if (def.h || def.boss || def.rout || def.stun > 0 || angD(def.f, dirTo(def, att)) > 1) return false;
    if (def.uk && FU[def.uk] && FU[def.uk].wp === 'sp') return true;
    return !def.t && def.hx != null && (def.k === 'i' || def.k === 'v') && CMB.og[grpOf(def)] === 'l';
}
/** Hrdinu vyrazili zo sedla (nápor jazdy, kopijník): spadne, chvíľu je omráčený a bojuje pešo; kôň zvyčajne uteká (po bitke sa môže vrátiť). */
function unseat(u) {
    u.dis = 1; u.bs = u.sp = 1.2 * 1.9 * (1 + .08 * G.s.ob); CMB.run = 0; CMB.chg = 0; u.stun = 40; hit(u, 6, null); SHAKE = Math.max(SHAKE, 3);
    for (let i = 0; i < 8; i++) PT.push({ x: u.x, y: u.y + 4, vx: Math.random() * 3 - 1.5, vy: -Math.random() * 2, g: .08, l: 24, c: '#c8b48c' });
    TS = { s: 'Vyrazili ťa zo sedla! Kôň uteká – bojuj pešo.', l: 200 }; wbMsg('Vyrazený zo sedla!', '#ff9a80');
}
/** Kôň hrdinu padol: hrdina bojuje pešo. */
function horseDown(u) {
    u.dis = 1; u.bs = u.sp = 1.2 * 1.9 * (1 + .08 * G.s.ob); CMB.run = 0; CMB.horse = 0; SHAKE = Math.max(SHAKE, 2);
    for (let i = 0; i < 10; i++) PT.push({ x: u.x, y: u.y + 4, vx: Math.random() * 3 - 1.5, vy: -Math.random() * 2, g: .08, l: 24, c: '#c8b48c' });
    TS = { s: 'Tvoj kôň padol! Bojuješ pešo.', l: 200 };
}
/** Po bitke: padnutý kôň sa s istou šancou nevráti. */
function horseAfter() {
    if (!U || !U[0] || !U[0].dis || !G.eq.m || Math.random() > .3) return;
    const lost = it('m').n; G.own.m = G.own.m.filter(i => i !== G.eq.m); G.eq.m = 0; lg('Tvoj kôň (' + lost + ') v bitke padol a už nevstal.');
}
/** Akcie hrdinu na hradbách (kláves B): pri rebríku ho zhodí, pri bráne vyleje vriaci olej, inde hodí kameň. */
function wallAction(u) {
    const S = SGB; if (!S || !kd('wall')) return;
    const C = CMB, att = S.att ?? 0, foe = v => v.t === att && v.hp > 0;
    if (u.t === att || u.x < 995 || u.x > 1050) { cmbSay('wallx', 'Akcie na hradbách ide robiť len ako obranca stojaci na hradbách.'); return; }
    const L = [250, 710].findIndex(l => Math.abs(u.y - l) < 45);
    if (S.lad && L >= 0 && !((S.ladOff || [])[L] > 0)) {
        S.ladOff = S.ladOff || [0, 0]; S.ladOff[L] = 600;
        for (const v of U) if (foe(v) && v.x > 950 && v.x < 1050 && Math.abs(v.y - [250, 710][L]) < 30) { hit(v, 30, u); v.x = Math.min(v.x, 960); v.stun = 40; }
        fx3({ k: 'ladder', i: L }); TS = { s: 'Rebrík je zhodený! Útočníci padajú do priekopy.', l: 160 }; SHAKE = Math.max(SHAKE, 1.5); return;
    }
    if (Math.abs(u.y - 480) < 70 && (C.oil || 0) <= 0) {
        C.oil = 900;
        for (const v of U) if (foe(v) && v.x > 920 && v.x < 1004 && v.y > 415 && v.y < 545) hit(v, 45, u);
        for (let i = 0; i < 24; i++) PT.push({ x: 960 + Math.random() * 40, y: 430 + Math.random() * 100, vx: Math.random() - .5, vy: -Math.random(), g: .03, l: 30, c: '#ff8a20' });
        fx3({ k: 'oil', x: 975, y: 480 }); TS = { s: 'Vriaci olej zalial bránu!', l: 140 }; return;
    }
    if ((C.rock || 0) <= 0) {
        C.rock = 220; const x = u.x - 55, y = u.y;
        for (const v of U) if (foe(v) && Math.hypot(v.x - x, v.y - y) < 45) { hit(v, 28, u); v.stun = 20; }
        PT.push({ x, y, ring: 1, rr: 30, l: 14, c: '#c8c0b0' }); fx3({ k: 'rock', x, y, x0: u.x, y0: u.y });
    }
}
/** Šíp: štít hrdinu (pri kryte) alebo štít vojaka spredu ho zachytí. */
function arrowBlocked(v, a) {
    const rel = angD(v.f, Math.atan2(-a.vy, -a.vx));
    if (v.h) { if (CMB.blk && CMB.shp > 0 && rel < 1.4 + .06 * csLv('sh')) { CMB.shp = Math.max(0, CMB.shp - 4 - (a.bolt ? 4 : 0)); blockFx(v, Math.atan2(-a.vy, -a.vx), 1); if (CMB.shp <= 0) { fx3({ k: 'shieldBreak', x: v.x, y: v.y }); wbMsg('Štít sa rozbil!', '#ff9a80'); } return true; } return false; }
    if (rel < 1.1 && Math.random() < blockChance(v) * .8) { blockFx(v, Math.atan2(-a.vy, -a.vx), 1); return true; }
    return false;
}
/** Iskry a záblesk pri kryte. */
function blockFx(u, from, shield, att) {
    const x = u.x + Math.cos(from) * u.r, y = u.y + Math.sin(from) * u.r - 3;
    for (let i = 0; i < 6; i++) PT.push({ x, y, vx: Math.cos(from) * 2 + Math.random() * 3 - 1.5, vy: -1.5 - Math.random() * 2, g: .18, l: 12 + Math.random() * 6, c: '#fff0b0', sp: 1 });
    PT.push({ x, y, ring: 1, rr: shield ? 12 : 8, l: 10, c: shield ? '#c8d8ff' : '#ffffff', att, def: u });   // 3D: iskra presne tam, kde sa zbraň stretne so štítom alebo čepeľou
    snd('sh');
}

/** AI vojaka na blízko: nápriah (varovanie), úder, nápor jazdy. Vráti true, ak sa vojak tento snímok už nehýbe. */
/** Zručnosť vojaka 0 – 1 (silnejší a veliteľ sú zručnejší): skúsenejší sa napriahujú rýchlejšie, robia klamy a zásah ich ľahšie nezastaví. */
const aiSkill = u => u.cp || u.cmd ? 1 : Math.max(0, Math.min(1, ((u.d || 5) - 5) / 10));
/** Druh zbrane vojaka (pre dosah a rýchlosť): kopija, sekera, palcát (obri), inak meč. */
function aiWpn(u) { const F = u.uk && FU[u.uk]; const w = F ? F.wp : (specU(u) || {}).weapon; return heavy(u) ? 'mace' : w === 'sp' || w === 'spear' ? 'spear' : w === 'ax' || w === 'axe' ? 'axe' : 'sword'; }
function aiMelee(u, b, bd, dt) {
    const WK = aiWpn(u), S = WSTAT[WK], sk = aiSkill(u);
    if (u.as) { aiSwing(u, dt, S); return true; }
    if (u.wu > 0) {
        u.wu -= dt; u.f = dirTo(u, u.wt || b);
        if (u.wu <= 3 && !u.fnt && sk > .35 && u.wt && u.wt.h && Math.random() < sk * .25 * dt) { u.fnt = 1; const o = ['l', 'r', 'u'].filter(x => x !== u.wd); u.wd = o[Math.floor(Math.random() * o.length)]; u.wu += 3; }   // klam: zručný vojak v poslednej chvíli zmení smer úderu
        if (u.wu <= 0) { u.lwd = u.wd; u.as = { t: 0, dur: (heavy(u) ? 20 : 15) / S.sp, tg: u.wt, d: u.wd }; u.c = (heavy(u) ? 74 : 62) / S.sp * (1 + .08 * Math.min(4, aiChain(u))); u.wt = null; u.fnt = 0; u.atkN = (u.atkN || 0) + 1; aiSwing(u, 0, S); }
        return true;
    }
    if (bd > 13 * (WK === 'spear' ? 1.3 : WK === 'axe' ? .95 : 1)) { if (mounted(u)) u.run = (u.run || 0) + dt; return false; }
    if (u.c > 0 || wallBlocked(u, b)) return false;
    if (mounted(u) && u.run > 40) {   // jazda v plnom cvale: nápor
        const a = dirTo(u, b);
        if (meleeHit(u, b, u.d * (1.1 + 1.4 * Math.min(1, (u.run || 0) / 90)), 'charge') && b.hp > 0) { b.x += Math.cos(a) * 12; b.y += Math.sin(a) * 12; if (!b.h) b.stun = 20; }
        if (b.h) SHAKE = Math.max(SHAKE, 1.5);
        u.run = 0; u.c = 45; { u.ride = 55 + Math.random() * 25; u.rideA = a + (Math.random() - .5) * .5; }
        return true;
    }
    u.run = 0;
    // smer úderu (ako ho vidí obranca): zľava, sprava, zhora, bod; trollovia a obri bijú zhora, kopijníci bodajú, sekerníci len sekajú
    const sp = WK === 'spear', r = Math.random();
    u.wd = heavy(u) ? 'u' : sp ? (r < .65 ? 't' : 'u') : WK === 'axe' ? (r < .4 ? 'l' : r < .75 ? 'r' : 'u') : r < .34 ? 'l' : r < .68 ? 'r' : r < .86 ? 'u' : 't';
    u.wu = u.wu0 = ((heavy(u) ? 38 : 22) * (1.2 - .35 * sk) / S.sp) + (b.h && OPT.blkDir === 'manual' ? 9 : 0); u.wt = b; u.fnt = 0;
    return true;
}
/** Úder vojaka v pohybe (ako vo Warbande): po nápriahu čepeľ letí asi šestinu sekundy a zasiahne, len ak je cieľ v strede pohybu
 *  na dosah a pred vojakom. Kto včas ustúpi alebo uskočí nabok, úderu sa vyhne; počas úderu sa vojak natáča len pomaly.
 *  Rýchlosť oboch strán sa počíta: útočník, ktorý beží proti cieľu (alebo cieľ proti nemu), udrie silnejšie. */
function aiSwing(u, dt, S) {
    const A = u.as, t = A.tg; A.t += dt; const p = A.t / A.dur;
    if (t && t.hp > 0 && !A.done) {
        const a = dirTo(u, t), df = Math.atan2(Math.sin(a - u.f), Math.cos(a - u.f));
        u.f += Math.max(-.04 * dt, Math.min(.04 * dt, df));
        const dist = Math.hypot(t.x - u.x, t.y - u.y), reach = 22 * S.len + (t.r || 6) * .5;
        if (dist < reach + 6) A.near = 1;
        if (p >= .35 && dist < reach && angD(u.f, a) < (A.d === 't' ? .45 : A.d === 'u' ? .6 : .95) && !wallBlocked(u, t)) {
            A.done = 1;
            const rel = ((u.vx3 || 0) - (t.vx3 || 0)) * Math.cos(a) + ((u.vy3 || 0) - (t.vy3 || 0)) * Math.sin(a);
            meleeHit(u, t, u.d * S[A.d === 't' ? 'th' : 'sw'] * (.7 + Math.random() * .6) * speedK(rel, mounted(u)), 'ai');
        }
    }
    if (p >= 1) { if (!A.done && A.near && t && t.h && t.hp > 0) cmbSay('dodge', 'Úder ťa minul – včas si ustúpil. Vojaci zasahujú čepeľou v pohybe, nie hneď po nápriahu.', 160); u.as = null; }
}
/** Séria úderov vojaka: koľko úderov v rade urobil bez pauzy (únava predlžuje zotavenie). */
function aiChain(u) { const tt = U[0].tt || 0; u.ch = tt - (u.la ?? -999) < 150 ? (u.ch || 0) + 1 : 0; u.la = tt; return u.ch; }
/** Bonus za rýchlosť (ako vo Warbande): rel = rýchlosť, ktorou sa útočník a cieľ k sebe približujú (jednotky za snímok). */
const speedK = (rel, mount) => 1 + Math.max(-.3, Math.min(1, rel / 2)) * (mount ? .5 : .25);

/** Morálka strán: pomaly sa vracia, pod 35 vojaci začnú utekať, pod 10 utečú všetci; pri raste sa utečenci vracajú. */
function cmbMorale(dt) {
    const C = CMB;
    if (C.oil > 0) C.oil -= dt; if (C.rock > 0) C.rock -= dt;
    if (SGB) siegeDefenseAI(dt);
    for (const s of [0, 1]) {
        C.M[s] = Math.max(0, Math.min(C.M0[s], C.M[s] + .003 * dt));
        if (C.noRout) continue;
        const M = C.M[s];
        for (const u of U) {
            if (u.t !== s || u.hp <= 0 || fearless(u) || u.garrison && SGB) continue;
            if (u.rout) { if (M > 50 && Math.random() < .004 * dt) u.rout = 0; continue; }
            const th = s === 0 && perk('zastava') ? 25 : 35;   // perk Zástava
            if (M < 10 || (M < th && Math.random() < (th - M) / th * .01 * dt * (u.hp < u.mh * .5 ? 2.5 : 1))) rout(u);
        }
    }
}
/** Obrancovia hradieb (AI): občas zhodia rebrík a lejú olej na útočníkov pri bráne; zhodené rebríky sa znova postavia. */
function siegeDefenseAI(dt) {
    const S = SGB, att = S.att ?? 0;
    if (S.ladOff) S.ladOff = S.ladOff.map(t => Math.max(0, t - dt));
    if (att !== 0) return;   // pri tvojej obrane rozhoduješ ty (kláves B)
    S.aiT = (S.aiT || 0) + dt;
    if (S.aiT < 600) return;
    S.aiT = 0;
    const def = U.filter(v => v.t !== att && v.hp > 0 && v.x > 1000);
    if (!def.length) return;
    const atGate = U.filter(v => v.t === att && v.hp > 0 && v.x > 920 && v.x < 1004 && v.y > 415 && v.y < 545);
    if (S.gate > 0 && atGate.length >= 4) { atGate.forEach(v => hit(v, 30, def[0])); for (let i = 0; i < 18; i++) PT.push({ x: 960 + Math.random() * 40, y: 430 + Math.random() * 100, vx: 0, vy: -Math.random(), g: .03, l: 28, c: '#ff8a20' }); TS = { s: 'Obrancovia lejú vriaci olej na bránu!', l: 140 }; return; }
    if (S.lad && Math.random() < .5) { const L = Math.random() < .5 ? 0 : 1; S.ladOff = S.ladOff || [0, 0]; if (!S.ladOff[L]) { S.ladOff[L] = 360; TS = { s: 'Obrancovia zhodili rebrík!', l: 120 }; } }
}
function rout(u) {
    u.rout = 1; u.rt = 0; u.wu = 0;
    if (u.t) cmbSay('r1', 'Nepriatelia začínajú utekať z bojiska!'); else cmbSay('r0', 'Tvoji muži utekajú! Bojový pokrik (V) ich vráti.');
}
/** Utekajúci vojak beží k svojmu okraju bojiska; keď ho dosiahne (alebo po čase), opustí bitku živý. */
function cmbFlee(u, dt) {
    u.rt = (u.rt || 0) + dt;
    const dx = u.t ? 1 : -1;
    u.f = u.t ? 0 : Math.PI;
    u.x += dx * u.sp * 1.15 * dt; u.y += Math.sin(u.rt / 20 + u.x) * .3 * dt;
    if (u.x <= 12 || u.x >= BW - 12 || u.rt > 420) { u.fled = 1; u.hp = 0; u.rout = 0; CMB.M[u.t] = Math.max(0, CMB.M[u.t] - 35 / Math.max(8, CMB.n0[u.t])); }
}
/** Padlý vojak znižuje morálku svojej strany (veliteľ a spoločník viac) a dvíha morálku druhej. */
function cmbDeath(b) {
    if (b.h || b.fled) return;
    if (typeof dropOnDeath === 'function') dropOnDeath(b);
    const s = b.t ? 1 : 0, C = CMB, loss = 85 / Math.max(8, C.n0[s]) * (b.uk || b.cp ? 1.3 : 1) * (heavy(b) ? 2 : 1);
    C.M[s] = Math.max(0, C.M[s] - loss); C.M[1 - s] = Math.min(100, C.M[1 - s] + loss * .3);
    if (b.boss) C.M[1] = Math.max(0, C.M[1] - 40);
    if (b.cmd) { C.M[1] = Math.max(0, C.M[1] - 25); TS = { s: 'Nepriateľský veliteľ padol! Morálka nepriateľa sa láme.', l: 160 }; }
    if (b.cp) C.M[0] = Math.max(0, C.M[0] - 8);
}

/** Rozkaz skupine: Držať a Šík určia každému vojakovi miesto (Šík = línia čelom k nepriateľom). */
/** Útvary skupín: riadky (line), hustý štítový šík (wall: tesne, viac krytov, pomalší), voľný (loose: rozostúpení, šípy menej zasiahnu). */
const FM_N = { line: 'riadky', wall: 'štítový val', loose: 'voľný útvar' }, FM_GAP = { line: 16, wall: 11, loose: 27 }, FM_PER = { line: 14, wall: 12, loose: 11 };
const fmOf = u => (CMB.fm || {})[grpOf(u)] || 'line';
/** Miesta v útvare pre skupiny gs. at = bod, kam ich hráč postavil (inak pri skupine), čelom k nepriateľovi. */
function slotsFor(gs, k, at) {
    const mine = U.filter(u => !u.t && !u.ally && !u.h && u.hp > 0 && !u.rout), foes = U.filter(u => u.t && u.hp > 0), out = [];
    const ctr = a => a.length ? { x: a.reduce((s, u) => s + u.x, 0) / a.length, y: a.reduce((s, u) => s + u.y, 0) / a.length } : null;
    const ec = ctr(foes) || { x: BW - 100, y: BH / 2 }, all = at || ctr(mine);
    for (const g of gs) {
        const us = mine.filter(u => grpOf(u) === g);
        if (!us.length) continue;
        if (k === 'h' && !at) { us.forEach(u => out.push({ u, x: u.x, y: u.y })); continue; }
        const c = gs.length > 1 && all ? all : at || ctr(us), a = Math.atan2(ec.y - c.y, ec.x - c.x), px = -Math.sin(a), py = Math.cos(a);
        const fm = (CMB.fm || {})[g] || 'line', gap = FM_GAP[fm], per = FM_PER[fm];
        const off = gs.length > 1 ? { p: 22, l: -26, j: -62 }[g] * gap / 16 : 0;
        us.slice().sort((p, q) => (p.x * px + p.y * py) - (q.x * px + q.y * py)).forEach((u, i) => {
            const row = Math.floor(i / per), col = i % per, n = Math.min(per, us.length - row * per);
            out.push({ u, x: Math.max(20, Math.min(BW - 20, c.x + Math.cos(a) * (off - row * gap) + px * (col - (n - 1) / 2) * gap)), y: Math.max(30, Math.min(BH - 20, c.y + Math.sin(a) * (off - row * gap) + py * (col - (n - 1) / 2) * gap)), g });
        });
    }
    return out;
}
function ordPlace(gs, k, at) {
    if (!U || mode !== 'battle') return;
    const mine = U.filter(u => !u.t && !u.ally && !u.h && u.hp > 0 && !u.rout);
    if (k !== 'h' && k !== 'l') { mine.filter(u => gs.includes(grpOf(u))).forEach(u => { u.hx = u.hy = undefined; }); return; }
    slotsFor(gs, k, at).forEach(S => { S.u.hx = S.x; S.u.hy = S.y; });
    CMB.mkT = 260;   // značky miest na zemi
}
/** Útvar vybranej skupiny: riadky → štítový val → voľný útvar (kláves X). */
function cycleFormation() {
    const gs = CMB.sel === 'all' ? ['p', 'l', 'j'] : [CMB.sel], cur = (CMB.fm || {})[gs[0]] || 'line', nx = { line: 'wall', wall: 'loose', loose: 'line' }[cur];
    CMB.fm = CMB.fm || { p: 'line', l: 'line', j: 'line' }; gs.forEach(g => { CMB.fm[g] = nx; });
    gs.filter(g => CMB.og[g] === 'h' || CMB.og[g] === 'l').forEach(g => { const at = CMB.at && CMB.at[g]; ordPlace([g], CMB.og[g] === 'h' && !at ? 'l' : CMB.og[g], at); });
    if (typeof odSync === 'function') odSync();
    TS = { s: GRP_N[CMB.sel] + ': ' + FM_N[nx] + (nx === 'wall' ? ' – tesne pri sebe, štíty kryjú údery aj šípy, ale pomalší' : nx === 'loose' ? ' – rozostúpení, šípy a strely zasiahnu menej' : ''), l: 150 };
}
/** Rozkaz na miesto: drž kláves Držať alebo Šík, namier myšou a pusti – skupina sa postaví tam (ako vo Warbande). */
function placeTick() {
    const P = CMB.place; if (!P) return;
    if (!keys[P.key]) { if (P.on) { const gs = P.gs; ordPlace(gs, P.k, P.at); CMB.at = CMB.at || {}; gs.forEach(g => { CMB.at[g] = P.at; }); TS = { s: GRP_N[CMB.sel] + ': ' + (P.k === 'h' ? 'držte toto miesto' : 'šík tu') + '!', l: 100 }; } CMB.place = null; CMB.prev = null; return; }
    if (performance.now() - P.t0 > 250) { P.on = 1; P.at = { x: ptr.x + bc.x, y: ptr.y + bc.y }; CMB.prev = slotsFor(P.gs, P.k, P.at); }
}
function holdSlot(u, b, bd, dt) {
    if (u.hx == null) { u.hx = u.x; u.hy = u.y; }
    const dx = u.hx - u.x, dy = u.hy - u.y, ds = Math.hypot(dx, dy), archer = u.k === 'a' || u.k === 'e';
    const sp = u.sp * (fmOf(u) === 'wall' && !u.t ? .75 : 1), step = () => { if (ds > 3) { u.x += dx / ds * Math.min(ds, sp * dt); u.y += dy / ds * Math.min(ds, sp * dt); } };
    if (archer) { step(); u.f = dirTo(u, b); if (u.c <= 0 && bd < WX.r) aiBow(u, b, 7); else u.aim = 0; return true; }
    if (bd > 45 || ds > 70) { step(); u.f = ds > 3 ? Math.atan2(dy, dx) : dirTo(u, b); u.run = 0; return true; }
    return false;
}

// Klávesnica (počas bitky): pohyb, útoky, skupiny 1–4 a rozkazy T H F G R. Mimo bitky sa len zapisuje stav kláves.
if (typeof addEventListener === 'function') {
    const norm = e => e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
    addEventListener('keydown', e => {
        const t = e.target && e.target.tagName;
        if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
        const k = norm(e); if (!k) return;
        if (CAPTURE) { e.preventDefault(); const c = CAPTURE; CAPTURE = null; if (k !== 'Escape') { OPT.keys = OPT.keys || {}; OPT.keys[c.a] = k; saveOpt(); } c.done(); return; }   // nové priradenie klávesu
        keys[e.key] = keys[k] = true;
        if (mode !== 'battle') return;
        if (k === ' ' || /^Arrow/.test(k)) e.preventDefault();
        if (/^Arrow/.test(k) || 'wasd'.includes(k) && k.length === 1) CMB.km = 1;
        if (e.repeat) return;
        if (k >= '1' && k <= '4' && typeof selGroup === 'function') selGroup(['all', 'p', 'l', 'j'][+k - 1]);
        const act = Object.entries(KB()).find(([a, key]) => key === k && /^o_/.test(a));   // rozkazy podľa nastavených kláves
        if (act && (act[0] === 'o_adv' || act[0] === 'o_bk' || act[0] === 'o_hf')) { tacOrder(act[0]); return; }   // posun o 10 krokov, palba na povel (js/sim/tactics.js)
        if (act && typeof setOrd === 'function') { const ok = { o_a: 'a', o_h: 'h', o_f: 'f', o_l: 'l', o_r: 'r' }[act[0]]; setOrd(ok); if (CMB.at) (CMB.sel === 'all' ? ['p', 'l', 'j'] : [CMB.sel]).forEach(g => { delete CMB.at[g]; }); if (ok === 'h' || ok === 'l') CMB.place = { k: ok, key: k, t0: performance.now(), gs: CMB.sel === 'all' ? ['p', 'l', 'j'] : [CMB.sel] }; }
        if (KB().fm === k) cycleFormation();
    });
    addEventListener('keyup', e => { const k = norm(e); if (k) keys[e.key] = keys[k] = false; });
    addEventListener('blur', () => { for (const k in keys) keys[k] = false; CMB.lmb = CMB.rmb = 0; });
}
