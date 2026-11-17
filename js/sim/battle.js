/*
 * Bitka: tvorba jednotiek, začiatok a koniec bitky, boj, šípy, rozkazy a hradby pri obliehaní.
 */
/** Rýchlosť na bojisku: pešiaci ~5 m/s, jazda do ~12 m/s (pôvodné hodnoty boli príliš veľké a pohyb nepôsobil prirodzene). */
const BSPD = { i: .85, o: .85, a: .85, e: .85, v: .8, c: .64, r: .64, w: .75, z: .8, t: .9, x: .9, n: .9 };
const bsp = (k, v) => v * (BSPD[k] || .85);
function mkBase(t, k, f) {
    const P = { i: [30, 1.2, 5, 6], c: [45, 1.9, 7, 8], o: [24 + Math.min(20, G.day * 1.5), 1.1, 4, 6], a: [24, 1.1, 5, 6], e: [26, 1.3, 6, 6], r: [60, 2.1, 9, 9], t: [120, .8, 14, 11], w: [18, 2.2, 5, 5], x: [220, .7, 20, 15], v: [50, 1.25, 8, 7], z: [150, 1.5, 13, 10], n: [260, .8, 22, 13] }[k], hp = P[0];
    return { bn: Math.random() < .1, fc: f, k, t, x: t ? BW - 120 - Math.random() * 140 : 100 + Math.random() * 140, y: 140 + Math.random() * (BH - 280), hp, mh: hp, sp: bsp(k, P[1]), d: P[2], c: 0, r: P[3], f: t ? Math.PI : 0 };
}
function startBattleBase(en, al) {
    LB = en;
    en.al = al;
    en.n0 = en.n;
    AR = [];
    en.n = Math.max(1, Math.round(en.n));
    PT = [];
    U = [{ h: 1, t: 0, x: 140, y: BH / 2, hp: G.hp, mh: mh(), sp: (G.eq.m ? .45 + .6 * it('m').v : .8 * it('m').v) * (1 + .08 * G.s.ob) * (G.eq.m && perk('jazda') ? 1.1 : 1), c: 0, r: 9, k: 'h', f: 0 }];
    const cap = n => Math.round(n * (perk('vojvodca') ? 1.5 : 1) * BSZ());   // perk Vojvodca: viac vojakov v bitke
    for (let i = 0; i < Math.min(G.inf, cap(40)); i++)
        U.push(mk(0, 'i'));
    for (let i = 0; i < Math.min(G.cav, cap(20)); i++)
        U.push(mk(0, 'c'));
    for (let i = 0; i < Math.min(G.arc, cap(20)); i++)
        U.push(mk(0, 'a'));
    for (let i = 0; i < Math.min(G.vet, cap(20)); i++)
        U.push(mk(0, 'v'));
    for (let i = 0; i < Math.min(G.elf, cap(15)); i++)
        U.push(mk(0, 'e'));
    for (let i = 0; i < Math.min(G.roh, cap(12)); i++)
        U.push(mk(0, 'r'));
    for (let i = 0; i < Math.min(G.ent || 0, 3); i++)
        U.push(mk(0, 'n'));
    // zálohy (ako vo Warbande): kto sa nezmestí na bojisko, príde v ďalšej vlne, keď vlastných ubudne
    BRES = [[], []];
    if (!en.ar && !en.duel) [['i', G.inf, 40], ['c', G.cav, 20], ['a', G.arc, 20], ['v', G.vet, 20], ['e', G.elf, 15], ['r', G.roh, 12]].forEach(([k, n, c]) => { for (let i = cap(c); i < (n || 0); i++) BRES[0].push([k]); });
    // kto sa pridá: spojenci hráča a priatelia nepriateľa v okolí (pri obliehaní celý tábor), posádka pri obrane hradu
    BSIDES = battleSides(en, al);
    U.push(...sideUnits(BSIDES.allies, 0, Math.round(ALLY_CAP * BSZ())));
    if (en.def != null) { const t = TW[en.def], gn = Math.min(Math.round(30 * BSZ()), Math.max(2, t.g)); BSIDES.gUnits = gn; for (let i = 0; i < gn; i++) { const u = mk(0, i % 3 === 2 ? 'a' : 'i', t.f); u.ally = 1; u.garrison = 1; U.push(u); } }
    const nF = en.ar || en.duel ? en.n : Math.min(en.n, Math.round(FOE_FIELD * BSZ()));   // nepriatelia nad limit bojiska čakajú v zálohe
    for (let i = 0; i < en.n; i++)
        if (i < nF) U.push(mk(1, foeKind(en, i), en.f)); else BRES[1].push([foeKind(en, i), en.f]);
    U.push(...sideUnits(BSIDES.foes, 1, Math.max(0, Math.round(FOE_CAP * BSZ()) - nF)));
    BRES.k = [en.def != null ? 1.25 : 1, 1];   // posilnenie zdravia, ktoré dostanú aj zálohy
    if (en.siege) {
        const sg = en.t.sg || {}, k = 1.3 + (en.t.wl || 0) * .15 - (sg.tow ? .15 : 0) - (en.sgFood != null && en.sgFood <= 0 ? .1 : 0);   // veža a hlad oslabujú obrancov
        U.forEach(u => { if (u.t) u.hp = u.mh = u.mh * k; }); BRES.k[1] = k;
    }
    if (en.def != null)   // obrana hradu: hradby pomáhajú hráčovej strane
        U.forEach(u => { if (!u.t) u.hp = u.mh = u.mh * 1.25; });
    mode = 'battle';
    CMB.sel = 'all'; CMB.og = { p: G.ord0 || 'a', l: G.ord0 || 'a', j: G.ord0 || 'a' }; odSync();
    od.style.display = 'flex';
    tb.style.display = 'none';
    WX = battleWeather();       // počasie z mapy, v noci kratší dostrel
    snd('horn');
    roar(1);
    BI = regionAt(G.x, G.y);
    FIELD = battleTerrain(G.x, G.y);   // bojisko podľa miesta na mape (les, rieka, kopec)
    if (BI === 's' && WX.n === 'clear')
        WX = { ...WX, n: 'snow', r: Math.round(WX.r * .85) };
}
/** Druh i-teho vojaka nepriateľskej armády (miesta: trollovia, Beorn – medveď, pavúky; tlupy orkov, vargov a dezertérov). */
const foeKind = (en, i) => en.nz ? 'z' : en.trolls || en.beorn ? 't' : en.spiders ? 'w' : en.kind === 'wolves' ? (i % 3 ? 'w' : 'uI2') : en.kind === 'orcs' ? (i % 7 === 6 ? 't' : i % 4 === 3 ? 'uM1' : 'o') : en.kind === 'deserters' ? (i % 3 === 2 ? 'a' : i % 5 === 4 ? 'c' : 'i') : (i % 3 === 1 && FK[en.f] && FK[en.f].length ? FK[en.f][i % 2] : ek(en.f, i));
/** Okruh, z ktorého sa do bitky pridávajú ďalšie armády, a najväčší počet ich vojakov na bojisku.
 *  FOE_FIELD: najviac vojakov hlavnej nepriateľskej armády naraz na bojisku (× veľkosť bitky); zvyšok príde vo vlnách. */
const JOIN_R = 300, ALLY_CAP = 30, FOE_CAP = 70, FOE_FIELD = 80;
/** Zálohy oboch strán: BRES[0] tvoji, BRES[1] nepriateľ – zoznam [druh, frakcia]; BRES.k = násobok zdravia (hradby, obliehanie). */
let BRES = [[], []];
/** Posily vo vlnách (ako vo Warbande): keď na bojisku ostane menej ako polovica vlastných vojakov strany, dobehne z jej okraja
 *  ďalšia vlna zo zálohy (najviac do pôvodného počtu). Strana na úteku (morálka pod 15) posily nedostane. */
function reinforce(dt) {
    if (!BRES[0].length && !BRES[1].length) return;
    if ((CMB.rfT = (CMB.rfT || 0) + dt) < 60) return;
    CMB.rfT = 0;
    for (const t of [0, 1]) {
        if (!BRES[t].length || CMB.M[t] < 15) continue;
        const own = u => u.t === t && !u.h && !u.ally && !u.src && !u.garrison && !u.cp && !u.boss, cap = CMB.fc[t] || 1;
        const alive = U.filter(u => own(u) && u.hp > 0 && !u.rout).length;
        if (alive > cap * .5) continue;
        const n = Math.min(BRES[t].length, Math.max(1, cap - alive));
        for (let i = 0; i < n; i++) {
            const [k, f] = BRES[t].shift(), u = mk(t, k, f);
            u.x = t ? BW - 20 - Math.random() * 40 : 20 + Math.random() * 40;
            if (SGB && SGB.att === 1) u.x = BW - u.x;   // obrana hradu: strany sú vymenené
            u.hp = u.mh = u.mh * ((BRES.k || [1, 1])[t] || 1); u.rf = 1; u.f = u.x > BW / 2 ? Math.PI : 0;
            U.push(u);
        }
        CMB.n0[t] += n; CMB.M[t] = Math.min(100, CMB.M[t] + 6);
        const left = BRES[t].length ? ' (v zálohe ešte ' + BRES[t].length + ')' : '';
        if (t) { TS = { s: 'Nepriateľovi dorazili posily: ' + n + ' mužov' + left + '.', l: 160 }; wbMsg('Nepriateľské posily: +' + n, '#ff9a80'); }
        else { TS = { s: 'Posily dorazili! ' + n + ' tvojich mužov vstupuje do boja' + left + '.', l: 160 }; wbMsg('Tvoje posily: +' + n, '#9fe08a'); snd('horn'); }
    }
}
/** Padol hrdina: ak má strana ešte koho, bitka pokračuje (ako vo Warbande) – kamera sleduje tvojich vojakov,
 *  podržaný medzerník bitku zrýchli. V aréne a v súboji veliteľov bitka končí hneď. */
function heroFell() {
    const C = CMB; if (C.down || !LB || LB.ar || LB.duel) return false;
    if (!U.some(u => !u.t && !u.h && u.hp > 0 && !u.rout) && !BRES[0].length) return false;
    C.down = 1; C.blk = 0; C.rd = null; C.sw = null; C.camU = null;
    C.M[0] = Math.max(0, C.M[0] - 10);
    TS = { s: 'Padol si! Zranený ležíš na bojisku, ale tvoji muži bojujú ďalej. Drž medzerník – bitka pobeží rýchlejšie.', l: 420 };
    wbMsg('Padol si – tvoji muži bojujú ďalej.', '#ff9a80');
    return true;
}
/** Koho sleduje kamera: hrdinu, alebo po jeho páde najbližšieho živého vojaka tvojej strany. */
function camUnit() {
    const h = U && U[0]; if (!h || h.hp > 0 || !CMB.down) return h;
    const c = CMB.camU; if (c && c.hp > 0 && !c.fled) return c;
    const p = c || h; let best = null, bd = 1e9;
    for (const u of U) if (!u.t && u.hp > 0 && !u.fled) { const d = Math.hypot(u.x - p.x, u.y - p.y); if (d < bd) { bd = d; best = u; } }
    CMB.camU = best; return best || h;
}
let FFW = 0;
/** Veľkosť bitiek (Nastavenia): normálna ×1 (do ~150 vojakov), veľká ×2,5 (do ~350), obrovská ×5 (500 a viac). */
const BSZ = () => ({ n: 1, v: 2.5, o: 5 })[typeof OPT !== 'undefined' && OPT.bsize] || 2.5;
let BSIDES = { allies: [], foes: [] };
/** Kto sa pridá do bitky (ako vo Warbande): spojenci hráča v okolí, ktorí sú vo vojne s nepriateľom, a armády priateľské
 *  nepriateľovi. Pri útoku na hrad bojujú všetci spojenci z obliehacieho tábora; pri obrane hradu všetci obliehatelia. */
function battleSides(en, al) {
    if (en.ar || en.vil || en.sortie != null) return { allies: [], foes: [] };
    if (en.siege) { const i = TW.indexOf(en.t); return { allies: en.t.sg ? besiegers(i).filter(e => !hos(e.f, G.fac)) : [], foes: [] }; }
    if (en.def != null) return { allies: [], foes: en.foes || [] };
    const near = E.filter(o => o !== en && !o.dead && !o.nz && Math.hypot(o.x - G.x, o.y - G.y) < JOIN_R);
    const allies = near.filter(o => o.f !== 9 && !hos(o.f, G.fac) && hos(o.f, en.f));
    if (al && !al.dead && !allies.includes(al)) allies.unshift(al);
    const foes = en.f === 9 || en.f == null ? [] : near.filter(o => !allies.includes(o) && hos(o.f, G.fac) && (o.f === en.f || AL[en.f][o.f]));
    return { allies, foes };
}
/** Vojaci pridaných armád: každá dostane podiel z limitu podľa svojej sily; jednotka si pamätá svoju armádu (straty po bitke). */
function sideUnits(armies, team, cap) {
    const tot = armies.reduce((a, e) => a + e.n, 0), out = [];
    if (!tot || cap <= 0) return out;
    armies.forEach(e => {
        const k = Math.max(1, Math.round(Math.min(cap, tot) * e.n / tot)), fk = FK[e.f] || [];
        for (let i = 0; i < k; i++) { const u = mk(team, i % 3 === 1 && fk.length ? fk[i % fk.length] : ek(e.f, i), e.f); u.src = e; if (!team) u.ally = 1; out.push(u); }
    });
    return out;
}
/** Straty pridaných armád a posádky podľa padlých vojakov na bojisku; spojencom sa za pomoc zlepší vzťah. */
function sideLosses(win, L) {
    for (const e of BSIDES.allies.concat(BSIDES.foes)) {
        const us = U.filter(u => u.src === e); if (!us.length) continue;
        const dead = us.filter(fallen).length;
        e.n = Math.max(0, e.n - e.n * dead / us.length * .9);
        if (BSIDES.foes.includes(e) && win) e.n *= .85;   // porazení pomocníci nepriateľa sa rozpŕchnu
        if (e.n < 1) e.dead = 1;
        if (BSIDES.allies.includes(e)) { e.rl = (e.rl || 0) + 4; rl(G.fac, e.f, 2); lordMem(e, 'Bojovali sme bok po boku' + (LB && LB.nm ? ' proti ' + LB.nm : '') + '.'); }
    }
    if (L.def != null && BSIDES.gUnits) { const t = TW[L.def], gu = U.filter(u => u.garrison), dead = gu.filter(fallen).length; t.g = Math.max(2, Math.round(t.g * (1 - dead / gu.length * .9))); }
    if ((L.siege || L.sortie != null) && L.t) {   // preživší obrancovia sa vrátia za hradby
        const en = U.filter(u => u.t && !u.src), alive = en.filter(u => !fallen(u)).length;
        if (L.sortie != null) L.t.g += Math.round(alive * L.n / Math.max(1, en.length));
        else if (!win) L.t.g = Math.max(3, Math.round(L.t.g * alive / Math.max(1, en.length)));
    }
}
/** Meno jednotky pre tabuľku výsledkov. */
function unitName(u) {
    if (u.h) return G.name;
    if (u.cp) { const c = compDef(u.cp); return c ? c.n : 'Spoločník'; }
    if (u.uk && FU[u.uk]) return FU[u.uk].n;
    return { i: 'Pešiak', a: 'Lukostrelec', c: 'Jazdec', v: 'Veterán', r: 'Rohirim', e: 'Elf', o: 'Ork', t: 'Troll', w: 'Varg', x: 'Olifant', z: 'Nazgûl', n: 'Ent' }[u.k] || 'Vojak';
}
/** Výsledná tabuľka bitky: víťaz, straty podľa druhu na oboch stranách, najlepší bojovník. Pridá riadky do otvoreného okna. */
function battleReport(win) {
    const bt = document.getElementById('bt'); if (!bt) return;
    const line = (text, color) => row(text, { color });
    const tally = side => { const m = {}; U.filter(u => u.t === side && fallen(u)).forEach(u => { const n = unitName(u); m[n] = (m[n] || 0) + 1; }); return Object.entries(m).map(([n, c]) => c + '× ' + n).join(', ') || 'nikto'; };
    const mine = U.filter(u => !u.t), their = U.filter(u => u.t);
    line('Výsledok: ' + (win ? 'víťazstvo' : 'porážka') + ' – ' + (win ? 'tvoja strana' : (LB && LB.nm ? LB.nm : 'nepriateľ')) + ' ovládla bojisko.', '#ffd24a');
    line('Tvoje straty (' + mine.filter(fallen).length + '/' + mine.length + '): ' + tally(0));
    line('Straty nepriateľa (' + their.filter(fallen).length + '/' + their.length + '): ' + tally(1));
    const fl = side => U.filter(u => u.t === side && u.fled).length;
    if (fl(1)) line('Z bojiska utieklo nepriateľov: ' + fl(1) + '.', '#ffd24a');
    if (fl(0)) line('Z tvojich mužov utieklo (vrátia sa k družine): ' + fl(0) + '.');
    if (BSIDES.allies.length) line('Po tvojom boku bojovali: ' + BSIDES.allies.map(e => e.nm).join(', ') + '.', '#9fe08a');
    if (BSIDES.gUnits) line('Po tvojom boku bojovala posádka hradu.', '#9fe08a');
    if (BSIDES.foes.length) line('Nepriateľovi prišli na pomoc: ' + BSIDES.foes.map(e => e.nm).join(', ') + '.', '#ff8a70');
    const best = mine.filter(u => (u.kills || 0) > 0 || (u.dmg || 0) > 0).sort((a, b) => (b.kills || 0) - (a.kills || 0) || (b.dmg || 0) - (a.dmg || 0))[0];
    if (best) line('Najlepší bojovník: ' + unitName(best) + ' – ' + (best.kills || 0) + ' zabití, ' + Math.round(best.dmg || 0) + ' zranení.', '#9fe08a');
    const worst = their.sort((a, b) => (b.kills || 0) - (a.kills || 0))[0];
    if (worst && worst.kills) line('Najnebezpečnejší nepriateľ: ' + unitName(worst) + ' – ' + worst.kills + ' zabití.', '#ff9a80');
}
/** Chrám v niektorom z tvojich hradov: tvoji vojaci sú pevnejší (o 10 % menej zranení). */
const temple = () => TW.some(t => t.mine && t.bd && t.bd.c);
function hit(b, d, from) {
    if (b.fly > 0) return;   // drak vo vzduchu
    const was = b.hp > 0;
    if (from && onHill(from) && !onHill(b)) d *= 1.15;   // útok z kopca
    if (from && !from.t && !from.h && perk('taktik')) d *= 1.1;   // perk Taktik
    if (!b.t) d *= DIFF_MUL();   // obťažnosť (js/ui/settings.js)
    if (b.h && CMB.horse > 0 && !b.dis) { const hd = d * .35; CMB.horse -= hd; d -= hd; if (CMB.horse <= 0) horseDown(b); else horseHurt(hd); }   // časť úderov schytá kôň
    b.hp -= d * (b.h ? red() : !b.t && temple() ? .9 : 1);
    if (from) { from.dmg = (from.dmg || 0) + d; if (was && b.hp <= 0) from.kills = (from.kills || 0) + 1; }
    if (was && b.hp <= 0) cmbDeath(b);
    snd(b.hp <= 0 ? 'dy' : typeof WB_SND === 'string' && WB_SND ? WB_SND : b.h ? 'sh' : Math.random() < .5 ? 'sw' : 'hb');   // zvuk podľa materiálu (js/sim/warband.js)
    for (let i = 0; i < 4; i++)
        PT.push({ x: b.x, y: b.y, vx: Math.random() * 3 - 1.5, vy: Math.random() * 3 - 1.5, l: 18, c: b.t ? '#8a2a1a' : '#d9a441' });
    for (let i = 0; i < 3; i++)   // iskry kovu: letia hore a padajú
        PT.push({ x: b.x, y: b.y - 4, vx: Math.random() * 4 - 2, vy: -2 - Math.random() * 2.5, g: .18, l: 14 + Math.random() * 8, c: '#fff0b0', sp: 1 });
    if (b.hp <= 0 && OPT.blood) for (let i = 0; i < 6; i++) PT.push({ x: b.x, y: b.y, vx: Math.random() * 2 - 1, vy: -.4 - Math.random() * .8, l: 30, c: '#5a1a12', g: .02, bl: 1 });   // krv pri páde
    if (from && (from.k === 't' || from.k === 'x' || from.k === 'n' || from.k === 'z')) SHAKE = Math.max(SHAKE, from.k === 'x' ? 3 : 2);   // ťažký úder otrasie kamerou
}
function mk(t, k, f) {
    if (k === 'roh')
        k = 'r';
    if (k === 'elf')
        k = 'e';
    const F = FU[k];
    if (!F)
        return mkBase(t, k, f);
    const u = mkBase(t, F.b, F.f);
    Object.assign(u, { uk: k, hp: F.hp, mh: F.hp, d: F.d, sp: bsp(F.b, F.sp), r: F.r, fc: F.f });
    return u;
}
let SGB = null, PAUSE = 0, KD = 0, SHAKE = 0;
function startBattle(en, al) {
    if (en.ar) {   // aréna: hrdina bojuje sám, vojsko ostáva pred bránou
        const s = { inf: G.inf, cav: G.cav, arc: G.arc, elf: G.elf, roh: G.roh, vet: G.vet };
        G.inf = G.cav = G.arc = G.elf = G.roh = G.vet = 0;
        startBattleBase(en, al);
        Object.assign(G, s);
    } else {
        startBattleBase(en, al);
        for (const k in FU)
            if (k[0] === 'u' && G[k])
                for (let i = 0; i < G[k]; i++)
                    if (i < 15) U.push(mk(0, k)); else BRES[0].push([k]);   // vylepšené jednotky nad limit čakajú v zálohe
        U.push(...compUnits());    // spoločníci bojujú ako hrdinovia
    }
    if (en.siege) {
        const sg = en.t.sg || {};
        SGB = { gate: 60 + (en.t.wl || 0) * 30, mg: 60 + (en.t.wl || 0) * 30, lad: sg.lad, ram: sg.ram, tow: sg.tow, att: 0 };
    }
    else if (en.def != null && TW[en.def] && TW[en.def].sg) {   // obrana hradu: ty a posádka na hradbách, nepriateľ útočí zľava
        const t = TW[en.def], sg = t.sg;
        SGB = { gate: 60 + (t.wl || 0) * 30, mg: 60 + (t.wl || 0) * 30, lad: sg.lad || (!sg.ram && !sg.tow ? 1 : 0), ram: sg.ram, tow: sg.tow, att: 1 };
        for (const u of U) u.x = BW - u.x;   // strany sa vymenia: obrancovia vpravo za hradbami
        let wi = 0; for (const u of U) if (!u.t && (u.k === 'a' || u.k === 'e')) { u.x = 1018 + (wi % 2) * 14; u.y = 120 + (wi * 47) % (BH - 240); u.hx = u.x; u.hy = u.y; wi++; }   // lukostrelci na hradby
        U[0].x = 1080; U[0].y = BH / 2; U[0].f = Math.PI;
        U.forEach(u => { u.f = u.t ? 0 : Math.PI; });
    }
    else
        SGB = null;
    if (en.boss) { if (!BOSSES[en.boss].minions) { U = U.filter(u => !u.t); BRES[1] = []; } U.push(makeBoss(en.boss)); }   // boss (js/sim/bosses.js)
    cmbStart(en);   // morálka, veliteľ, výdrž, štít a šípy hrdinu (js/sim/combat.js)
}
function endBattle(win) {
    compAfterBattle();
    SGB = null;
    const L = LB;
    if (!L.ar) { sideLosses(win, L); if (!win) siegeLost(L); }
    horseAfter();   // padnutý kôň sa nemusí vrátiť
    if (L.duel) { compAfterBattle(); return duelEnd(win, L); }   // súboj veliteľov (js/sim/bosses.js)
    if (L.ar) {   // turnaj v aréne
        mode = 'over';
        od.style.display = 'none';
        tb.style.display = 'flex';
        roar(0);
        G.safe = 180;
        G.hp = Math.max(20, U[0].hp);
        if (win) {
            const g = 80 + G.lv * 20;
            G.gold += g;
            G.ren++;
            G.tw = (G.tw || 0) + 1;
            rl(G.fac, L.t.f, 5);
            lg('Víťazstvo v turnaji v ' + L.t.n + '.');
            evShow('Víťaz turnaja', 'Ľud ťa oslavuje. Získal si ' + g + ' zlata a +1 slávu.');
        }
        else
            evShow('Porážka v aréne', 'Prebral si sa v ošetrovni. Nabudúce budeš mať viac šťastia.');
        btn('Pokračovať', () => { ov.classList.add('hide'); mode = 'map'; });
        upd();
        ach();
        afterBattleFlags(win, L);
        return;
    }
    {
        if (win) {
            G.dl = G.dl || [];
            G.tro = G.tro || [];
            if (L.nm && !L.siege && !L.vil)
                G.dl.unshift(L.nm + ' (' + FN[L.f] + ', deň ' + G.day + ')');
            if (L.kr) {
                G.tro.push('Koruna panovníka: ' + L.nm);
                lg('Trofej: koruna panovníka ' + L.nm + '.');
            }
            if (L.nz) {
                G.nzk = (G.nzk || 0) + 1;
                G.tro.push('Morgulská čepeľ Nazgûla');
            }
            if (!G.ring && (L.nz && Math.random() < .5 || L.kr && L.f === 2)) {
                G.ring = 1;
                G.cor = 0;
                lg('Našiel si Jeden prsteň!');
            }
            if (L.f === 9 && Math.random() < .3)
                G.tro.push('Lúpežnícky poklad: ' + L.nm);
            if (G.bounty && L.id === G.bounty.id) { G.gold += G.bounty.g; G.hon = (G.hon || 0) + 2; G.ren++; lg('Dedinčania ti za porážku tlupy ' + L.nm + ' dali ' + G.bounty.g + ' zlata. Česť +2.'); G.bounty = null; }   // odmena za tlupu z prosby dedinčanov
            if (L.vil)
                L.vil.pr = Math.max(0, (L.vil.pr ?? 40) - 30);
            if (L.siege)
                L.t.pr = Math.max(0, (L.t.pr ?? 40) - 15);
        }
        for (const u of U)
            if (u.uk && !u.cp) {
                if (!u.t && fallen(u) && G[u.uk] > 0)
                    G[u.uk]--;
                u.k = 'fx';
            }
        if (!win)
            for (const k in FU)
                if (k[0] === 'u' && G[k])
                    G[k] = Math.floor(G[k] / 2);
        {
            const dI = U.filter(u => !u.t && !u.ally && !u.cp && u.k === 'i' && fallen(u)).length, dC = U.filter(u => !u.t && !u.ally && u.k === 'c' && fallen(u)).length;
            {
                const S = G.st || (G.st = { b: 0, w: 0, l: 0, k: 0, d: 0, c: 0, r: 0 });
                S.b++;
                S[win ? 'w' : 'l']++;
                S.k += U.filter(u => u.t && fallen(u)).length;
                S.d += U.filter(u => !u.t && !u.h && !u.ally && !u.cp && fallen(u)).length;
                if (win && LB.siege)
                    S.c++;
                if (win && LB.vil)
                    S.r++;
                if (win && LB.nz) {
                    G.ren += 2;
                    lg('Porazil si Nazgûla!');
                }
            }
            mode = 'over';
            od.style.display = 'none';
            tb.style.display = 'flex';
            G.safe = 180;
            G.chase = null;
            roar(0);
            if (LB && LB.id != null && MAR[LB.f] === LB.id) { if (win) mst(LB.f).losses++; else mst(LB.f).wins++; }   // maršal v bitke s hráčom
            E = E.filter(e => e !== LB);
            if (win) {
                const loot = LB.n * 7 + 10 + (LB.siege ? 120 : 0) + (LB.vil ? 80 + Math.floor(Math.random() * 80) : 0);
                let up = 0;
                if (LB.vil)
                    LB.vil.st = 8;
                if (LB.siege) {
                    const ti = TW.indexOf(LB.t), sg = LB.t.sg;
                    if (sg && sg.lead !== 'G' && sg.f !== G.fac) {   // obliehanie viedla spojenecká frakcia: hrad pripadne jej
                        const ld = E.find(e => e.id === sg.lead) || null;
                        siegeCapture(ti, sg.f, (ld ? ld.nm : FN[sg.f]) + ' a ' + G.name, ld);
                        G.ren += 2; lg('Pomohol si ' + FN[sg.f] + ' dobyť hrad ' + LB.t.n + '.');
                    } else {
                        lg('Dobyl si hrad ' + LB.t.n + ' aj s okolitými dedinami.');
                        siegeCapture(ti, G.fac, G.name, null);
                        LB.t.g = 8;
                        LB.t.mine = 1;
                    }
                }
                if (LB.def != null) {   // obrana hradu: obliehatelia sú rozprášení
                    const t = TW[LB.def]; (LB.foes || []).forEach(e => { e.n = Math.max(2, e.n * .35); if (CP[e.f] === LB.def) CP[e.f] = null; e.mu = null; });
                    t.sg = null; G.defend = -1; G.ren += 2; rl(G.fac, t.f, 8); lg('Ubránil si hrad ' + t.n + '. Obliehanie je prelomené.');
                }
                G.inf = Math.max(0, G.inf - dI);
                G.arc = Math.max(0, G.arc - U.filter(u => !u.t && !u.ally && u.k === 'a' && fallen(u)).length);
                G.vet = Math.max(0, G.vet - U.filter(u => !u.t && !u.ally && u.k === 'v' && fallen(u)).length);
                G.elf = Math.max(0, G.elf - U.filter(u => !u.t && !u.ally && u.k === 'e' && fallen(u)).length);
                G.roh = Math.max(0, G.roh - U.filter(u => !u.t && !u.ally && u.k === 'r' && fallen(u)).length);
                G.cav = Math.max(0, G.cav - dC);
                if (G.ent) G.ent = Math.max(0, G.ent - U.filter(u => !u.t && u.k === 'n' && fallen(u)).length);
                G.gold += loot;
                G.ren++;
                G.xp += Math.round(LB.n * 5 * (G.twise ? 1.1 : 1));
                G.hp = Math.max(20, U[0].hp);
                wpInit();   // body bojových schopností (js/sim/mastery.js)
                while (G.lv >= 1 && G.xp >= G.lv * 30 && up < 200) {
                    G.xp -= G.lv * 30;
                    G.lv++;
                    up++;
                    G.sk++;
                    G.pp = (G.pp || 0) + 1;   // bod perku (perks.js)
                    G.bk++;   // bod bojovej schopnosti
                }
                if (up)
                    G.hp = mh();
                upd();
                const lv = up ? ` Nová úroveň: ${G.lv}, zdravie je plné, +${up} bod schopností a perku (Družina → Perky).` : '';
                G.pmv = Math.min(20, (G.pmv || 0) + 8); G.pm = Math.min(100, (G.pm ?? 60) + 4);   // víťazstvo dvíha morálku družiny
                if (perk('slavny')) G.ren++;
                const wnd = woundAfterBattle();
                (G.wf = G.wf || {})[LB.f] = (G.wf[LB.f] || 0) + 1;   // víťazstvá proti frakciám (vedľajšie výpravy)
                const bossTxt = LB.boss ? ' ' + bossReward(LB.boss) : '';
                if (G.king && G.ren >= 30 && !G.endK) {   // kráľ so slávou 30: koniec hry (raz), potom sa dá hrať ďalej
                    G.endK = 1;
                    ending('king');
                    ach();
                    afterBattleFlags(win, L);
                    return;
                }
                evShow('Víťazstvo', (CMB.down ? 'Padol si zranený, ale tvoji muži bitku dobojovali. ' : '') + 'Padlo ' + (dI + dC) + ' tvojich mužov' + (wnd ? ' (z padlých ' + wnd + ' prežilo ranených – vrátia sa po vyliečení)' : '') + '. Korisť: ' + loot + ' zlata.' + lv + bossTxt);
                battleReport(true);
                const L = LB;
                if (!L.siege)
                    G.cap += Math.floor(L.n * .3);
                const ko = U.filter(u => u.t && u.ko && fallen(u) && !u.boss).length;   // omráčení tupými zbraňami
                if (ko) { G.cap += ko; lg('Omráčených nepriateľov zajatých po bitke: ' + ko + '.'); }
                G.txp += L.n * 3;
                if (!L.siege && !L.vil) {
                    qChk('k', L.f);
                    questEvent('k', L.f);
                }
                if (L.siege)
                    qChk('c', L.t.n);
                if (L.al) {
                    rl(G.fac, L.al.f, 10);
                    L.al.rl = (L.al.rl || 0) + 15;
                }
                if (L.nm && !L.siege && !L.boss) {
                    btn('Zajať veliteľa ' + L.nm + ' (výkupné)', () => { capturePrisoner(L); ov.classList.add('hide'); mode = 'map'; upd(); }, 0, 'chain');
                    btn('Popraviť', () => { rl(G.fac, L.f, -18); lordsOf(L.f).forEach(e => lordMem(e, 'Popravil si ' + L.nm + '.', -8)); ov.classList.add('hide'); mode = 'map'; });
                    btn('Prepustiť (vzťah +8)', () => { rl(G.fac, L.f, 8); lordsOf(L.f).forEach(e => lordMem(e, 'Prepustil si ' + L.nm + ' po bitke.', 2)); G.ren++; ov.classList.add('hide'); mode = 'map'; upd(); });
                }
                else {
                    rl(G.fac, L.f, -10);
                    btn('Pokračovať', () => { ov.classList.add('hide'); mode = 'map'; });
                }
            }
            else if ((G.pm = Math.max(0, (G.pm ?? 60) - 15)) >= 0 && L.nm && L.f !== 9 && !L.siege && !L.vil && !L.nz && Math.random() < .6 && captureHero(L)) {   // porážka: morálka družiny −15
                G.inf = Math.max(2, Math.floor(G.inf / 2));
                G.cav = Math.floor(G.cav / 2);
                G.arc = Math.floor(G.arc / 2);
                upd();
                evShow('Zajatý', L.nm + ' ťa po bitke zajal. Prebral si sa v žalári hradu ' + TW[G.captive.t].n + '. Polovica mužov padla alebo sa rozutekala; zlato ti zatiaľ nechali – budú ho chcieť ako výkupné.');
                battleReport(false);
                btn('Pokračovať', () => { ov.classList.add('hide'); mode = 'map'; captiveDay(); });
            }
            else {
                G.inf = Math.max(3, Math.floor(G.inf / 2));
                G.cav = Math.floor(G.cav / 2);
                G.arc = Math.floor(G.arc / 2);
                G.gold = Math.floor(G.gold / 2);
                G.hp = mh();
                G.x = G.tx = TW[0].x;
                G.y = G.ty = TW[0].y;
                upd();
                evShow('Porazený', 'Prišiel si o polovicu zlata aj mužov. Prebral si sa v Hobitove.');
                battleReport(false);
                btn('Pokračovať', () => { ov.classList.add('hide'); mode = 'map'; });
            }
        }
        ach();
    }
    afterBattleFlags(win, L);
}
/** Po každej bitke: česť a strach za rabovanie, popravu a prepustenie (doplní sa k tlačidlám okna). */
function afterBattleFlags(win, L) {
    if (win && L.vil) {
        lordsOf(TW[L.vil.t].f).forEach(e => lordMem(e, 'Vyplienil si dedinu ' + L.vil.n + '.', -4));
        G.hon = (G.hon || 0) - 3;
        G.fear = (G.fear || 0) + 2;
    }
    [...document.querySelectorAll('#bt button')].forEach(b => { if (/^Popraviť/.test(b.textContent))
        b.addEventListener('click', () => { G.fear = (G.fear || 0) + 5; G.hon = (G.hon || 0) - 5; lg('Poprava sa rozniesla po kraji. Strach z teba rastie.'); upd(); }); if (/^Prepustiť/.test(b.textContent))
        b.addEventListener('click', () => { G.hon = (G.hon || 0) + 5; lg('Tvoja česť rastie.'); upd(); }); });
}
function updBattle(dt) {
    pollPad();   // ovládač (js/sim/combat.js)
    if (CMB.down && (keys[' '] || keys.Enter) && !FFW) {   // hrdina padol: podržaný medzerník bitku zrýchli (×4)
        FFW = 1; for (let i = 0; i < 3 && mode === 'battle'; i++) updBattle(dt); FFW = 0;
        if (mode !== 'battle') return;
    }
    {
        if (Math.random() < .06 * dt)
            snd('cl');
        compBattleShout();
        if (fx > 0)
            fx -= dt;
        const cu = camUnit();   // po páde hrdinu kamera sleduje tvojich vojakov
        bc.x = Math.max(0, Math.min(BW - W, cu.x - W / 2));
        bc.y = Math.max(0, Math.min(BH - H, cu.y - H / 2));
        for (const p of PT) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.g) p.vy += p.g * dt;
            p.l -= dt;
        }
        if (SHAKE > 0) SHAKE -= dt * .3;
        PT = PT.filter(p => p.l > 0);
        trackVel(dt); stepArrows(dt); wxTick(dt);
        if (U.length > 50 && (U[0].tt || 0) < 2700 && !(typeof B3 !== 'undefined' && B3.isOn() && B3.intro)) {   // vojnové bubny, kým sa vojská blížia (DUM . dum . DUM DUM . .)
            const b0 = Math.floor((U[0].tt || 0) / 14), b1 = Math.floor(((U[0].tt || 0) + dt) / 14);
            if (b1 !== b0 && typeof warDrum === 'function') { const k = [1, 0, .5, 0, 1, .9, 0, 0][b1 % 8]; if (k) warDrum(k * Math.min(1, (2700 - U[0].tt) / 600)); }
        }   // šípy v 3D s gravitáciou a miestom zásahu (js/sim/warband.js)
        for (const u of U) {
            if (u.hp <= 0)
                continue;
            u.c -= dt;
            u.x = Math.max(10, Math.min(BW - 10, u.x));
            u.y = Math.max(20, Math.min(BH - 10, u.y));
            u.bs = u.bs || u.sp;
            u.sp = u.bs * fieldSlow(u) * (u.h ? heroSpeedK() : 1);   // ťažká výbava spomalí hrdinu (js/sim/warband.js)
            if (u.rout) { u.as = null; cmbFlee(u, dt); continue; }
            if (u.stun > 0) { u.stun -= dt; u.as = null; continue; }   // zapotácaný vojak nedokončí úder
            if (u.boss) { let bt = null, bd2 = 1e9; for (const v of U) if (v.t !== u.t && v.hp > 0) { const d = Math.hypot(v.x - u.x, v.y - u.y) * (v.h ? .8 : 1); if (d < bd2) { bd2 = d; bt = v; } } bossAI(u, bt, dt); continue; }
            if (u.h) {
                let mx = 0, my = 0;
                if (GP && Math.hypot(GP.mx, GP.my) > .25) { mx = GP.mx; my = GP.my; CMB.km = 1; }   // ľavá páčka ovládača
                if (keys.ArrowLeft || keys.a)
                    mx--;
                if (keys.ArrowRight || keys.d)
                    mx++;
                if (keys.ArrowUp || keys.w)
                    my--;
                if (keys.ArrowDown || keys.s)
                    my++;
                if ((mx || my) && typeof B3 !== 'undefined' && B3.isOn()) [mx, my] = B3.rel(mx, my);   // 3D: pohyb vzhľadom na kameru
                if (ptr.down && !CMB.km) {
                    const dx = ptr.x + bc.x - u.x, dy = ptr.y + bc.y - u.y, d = Math.hypot(dx, dy);
                    if (d > 8) {
                        mx = dx / d;
                        my = dy / d;
                    }
                }
                let mv = null;
                if (heroMounted()) {   // kôň ako vo Warbande: W/S plyn a brzda, A/D otáčanie, myš len mieri (js/sim/warband.js)
                    if (ptr.down && !CMB.km) mv = horseMove(u, mx, my, 1, dt);   // dotykové ovládanie: kôň ide k prstu
                    else {
                        let thr = (keys.ArrowUp || keys.w ? 1 : 0) - (keys.ArrowDown || keys.s ? 1 : 0), trn = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
                        if (GP && Math.hypot(GP.mx, GP.my) > .25) { thr = -GP.my; trn = GP.mx; }
                        mv = horseDrive(u, thr, trn, dt);
                    }
                }
                if (heroMounted()) { if (mv != null && !CMB.km) u.f = mv; }   // na koni sa hýbe len kôň (predtým pri mierení myšou šiel hrdina aj priamo klávesmi – kĺzal do strán)
                else if (mx || my) {
                    const m = Math.hypot(mx, my), k = CMB.blk && !heroMounted() ? .6 : 1;   // v kryte pešo pomalšie
                    mv = Math.atan2(my, mx);
                    if (!CMB.km) u.f = mv;
                    u.x = Math.max(8, Math.min(BW - 8, u.x + mx / m * u.sp * k * dt));
                    u.y = Math.max(20, Math.min(BH - 8, u.y + my / m * u.sp * k * dt));
                }
                cmbHero(u, dt, mv);   // mierenie, kryt, sek, bod, luk, pokrik, nápor (js/sim/combat.js)
            }
            else {
                if (u.ride > 0) { u.ride -= dt; u.f = u.hd = u.rideA; u.x += Math.cos(u.rideA) * u.sp * dt; u.y += Math.sin(u.rideA) * u.sp * dt; continue; }   // jazda po nápore prejde cez nepriateľa a otočí sa (ako vo Warbande)
                let b = null, bd = 1e9;
                if (U.length > 150 && u.tg && u.tg.hp > 0 && (u.tgT -= dt) > 0) { b = u.tg; bd = Math.hypot(b.x - u.x, b.y - u.y); }   // veľká bitka: najbližší nepriateľ sa hľadá len občas
                else {
                for (const v of U)
                    if (v.t !== u.t && v.hp > 0) {
                        const d = Math.hypot(v.x - u.x, v.y - u.y);
                        if (d < bd) {
                            bd = d;
                            b = v;
                        }
                    }
                u.tg = b; u.tgT = 5 + Math.random() * 4;
                }
                u.bd = bd;   // vzdialenosť k nepriateľovi (3D: nečinní vojaci búchajú do štítov a pokrikujú)
                if (!u.t && !u.ally && b) {
                    const ORD = CMB.og[grpOf(u)] || 'a';   // rozkaz skupiny vojaka (pechota, lukostrelci, jazda)
                    if (ORD === 'r') {
                        u.f = Math.PI;
                        u.x = Math.max(20, u.x - u.sp * 1.15 * dt);
                        continue;
                    }
                    if ((ORD === 'h' || ORD === 'l') && holdSlot(u, b, bd, dt))
                        continue;
                    if (ORD === 'f') {
                        const h = U[0], ix = U.indexOf(u), tx = h.x - 30, ty = h.y + (ix % 11 - 5) * 22, dd = Math.hypot(tx - u.x, ty - u.y);
                        if (dd > 25 && bd > 45) {
                            u.x += (tx - u.x) / dd * u.sp * dt;
                            u.y += (ty - u.y) / dd * u.sp * dt;
                            u.f = 0;
                            continue;
                        }
                    }
                }
                if (b) {
                    const hx0 = u.x, hy0 = u.y;
                    u.f = Math.atan2(b.y - u.y, b.x - u.x);
                    if (isHA(u)) haAI(u, b, bd, dt);   // jazdecký lukostrelec krúži a strieľa
                    else if ((u.k === 'a' || u.k === 'e')) {
                        if (bd > 150) {
                            u.x += (b.x - u.x) / bd * u.sp * dt;
                            u.y += (b.y - u.y) / bd * u.sp * dt;
                        }
                        else if (bd < 90) {
                            u.x -= (b.x - u.x) / bd * u.sp * dt;
                            u.y -= (b.y - u.y) / bd * u.sp * dt;
                        }
                        if (u.c <= 0 && bd < WX.r) aiBow(u, b, 7); else u.aim = 0;
                    }
                    else if (aiMelee(u, b, bd, dt)) { }   // nápriah a úder, nápor jazdy (js/sim/combat.js)
                    else if (bd > aiStop(u)) {
                        u.x += (b.x - u.x) / bd * u.sp * dt;
                        u.y += (b.y - u.y) / bd * u.sp * dt;
                    }
                    else aiSpacing(u, b, bd, dt);   // odstup kopijníkov a úkroky zručných vojakov (js/sim/warband.js)
                    if (onMount(u)) horseAI(u, hx0, hy0, dt);   // kôň ide dopredu a zatáča oblúkom
                }
            }
        }
        sepUnits(dt);   // telesná kolízia: vojaci sa neprekrývajú (js/sim/warband.js)
        cmbMorale(dt);
        reinforce(dt);   // posily vo vlnách zo záloh
        if (U[0].hp <= 0 && !CMB.down) heroFell();
        U[0].tt = (U[0].tt || 0) + dt;
        const mineUp = U.some(u => !u.t && u.hp > 0) || (BRES[0].length > 0 && CMB.M[0] >= 15);   // záloha na úteku už nepríde
        if (U[0].tt > 9000) {
            const s = t => U.filter(u => u.t === t && u.hp > 0).reduce((a, u) => a + u.hp, 0);
            endBattle(s(0) >= s(1));   // dlhá bitka: rozhodne zostávajúce zdravie
        }
        else if (U[0].hp <= 0 && (!CMB.down || !mineUp))   // hrdina padol a niet, kto by bojoval ďalej
            endBattle(false);
        else if (!U.some(u => u.t && u.hp > 0) && (!BRES[1].length || CMB.M[1] < 15))
            endBattle(true);
        else if (U.some(u => u.t && u.hp > 0) && !U.some(u => u.t && u.hp > 0 && !u.rout) && (CMB.endT += dt) > 150) {   // všetci nepriatelia utekajú: bojisko je tvoje (aj ich zálohy sa stiahnu)
            for (const u of U) if (u.t && u.hp > 0) { u.fled = 1; u.hp = 0; }
            BRES[1] = [];
            endBattle(true);
        }
        else if (CMB.down && !U.some(u => !u.t && u.hp > 0 && !u.rout) && (CMB.endT0 += dt) > 150) {   // po páde hrdinu utekajú všetci tvoji: prehra
            for (const u of U) if (!u.t && u.hp > 0) { u.fled = 1; u.hp = 0; }
            endBattle(false);
        }
    }
    if (!SGB || mode !== 'battle')
        return;
    // útočníci (SGB.att: 0 = tvoja strana útočí, 1 = bránisz hrad) prechádzajú len bránou, rebríkmi a vežou;
    // obrancovia môžu stáť aj na hradbách (x 1000–1050) a odtiaľ bojovať, strieľať a zhadzovať rebríky
    const LY = [250, 710], att = SGB.att ?? 0, off = SGB.ladOff || [0, 0];
    for (const u of U) {
        if (u.hp <= 0)
            continue;
        const A = u.t === att, gate = SGB.gate <= 0 && u.y > 440 && u.y < 520, lad = SGB.lad && A && LY.some((l, i) => Math.abs(u.y - l) < 22 && !(off[i] > 0)), tow = SGB.tow && A && Math.abs(u.y - 610) < 34;   // veža: široký prechod
        if (A) { if (u.x > 990 && u.x < 1050 && !gate && !lad && !tow) u.x = u.x < 1020 ? 990 : 1050; }
        else if (u.x < 1000 && u.x > 980 && !gate) u.x = 1000;   // obrancovia nevyjdú von inak než bránou
        if (A && !u.h && u.x >= 980 && u.x <= 992) {
            const py = [480, ...(SGB.lad ? LY.filter((l, i) => !(off[i] > 0)) : []), ...(SGB.tow ? [610] : [])].reduce((a, b) => Math.abs(b - u.y) < Math.abs(a - u.y) ? b : a);
            u.y += Math.sign(py - u.y) * Math.min(Math.abs(py - u.y), u.sp * dt * 1.2);
        }
        if (!A && u.x >= 1048 && u.x <= 1056 && SGB.gate <= 0)
            u.y += Math.sign(480 - u.y) * Math.min(Math.abs(480 - u.y), u.sp * dt);
    }
    if (SGB.gate > 0) {
        let n = 0;
        for (const u of U)
            if (u.t === att && u.hp > 0 && u.x > 950 && u.x < 995 && u.y > 425 && u.y < 535)
                n++;
        SGB.gate -= n * dt * (SGB.ram ? .06 : .015) + (SGB.ram && n ? dt * .05 : 0);
        if (n && Math.random() < .05 * dt)
            snd('sh');
        if (SGB.gate <= 0) {
            lg('Brána padla!');
            snd('horn');
        }
    }
}
