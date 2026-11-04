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
const OPT = (() => { const d = { blood: true }; try { return Object.assign(d, JSON.parse(localStorage.getItem('vsOpt') || '{}')); } catch (e) { return d; } })();
const saveOpt = () => { try { localStorage.setItem('vsOpt', JSON.stringify(OPT)); } catch (e) { } };
const CMB = { km: 0, blk: 0, blkT: 99, gb: 0, st: 100, shp: 0, shMax: 0, run: 0, lastA: null, chg: 0, charging: 0, ammo: 0, ammo0: 0, bowC: 0, cry: 0, swing: null,
    sel: 'all', og: { p: 'a', l: 'a', j: 'a' }, M: [60, 60], M0: [60, 60], n0: [1, 1], endT: 0, noRout: 0, lmb: 0, rmb: 0, said: {} };
/** Klávesy akcií (dajú sa zmeniť v Nastaveniach → Ovládanie; OPT.keys) a stav ovládača (GP, js/sim/combat.js pollPad). */
const KEYS_DEF = { atk: ' ', thrust: 'e', block: 'Shift', shoot: 'q', cry: 'v', wall: 'b', o_a: 't', o_h: 'h', o_f: 'f', o_l: 'g', o_r: 'r' };
const KEY_N = { atk: 'Sek (útok)', thrust: 'Bod', block: 'Kryt', shoot: 'Výstrel / hod', cry: 'Bojový pokrik', wall: 'Na hradbách: rebrík, olej, kameň', o_a: 'Rozkaz Útok', o_h: 'Rozkaz Držať', o_f: 'Rozkaz Za mnou', o_l: 'Rozkaz Šík', o_r: 'Rozkaz Ústup' };
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
    if (u.h || u.rout || u.stun > 0 || u.wu > 0) return 0;
    if (u.cp) return .4;
    if (u.uk && FU[u.uk] && FU[u.uk].b) { const F = FU[u.uk]; return F.b === 'i' && F.wp !== 'ax' ? .35 : F.b === 'c' ? .2 : 0; }
    return { i: .3, v: .4, o: .15, c: .2, r: .25 }[u.k] || 0;
}
const cmbSay = (id, s, l = 180) => { if (CMB.said[id]) return; CMB.said[id] = 1; TS = { s, l }; };

/** Začiatok bitky: morálka podľa síl, veliteľ nepriateľa, výdrž, štít a šípy hrdinu. */
function cmbStart(en) {
    const C = CMB;
    Object.assign(C, { blk: 0, blkT: 99, gb: 0, st: 100, run: 0, lastA: null, chg: 0, charging: 0, bowC: 0, cry: 0, swing: null, rd: null, draw: 0, aim: null, couch: 0, hist: [], bd: 't', mdx: 0, mdy: 0, px: null, py: null, vx: 0, vy: 0, sel: 'all', endT: 0, lmb: 0, rmb: 0, said: {}, noRout: en && en.ar ? 1 : 0 });
    const mine = U.filter(u => !u.t), foe = U.filter(u => u.t), pw = s => s.reduce((a, u) => a + u.mh * (u.d || 5), 0) + 1, r = pw(mine) / pw(foe);
    const cl = v => Math.max(-18, Math.min(18, v));
    const m0 = 62 + cl((r - 1) * 12) + Math.min(12, G.lv || 1) + (G.king ? 5 : 0) + Math.min(6, (G.ren || 0) / 3) + ((G.pm ?? 60) - 50) * .3 + (perk('vodca') ? 8 : 0) + (hasRole('velitel') ? 6 : 0);   // morálka družiny, Charizma, spoločník veliteľ
    const m1 = 62 + cl((1 / r - 1) * 12) - Math.min(15, (G.fear || 0) * 1.2) + (en && en.nz ? 40 : 0) + (en && en.siege ? 10 : 0);
    C.M = [Math.min(95, m0), Math.max(25, Math.min(95, m1 - (relic('fell') ? 8 : 0)))];
    if (G.duel && en && en.id === G.duel.id && !en.duel) { if (G.duel.win) C.M[1] = Math.max(10, C.M[1] - 30); else C.M[0] = Math.max(10, C.M[0] - 25); G.duel = null; }   // výsledok súboja veliteľov C.M0 = C.M.slice(); C.n0 = [mine.length, foe.length];
    C.shMax = heroShield() ? Math.round((70 + it('s').v * 500) * (perk('stit') ? 1.6 : 1)) : 0; C.shp = C.shMax;
    const RW = rangedW();   // strelná výbava (luk, kuša, oštepy), inak lovecký luk podľa lukostreľby
    C.ammo = C.ammo0 = RW ? RW.ammo + G.s.ls * 2 + (perk('konilu') ? 6 : 0) : G.s.ls >= 1 || G.race === 'elf' || perk('konilu') ? 6 + 4 * G.s.ls + (G.race === 'elf' ? 4 : 0) + (perk('konilu') ? 6 : 0) : 0;
    C.horse = C.horse0 = heroMounted() ? Math.round(70 + it('m').v * 25) : 0;   // zdravie koňa hrdinu
    const o0 = G.ord0 || 'a'; C.og = { p: o0, l: o0, j: o0 };
    // veliteľ nepriateľa: najsilnejší vojak hlavnej armády nesie zástavu; jeho pád zlomí morálku
    if (en && en.nm && !en.ar && !en.nz) { const c = foe.filter(u => !u.src && !heavy(u)).sort((a, b) => b.mh - a.mh)[0]; if (c) { c.cmd = 1; c.bn = 1; c.hp = c.mh = c.mh * 1.6; c.d *= 1.2; } }
    if (G && !G.cmbTip) { G.cmbTip = 1; const K = KB(), n = a => keyName(K[a]); TS = { s: 'Myšou zvoľ smer, drž ľavé tl./' + n('atk') + ' a pusť = úder · ' + n('thrust') + ' bod · pravé tl./' + n('block') + ' kryt · drž ' + n('shoot') + ' luk · ' + n('cry') + ' pokrik · ' + ['o_a', 'o_h', 'o_f', 'o_l', 'o_r'].map(n).join(' ') + ' rozkazy', l: 720 }; }
}

/** Hrdina: mierenie, kryt, výdrž, sek a bod, luk, pokrik, nápor na koni. mv = smer pohybu (alebo null). */
function cmbHero(u, dt, mv) {
    const C = CMB;
    if (C.km && (!ptr.down || C.lmb)) { const ax = ptr.x + bc.x - u.x, ay = ptr.y + bc.y - u.y; if (Math.hypot(ax, ay) > 8) u.f = Math.atan2(ay, ax); }
    if (C.gb > 0) C.gb -= dt;
    if (GP && Math.hypot(GP.ax, GP.ay) > .35) { u.f = Math.atan2(GP.ay, GP.ax); C.km = 1; }   // pravá páčka ovládača mieri
    const want = !!(kd('block') || C.rmb) && C.gb <= 0 && C.st > 2;
    if (want && !C.blk) C.blkT = 0;
    C.blk = want ? 1 : 0;
    C.blkT += dt;
    C.st = Math.min(100, C.st + dt * (C.blk ? .1 : mv != null && !G.eq.m ? .22 : .38) * (perk('neunavny') ? 1.4 : 1));
    const cost = perk('neunavny') ? .75 : 1;   // perk Neúnavný
    if (C.bowC > 0) C.bowC -= dt;
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
            const lance = it('w').r ? 1 : 0, spd = Math.min(1.5, u.sp / 2.4) * (perk('kopija') ? 1.4 : 1);
            hits.forEach(v => { if (meleeHit(u, v, dmg() * (1.6 + lance) * spd, 'charge') && v.hp > 0) { v.x += Math.cos(mv) * 16; v.y += Math.sin(mv) * 16; v.stun = 25; } });
            SHAKE = Math.max(SHAKE, 2.5); C.run = 0; C.chg = 40; C.swing = { t: 12, a: mv, k: 'c', r: u.r + 22 };
            cmbSay('chg', 'Nápor! Rovný cval na koni drví nepriateľov – s kopijou ešte viac.');
        }
    }
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
            if (tg) { u.f = dirTo(u, tg); meleeHit(u, tg, dmg() * 1.35, 'thrust'); }
            u.c = 18 * slow; C.st -= 7 * cost; fx = 6; C.swing = { t: 8, a: u.f, k: 't', d: 't', r: rg * 1.35 };
        } else if (kd('atk') || C.lmb || (ptr.down && near)) {
            const t2 = twoHand(), arc = t2 ? 1.3 : 1.05;   // obojručná zbraň: širší sek, viac zasiahnutých, pomalšia
            const tg = U.filter(v => v.t && v.hp > 0 && Math.hypot(v.x - u.x, v.y - u.y) < rg + v.r * .5 && !wallBlocked(u, v)).sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y));
            tg.forEach((v, i) => meleeHit(u, v, dmg() * (t2 ? 1.1 : 1) * (i ? .75 : 1), 'swing'));
            u.c = (t2 ? 27 : 22) * slow; C.st -= (t2 ? 13 : 10) * cost; fx = 10; C.swing = { t: 10, a: u.f, k: 's', d: 'r', r: rg, w: arc };
            if (t2) cmbSay('t2', 'Obojručná zbraň: široký sek, ale bez štítu.');
        }
        if (C.st < 0) C.st = 0;
    }
    // strelná zbraň: s myšou sa luk napína držaním klávesu a pustením vystrelí (zameriavač, dolet po bod pod kurzorom); kuša strieľa hneď
    const RW = rangedW(), rt = RW ? RW.rt : 'bow';
    C.aim = null;
    if (C.km && rt !== 'xbow') {
        if (kd('shoot') && C.ammo > 0 && C.bowC <= 0 && !C.blk) {
            C.draw = (C.draw || 0) + dt;
            C.aim = aimInfo(u, mv, rt);
        } else if (C.draw > 0) {
            if (C.draw >= (rt === 'jav' ? 6 : 8)) heroShoot(u, mv, RW, rt); else C.draw = 0;
        }
    } else if (kd('shoot') && C.ammo > 0 && C.bowC <= 0 && !C.blk) {
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
    const W = it('w') || {}, t2 = twoHand(), spear = !!W.r;
    return { ready: t2 ? 13 : spear ? 11 : 9, rec: t2 ? 24 : 18, spear, t2, reach: W.r || 34 };
}
/** Hrdina s myšou: nápriah do smeru (drž tlačidlo = silnejší úder, kryt počas nápriahu = klam), sklopená kopija v cvale. */
function heroDirectional(u, dt, mv, slow, cost, rg) {
    const C = CMB, WT = wpnTimes();
    // sklopená kopija: kopija + rovný cval + drž bod (E) → každý v ceste dostane zásah podľa rýchlosti koňa
    const spd = Math.hypot(C.vx || 0, C.vy || 0);
    if (heroMounted() && WT.spear && kd('thrust') && C.run > 18 && spd > (u.bs || u.sp) * .55) {
        if (!C.couch) { C.couch = 1; C.rd = null; cmbSay('couch', 'Sklopená kopija! Drž bod (E) v rovnom cvale – kto stojí v ceste, ten padne.'); }
        const a = Math.atan2(C.vy, C.vx);
        for (const v of U) if (v.t && v.hp > 0 && !(v.couchT > 0) && Math.hypot(v.x - u.x, v.y - u.y) < WT.reach * 1.2 + v.r && angD(a, dirTo(u, v)) < .3 && !wallBlocked(u, v)) {
            v.couchT = 50;
            if (meleeHit(u, v, dmg() * (2 + spd / (u.bs || u.sp) * 1.2) * (perk('kopija') ? 1.3 : 1), 'charge') && v.hp > 0) { v.x += Math.cos(a) * 18; v.y += Math.sin(a) * 18; v.stun = 30; }
            SHAKE = Math.max(SHAKE, 2); C.swing = { t: 10, a, k: 't', d: 't', r: WT.reach * 1.2 };
        }
        for (const v of U) if (v.couchT > 0) v.couchT -= dt;
        return;
    }
    C.couch = 0;
    if (C.rd) {
        const R = C.rd; R.t += dt;
        if (C.blk) { C.rd = null; C.st = Math.max(0, C.st - 3); cmbSay('feint', 'Klam: kryt počas nápriahu zruší úder.', 120); return; }
        if (!(R.key === 'thrust' ? kd('thrust') : kd('atk') || C.lmb)) R.rel = 1;
        if (R.t > 150) C.st = Math.max(0, C.st - .12 * dt);   // ruka sa unaví
        if (R.rel && R.t >= R.ready) heroStrike(u, R, slow, cost, rg);
        return;
    }
    if (u.c > 0 || C.blk) return;
    if (kd('thrust')) C.rd = { d: 't', t: 0, key: 'thrust', ready: WT.ready * slow };
    else if (kd('atk') || C.lmb) { const d = mouseDir() || (C.alt = C.alt === 'l' ? 'r' : 'l'); C.rd = { d, t: 0, key: 'atk', ready: WT.ready * slow }; }
}
/** Úder do smeru: sek zľava/sprava zasiahne viac nepriateľov v oblúku, úder zhora jedného silnejšie, bod má dlhší dosah.
 *  Sila: držaný nápriah až +45 %, pohyb proti nepriateľovi (najmä na koni) pridá, pohyb od neho uberie. */
function heroStrike(u, R, slow, cost, rg) {
    const C = CMB, WT = wpnTimes(), d = R.d, held = Math.max(0, R.t - R.ready);
    const pow = 1 + .45 * Math.min(1, held / 30) * (R.t > 200 ? Math.max(0, 1 - (R.t - 200) / 120) : 1);
    const P = { u: { arc: .5, n: 1, m: 1.2, r: 1 }, l: { arc: WT.t2 ? 1.3 : 1.05, n: WT.t2 ? 4 : 3, m: WT.t2 ? 1.1 : 1, r: 1 }, r: { arc: WT.t2 ? 1.3 : 1.05, n: WT.t2 ? 4 : 3, m: WT.t2 ? 1.1 : 1, r: 1 }, t: { arc: .42, n: 1, m: WT.spear ? 1.5 : 1.35, r: WT.spear ? 1.5 : 1.35 } }[d];
    const reach = rg * P.r, sa = v => { let x = dirTo(u, v) - u.f; return Math.atan2(Math.sin(x), Math.cos(x)); };
    const tg = U.filter(v => v.t && v.hp > 0 && Math.hypot(v.x - u.x, v.y - u.y) < reach + v.r * .5 && !wallBlocked(u, v) && Math.abs(sa(v)) < P.arc)
        .sort((a, b) => d === 'l' ? sa(a) - sa(b) : d === 'r' ? sa(b) - sa(a) : Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y)).slice(0, P.n);
    C.hist = (C.hist || []).concat(d).slice(-4);
    tg.forEach((v, i) => {
        const a = dirTo(u, v), close = Math.max(-.5, Math.min(1.2, ((C.vx || 0) * Math.cos(a) + (C.vy || 0) * Math.sin(a)) / Math.max(1, u.bs || u.sp || 2)));
        meleeHit(u, v, dmg() * P.m * pow * (1 + close * (heroMounted() ? .5 : .2)) * (i ? .75 : 1), d === 't' ? 'thrust' : 'swing', { d, pow });
    });
    u.c = WT.rec * slow * (d === 't' ? .85 : 1); C.st -= (d === 't' ? 7 : WT.t2 ? 13 : 10) * cost * (pow > 1.2 ? 1.2 : 1); if (C.st < 0) C.st = 0;
    fx = 10; C.swing = { t: 10, a: u.f, k: d === 't' ? 't' : 's', d, r: reach, w: P.arc, pow };
    C.rd = null;
    if (pow > 1.3) cmbSay('pow', 'Silný úder! Dlhšie držaný nápriah udrie tvrdšie – ale ruka sa unaví.', 150);
    if (WT.t2) cmbSay('t2', 'Obojručná zbraň: široký sek, ale bez štítu.');
}
/** Zameriavač: bod pod kurzorom a rozptyl (napnutie, pohyb, zručnosť, trasúca sa ruka pri dlhom držaní). */
function aimInfo(u, mv, rt) {
    const C = CMB, tx = ptr.x + bc.x, ty = ptr.y + bc.y, dist = Math.hypot(tx - u.x, ty - u.y);
    const full = rt === 'jav' ? 16 : 26, p = Math.min(1, (C.draw || 0) / full);
    let sp = { bow: .035, jav: .05, xbow: .012 }[rt] || .035;
    if (mv != null) sp *= heroMounted() && (G.s.ls >= 2 || perk('konilu')) ? 1.5 : 3;
    sp *= 1 + (1 - p) * 3;
    if (rt === 'bow' && C.draw > 110) sp *= Math.min(3, 1 + (C.draw - 110) / 60);
    sp *= Math.max(.5, 1 - .08 * (G.s.ls || 0));
    return { x: tx, y: ty, dist, p, sp, r: 3 + sp * Math.min(dist, 600) };
}
/** Výstrel: šíp letí k bodu pod kurzorom (dolet podľa napnutia), sila podľa napnutia. */
function heroShoot(u, mv, RW, rt) {
    const C = CMB, A = C.km ? aimInfo(u, mv, rt) : null;
    let an = A ? Math.atan2(A.y - u.y, A.x - u.x) : u.f;
    if (A) u.f = an;
    const p = A ? A.p : 1, base = rt === 'xbow' ? 10 : rt === 'jav' ? 6.5 : 8, sp = base * (.55 + .45 * p), lmax = (rt === 'jav' ? 30 : 48) * (.6 + .4 * p);
    an += (Math.random() - .5) * 2 * (A ? A.sp : rt === 'xbow' ? (mv != null ? .025 : .005) : rt === 'jav' ? .03 : mv != null ? (heroMounted() && (G.s.ls >= 2 || perk('konilu')) ? .02 : .08) : .015);
    const l = A ? Math.max(4, Math.min(lmax, A.dist / sp + 1.5)) : lmax;
    AR.push({ x: u.x, y: u.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, l, t: 0, d: ((RW ? RW.v : 6) + G.s.ls * (rt === 'xbow' ? .5 : 1.5)) * (.5 + .5 * p), by: u, jav: rt === 'jav', bolt: rt === 'xbow' });
    C.ammo--; C.bowC = RW ? RW.cd : 42; C.draw = 0; snd('ar');
    if (!C.ammo) cmbSay('ammo', 'Došli ti strely.');
    else if (C.km && rt === 'bow') cmbSay('bow', 'Luk: drž ' + keyName(KB().shoot) + ' – zameriavač sa zúži, keď je luk napnutý. Šíp dopadne k bodu pod kurzorom.', 200);
}
/** Úder na blízko: kryt hrdinu, štít vojaka, úder zboku a zozadu. Vráti true, ak úder prešiel. kind: swing, thrust, charge, ai. */
function meleeHit(att, def, d, kind, info) {
    const C = CMB, from = dirTo(def, att), rel = angD(def.f, from);
    if (kind === 'charge' && braced(def, att)) {   // šík kopijníkov zastaví nápor jazdy
        hit(att, def.d * 2.5, def); if (!att.h) att.stun = 35; else C.run = 0;
        blockFx(def, from, 0); cmbSay('brace', 'Šík kopijníkov zastavil nápor jazdy!', 150); return false;
    }
    if (def.h && C.blk && C.st > 0) {
        const sh = C.shp > 0;
        const man = !sh && OPT.blkDir === 'manual' && att.lwd;   // kryt zbraňou do smeru úderu (Nastavenia → Smer krytu: myšou)
        if (rel < (sh ? (perk('stit') ? 1.7 : 1.4) : .85) && (!man || C.bd === att.lwd)) {
            C.st -= kind === 'charge' ? 30 : sh ? 6 : 10;
            if (sh) { C.shp -= d * .6; if (C.shp <= 0) { C.shp = 0; TS = { s: 'Štít sa rozbil!', l: 120 }; } }
            if (C.blkT < (man ? 18 : 12) && !att.h) { att.stun = 40; att.wu = 0; cmbSay('perf', 'Dokonalý kryt! Útočník sa zapotácal – teraz udri.'); }
            if (kind === 'charge') { def.x -= Math.cos(from) * 10; def.y -= Math.sin(from) * 10; }
            blockFx(def, from, sh);
            if (C.st <= 0) { C.st = 0; C.gb = 45; hit(def, d * .5, att); cmbSay('gb', 'Kryt prelomený – došla výdrž!'); }
            return false;
        }
    }
    let bc0 = blockChance(def);
    if (info && att.h && bc0 > 0) {   // vojaci sa učia: rovnaký smer stále dookola kryjú ľahšie, zmena smeru ich zaskočí; silný obojručný úder kryt prerazí
        const H = (C.hist || []).slice(0, -1), same = H.filter(x => x === info.d).length;
        bc0 *= same >= 2 ? 1.6 : same === 0 ? .7 : 1;
        if (info.d === 'u' && !(def.k === 'i' || def.k === 'v')) bc0 *= .8;
        if (twoHand() && info.pow > 1.3) bc0 *= .4;
    }
    if (!def.h && kind !== 'charge' && rel < 1.1 && Math.random() < bc0) { blockFx(def, from, 1); if (att.h) C.st = Math.max(0, C.st - 4); return false; }
    const mult = rel > 2.1 ? 1.5 : rel > 1.2 ? 1.25 : 1;
    hit(def, d * mult, att);
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
        TS = { s: 'Rebrík je zhodený! Útočníci padajú do priekopy.', l: 160 }; SHAKE = Math.max(SHAKE, 1.5); return;
    }
    if (Math.abs(u.y - 480) < 70 && (C.oil || 0) <= 0) {
        C.oil = 900;
        for (const v of U) if (foe(v) && v.x > 920 && v.x < 1004 && v.y > 415 && v.y < 545) hit(v, 45, u);
        for (let i = 0; i < 24; i++) PT.push({ x: 960 + Math.random() * 40, y: 430 + Math.random() * 100, vx: Math.random() - .5, vy: -Math.random(), g: .03, l: 30, c: '#ff8a20' });
        TS = { s: 'Vriaci olej zalial bránu!', l: 140 }; return;
    }
    if ((C.rock || 0) <= 0) {
        C.rock = 220; const x = u.x - 55, y = u.y;
        for (const v of U) if (foe(v) && Math.hypot(v.x - x, v.y - y) < 45) { hit(v, 28, u); v.stun = 20; }
        PT.push({ x, y, ring: 1, rr: 30, l: 14, c: '#c8c0b0' });
    }
}
/** Šíp: štít hrdinu (pri kryte) alebo štít vojaka spredu ho zachytí. */
function arrowBlocked(v, a) {
    const rel = angD(v.f, Math.atan2(-a.vy, -a.vx));
    if (v.h) { if (CMB.blk && CMB.shp > 0 && rel < 1.4) { CMB.shp = Math.max(0, CMB.shp - 4); blockFx(v, Math.atan2(-a.vy, -a.vx), 1); return true; } return false; }
    if (rel < 1.1 && Math.random() < blockChance(v) * .8) { blockFx(v, Math.atan2(-a.vy, -a.vx), 1); return true; }
    return false;
}
/** Iskry a záblesk pri kryte. */
function blockFx(u, from, shield) {
    const x = u.x + Math.cos(from) * u.r, y = u.y + Math.sin(from) * u.r - 3;
    for (let i = 0; i < 6; i++) PT.push({ x, y, vx: Math.cos(from) * 2 + Math.random() * 3 - 1.5, vy: -1.5 - Math.random() * 2, g: .18, l: 12 + Math.random() * 6, c: '#fff0b0', sp: 1 });
    PT.push({ x, y, ring: 1, rr: shield ? 12 : 8, l: 10, c: shield ? '#c8d8ff' : '#ffffff' });
    snd('sh');
}

/** AI vojaka na blízko: nápriah (varovanie), úder, nápor jazdy. Vráti true, ak sa vojak tento snímok už nehýbe. */
function aiMelee(u, b, bd, dt) {
    if (u.wu > 0) {
        u.wu -= dt; u.f = dirTo(u, u.wt || b);
        if (u.wu <= 0) { const t = u.wt; u.lwd = u.wd; if (t && t.hp > 0 && Math.hypot(t.x - u.x, t.y - u.y) < 22 + (t.r || 6) * .5) meleeHit(u, t, u.d * (.7 + Math.random() * .6), 'ai'); u.c = heavy(u) ? 40 : 33; u.wt = null; u.atkN = (u.atkN || 0) + 1; }
        return true;
    }
    if (bd > 13) { if (mounted(u)) u.run = (u.run || 0) + dt; return false; }
    if (u.c > 0 || wallBlocked(u, b)) return false;
    if (mounted(u) && u.run > 40) {   // jazda v plnom cvale: nápor
        const a = dirTo(u, b);
        if (meleeHit(u, b, u.d * 2.2, 'charge') && b.hp > 0) { b.x += Math.cos(a) * 12; b.y += Math.sin(a) * 12; if (!b.h) b.stun = 20; }
        if (b.h) SHAKE = Math.max(SHAKE, 1.5);
        u.run = 0; u.c = 45; return true;
    }
    u.run = 0;
    // smer úderu (ako ho vidí obranca): zľava, sprava, zhora, bod; trollovia a obri bijú zhora, kopijníci bodajú
    const sp = u.uk && FU[u.uk] && FU[u.uk].wp === 'sp', r = Math.random();
    u.wd = heavy(u) ? 'u' : sp ? (r < .6 ? 't' : r < .8 ? 'l' : 'r') : r < .34 ? 'l' : r < .68 ? 'r' : r < .86 ? 'u' : 't';
    u.wu = u.wu0 = (heavy(u) ? 22 : 12) + (b.h && OPT.blkDir === 'manual' ? 9 : 0); u.wt = b;
    return true;
}

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
    const s = b.t ? 1 : 0, C = CMB, loss = 85 / Math.max(8, C.n0[s]) * (b.uk || b.cp ? 1.3 : 1) * (heavy(b) ? 2 : 1);
    C.M[s] = Math.max(0, C.M[s] - loss); C.M[1 - s] = Math.min(100, C.M[1 - s] + loss * .3);
    if (b.boss) C.M[1] = Math.max(0, C.M[1] - 40);
    if (b.cmd) { C.M[1] = Math.max(0, C.M[1] - 25); TS = { s: 'Nepriateľský veliteľ padol! Morálka nepriateľa sa láme.', l: 160 }; }
    if (b.cp) C.M[0] = Math.max(0, C.M[0] - 8);
}

/** Rozkaz skupine: Držať a Šík určia každému vojakovi miesto (Šík = línia čelom k nepriateľom). */
function ordPlace(gs, k) {
    if (!U || mode !== 'battle') return;
    const mine = U.filter(u => !u.t && !u.ally && !u.h && u.hp > 0 && !u.rout), foes = U.filter(u => u.t && u.hp > 0);
    const ctr = a => a.length ? { x: a.reduce((s, u) => s + u.x, 0) / a.length, y: a.reduce((s, u) => s + u.y, 0) / a.length } : null;
    const ec = ctr(foes) || { x: BW - 100, y: BH / 2 }, all = ctr(mine);
    for (const g of gs) {
        const us = mine.filter(u => grpOf(u) === g);
        if (k !== 'h' && k !== 'l') { us.forEach(u => { u.hx = u.hy = undefined; }); continue; }
        if (k === 'h') { us.forEach(u => { u.hx = u.x; u.hy = u.y; }); continue; }
        if (!us.length) continue;
        const c = gs.length > 1 && all ? all : ctr(us), a = Math.atan2(ec.y - c.y, ec.x - c.x), px = -Math.sin(a), py = Math.cos(a);
        const off = gs.length > 1 ? { p: 22, l: -26, j: -62 }[g] : 0, per = 14;
        us.sort((p, q) => (p.x * px + p.y * py) - (q.x * px + q.y * py)).forEach((u, i) => {
            const row = Math.floor(i / per), col = i % per, n = Math.min(per, us.length - row * per);
            u.hx = Math.max(20, Math.min(BW - 20, c.x + Math.cos(a) * (off - row * 16) + px * (col - (n - 1) / 2) * 16));
            u.hy = Math.max(30, Math.min(BH - 20, c.y + Math.sin(a) * (off - row * 16) + py * (col - (n - 1) / 2) * 16));
        });
    }
}
/** Vojak drží svoje miesto (Držať, Šík): lukostrelci strieľajú, ostatní bojujú len s nepriateľmi pri sebe. Vráti true, ak je ťah hotový. */
function holdSlot(u, b, bd, dt) {
    if (u.hx == null) { u.hx = u.x; u.hy = u.y; }
    const dx = u.hx - u.x, dy = u.hy - u.y, ds = Math.hypot(dx, dy), archer = u.k === 'a' || u.k === 'e';
    const step = () => { if (ds > 3) { u.x += dx / ds * Math.min(ds, u.sp * dt); u.y += dy / ds * Math.min(ds, u.sp * dt); } };
    if (archer) { step(); u.f = dirTo(u, b); if (u.c <= 0 && bd < WX.r) { u.c = 75; const an = u.f + (Math.random() - .5) * .12; AR.push({ x: u.x, y: u.y, vx: Math.cos(an) * 7, vy: Math.sin(an) * 7, l: 40, t: u.t, d: u.k === 'e' ? 7 : 4.5, by: u }); snd('ar'); } return true; }
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
        if (act && typeof setOrd === 'function') setOrd({ o_a: 'a', o_h: 'h', o_f: 'f', o_l: 'l', o_r: 'r' }[act[0]]);
    });
    addEventListener('keyup', e => { const k = norm(e); if (k) keys[e.key] = keys[k] = false; });
    addEventListener('blur', () => { for (const k in keys) keys[k] = false; CMB.lmb = CMB.rmb = 0; });
}
