/*
 * Taktická AI nepriateľa (ako veliteľ vo Warbande): spoločný postup pešiakov v línii, lukostrelci za líniou,
 * jazda obchádza krídlo a udiera na lukostrelcov, pri veľkej presile proti nim vojaci ustúpia.
 * tacUpdate sa volá raz za snímok z updBattle, tacTarget a tacMove z cyklu jednotiek (js/sim/battle.js).
 */
const TAC = { on: 0, t: 0, ret: 0, ox: 0, oy: 0, ax: 1, ay: 0, fx: 0, fy: 0, front: null, avgP: 0, ratio: 1 };
const isArcher = u => (u.k === 'a' || u.k === 'e') && !isHA(u);
const isFoot = u => !onMount(u) && u.k !== 'a' && u.k !== 'e';
const tacProj = u => (u.x - TAC.ox) * TAC.ax + (u.y - TAC.oy) * TAC.ay;
/** Plán veliteľa strany 1: os postupu, línia pešiakov, pomer síl; rozhodnutie o ústupe a o obchvate jazdou. Prepočítava sa každých 40 snímok. */
function tacUpdate(dt) {
    if (!U || !LB || LB.ar || LB.duel || SGB) { TAC.on = 0; return; }
    if ((TAC.t -= dt) > 0) return;
    TAC.t = 40;
    const own = U.filter(u => u.t === 1 && u.hp > 0 && !u.rout && !u.fled && !u.boss), foe = U.filter(u => !u.t && u.hp > 0 && !u.fled);
    if (own.length < 2 || !foe.length) { TAC.on = 0; return; }
    const ctr = a => ({ x: a.reduce((s, u) => s + u.x, 0) / a.length, y: a.reduce((s, u) => s + u.y, 0) / a.length });
    const oc = ctr(own), fc = ctr(foe), a = Math.atan2(fc.y - oc.y, fc.x - oc.x);
    Object.assign(TAC, { on: 1, ox: oc.x, oy: oc.y, ax: Math.cos(a), ay: Math.sin(a), fx: fc.x, fy: fc.y });
    const ps = own.filter(isFoot).map(tacProj).sort((p, q) => q - p);
    TAC.front = ps.length >= 3 ? ps.slice(0, Math.max(2, Math.ceil(ps.length / 3))).reduce((s, p) => s + p, 0) / Math.max(2, Math.ceil(ps.length / 3)) : null;
    TAC.avgP = ps.length ? ps.reduce((s, p) => s + p, 0) / ps.length : 0;
    const hp = L => L.reduce((s, u) => s + u.hp, 0);
    TAC.ratio = hp(own) / Math.max(1, hp(foe));
    // jazda: každý jazdec dostane stranu obchvatu (striedavo), kým nezaútočí na lukostrelcov
    let side = 1;
    for (const u of own) if (onMount(u) && !isHA(u) && !u.flk) { u.flk = { s: side, done: 0, t: 0 }; side = -side; if (!TAC.said) { TAC.said = 1; cmbSay('tfl', 'Nepriateľská jazda obchádza bojisko – chce zaútočiť na krídlo a lukostrelcov.', 200); } }
    // ústup pri veľkej presile: vojaci mimo boja sa stiahnu (ako vo Warbande veliteľ zatrúbi na ústup)
    if (!TAC.ret && TAC.ratio < .3 && CMB.M[1] < 55 && !BRES[1].length && own.length >= 4) {
        TAC.ret = 1;
        for (const u of own) if (!fearless(u) && !u.garrison && (u.bd || 0) > 70) rout(u);
        cmbSay('tret', 'Nepriateľský veliteľ trúbi na ústup!', 200);
    }
}
/** Cieľ jazdy po obchvate: najbližší lukostrelec protivníka do 600 jednotiek (inak ostáva pôvodný cieľ). */
function tacTarget(u, b) {
    if (!TAC.on || !u.t || u.boss || !u.flk || !u.flk.done || isHA(u) || !onMount(u)) return b;
    if (u.ctT > 0 && u.ct && u.ct.hp > 0 && !u.ct.fled) { u.ctT--; return u.ct; }
    let best = null, bd = 600;
    for (const v of U) if (!v.t && v.hp > 0 && !v.fled && !v.h && (v.k === 'a' || v.k === 'e')) { const d = Math.hypot(v.x - u.x, v.y - u.y); if (d < bd) { bd = d; best = v; } }
    u.ct = best; u.ctT = 25;
    return best || b;
}
/** Pohyb podľa taktiky; vráti true, ak jednotka tento tik už hýbala (inak ide bežná AI). */
function tacMove(u, b, bd, dt) {
    if (!TAC.on || !u.t || u.boss || u.h || u.rout) return false;
    if (u.flk && !u.flk.done && onMount(u) && !isHA(u)) {   // obchvat: ísť za krídlo protivníka
        const F = u.flk; F.t += dt;
        const wx = Math.max(60, Math.min(BW - 60, TAC.fx + TAC.ax * 80 - TAC.ay * F.s * 420)), wy = Math.max(60, Math.min(BH - 60, TAC.fy + TAC.ay * 80 + TAC.ax * F.s * 420)), d = Math.hypot(wx - u.x, wy - u.y);
        if (d < 170 || F.t > 2400 || bd < 60) { F.done = 1; return false; }
        u.f = Math.atan2(wy - u.y, wx - u.x); u.x += (wx - u.x) / d * u.sp * dt; u.y += (wy - u.y) / d * u.sp * dt;
        return true;
    }
    if (isArcher(u) && TAC.front != null && bd > 150 && tacProj(u) > TAC.front - 70) {   // lukostrelci držia za líniou pešiakov
        u.f = dirTo(u, b); if (u.c <= 0 && bd < WX.r) aiBow(u, b, 7); else u.aim = 0;
        return true;
    }
    if (isFoot(u) && bd > 300) {   // postup v línii: kto vybehol pred ostatných, spomalí
        const ahead = tacProj(u) - TAC.avgP, f = Math.max(.4, 1 - Math.max(0, ahead - 25) / 120);
        if (f < 1) { u.f = dirTo(u, b); u.x += (b.x - u.x) / bd * u.sp * f * dt; u.y += (b.y - u.y) / bd * u.sp * f * dt; return true; }
    }
    return false;
}
/** Rozkazy hráča z klávesnice (ako vo Warbande): vpred / vzad o 10 krokov (120 jednotiek k nepriateľovi alebo od neho) pre vybranú skupinu,
 *  palba na povel / držať palbu pre lukostrelcov. Vpred a vzad nastavia skupine rozkaz Držať na nových miestach (každý vojak o 120 ďalej). */
const PACES10 = 120;
function tacOrder(act) {
    if (!U || mode !== 'battle') return;
    if (act === 'o_hf') { CMB.hf = !CMB.hf; TS = { s: CMB.hf ? 'Lukostrelci: držte palbu!' : 'Lukostrelci: palba na povel – strieľajte!', l: 120 }; return; }
    const gs = CMB.sel === 'all' ? ['p', 'l', 'j'] : [CMB.sel], foes = U.filter(u => u.t && u.hp > 0 && !u.fled);
    if (!foes.length) return;
    const ec = { x: foes.reduce((s, u) => s + u.x, 0) / foes.length, y: foes.reduce((s, u) => s + u.y, 0) / foes.length }, k = act === 'o_adv' ? 1 : -1;
    let n = 0;
    for (const u of U) {
        if (u.t || u.ally || u.h || u.hp <= 0 || u.rout || !gs.includes(grpOf(u))) continue;
        const a = dirTo(u, ec);
        u.hx = Math.max(30, Math.min(BW - 30, u.x + Math.cos(a) * PACES10 * k)); u.hy = Math.max(40, Math.min(BH - 30, u.y + Math.sin(a) * PACES10 * k)); n++;
    }
    gs.forEach(g => { CMB.og[g] = 'h'; if (CMB.at) delete CMB.at[g]; });
    ORD = 'h'; odSync();
    TS = { s: GRP_N[CMB.sel] + ': ' + (k > 0 ? 'vpred o 10 krokov' : 'vzad o 10 krokov') + (n ? '' : ' (nikto)') + '!', l: 100 };
}
/** Tipy počas prvej bitky (G.tut): postupne ukážu pohyb, útok, kryt a rozkazy; po prvej bitke sa už nezobrazujú. */
const TUT = [[90, 'Pohyb: W A S D. Myš mieri a určuje smer úderu.'], [520, 'Medzerník udrie, Shift kryje – kryt do smeru úderu je dokonalý.'], [1000, 'Rozkazy vojsku: 1 – 4 vyberú skupinu, T útok, H držať, F za mnou, G šík.'], [1700, 'C / Z posunú skupinu o 10 krokov vpred / vzad, J drží palbu lukostrelcov.'], [2500, 'Keď tvoji muži utekajú, bojový pokrik (V) ich vráti.']];
function tutTick() {
    if (!G || G.tut || !U || !U[0] || LB && (LB.ar || LB.duel)) return;
    const tt = U[0].tt || 0, C = CMB;
    for (let i = 0; i < TUT.length; i++) if (tt >= TUT[i][0] && !C['tut' + i]) { C['tut' + i] = 1; TS = { s: TUT[i][1], l: 300 }; break; }
}
/** Cieľ obrany hradu (ako pri Helmovom žľabe): vydržať do úsvitu. Čas v snímkach (60 = sekunda); slávne hrady majú dlhšiu noc, ostatné 7000. */
const HOLD_T = { 'Helmov žľab': 10000, 'Minas Tirith': 9500, 'Edoras': 8500, 'Erebor': 9000, 'Rivendell': 8000, 'Minas Morgul': 8000 };
/** Zvláštne vlny nepriateľa pri obrane slávnych hradov (pri 30 % a 65 % noci): [druh, počet, správa, poškodenie brány]. */
const HOLD_WAVE = {
    'Helmov žľab': [['i', 8, 'Výbuch pod múrom! Uruk-hai sa valia cez trhlinu.', 45], ['i', 10, 'Dosky na rebríky – nová vlna Uruk-haiov!', 0]],
    'Minas Tirith': [['x', 2, 'Mûmakil sa blížia – zem sa chveje!', 0], ['z', 1, 'Nazgûl krúži nad hradbami!', 0]],
    'Edoras': [['w', 8, 'Vargovia vyskakujú z tmy!', 0], ['w', 8, 'Ďalšie vlčie svorky obkľučujú mesto!', 0]],
    'Erebor': [['t', 3, 'Trollovia ťahajú baran k bráne!', 30], ['t', 2, 'Posledná vlna trolov!', 0]],
};
const holdWave = (t, i) => HOLD_WAVE[t.n] ? HOLD_WAVE[t.n][i] : i ? ['i', 8, 'Nepriateľ vysiela ďalšiu vlnu!', 0] : null;
/** Zostávajúce sekundy do úsvitu pri obrane hradu, inak null (zobrazuje ich UIScene). */
const holdLeft = () => LB && LB.hold && SGB && SGB.att === 1 && U && U[0] ? Math.max(0, Math.ceil((LB.hold - (U[0].tt || 0)) / 60)) : null;
/** Obrana hradu: správy o postupe noci a za úsvitu stiahnutie nepriateľa (víťazstvo). Vráti true, ak bitka skončila. */
function holdDawn() {
    if (!LB || !LB.hold || !SGB || SGB.att !== 1 || mode !== 'battle') return false;
    const tt = U[0].tt || 0, C = CMB, left = holdLeft(), mm = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
    if (tt >= 60 && !C.hd0) { C.hd0 = 1; TS = { s: 'Drž hradby do úsvitu – ešte ' + mm + '.', l: 300 }; }
    else if (tt >= LB.hold * .5 && !C.hd1) { C.hd1 = 1; TS = { s: 'Noc sa prelamuje – vydrž, do úsvitu ešte ' + mm + '.', l: 260 }; }
    else if (tt >= LB.hold * .85 && !C.hd2) { C.hd2 = 1; TS = { s: 'Na východe sa rozednieva! Ešte chvíľu…', l: 260 }; }
    for (const [i, f] of [[0, .3], [1, .65]]) if (tt >= LB.hold * f && !C['hw' + i]) {
        C['hw' + i] = 1;
        const w = holdWave(TW[LB.def], i); if (!w) continue;
        const [k, n, msg, gd] = w;
        for (let j = 0; j < n; j++) { const u = mk(1, k, LB.f); u.x = 30 + Math.random() * 40; u.y = 140 + Math.random() * (BH - 280); u.f = 0; u.rf = 1; U.push(u); }
        CMB.n0[1] += n; if (gd && SGB) SGB.gate = Math.max(0, SGB.gate - gd);
        TS = { s: msg, l: 300 }; wbMsg(msg, '#ff9a80'); snd('horn');
    }
    if (tt < LB.hold) return false;
    for (const u of U) if (u.t && u.hp > 0) { u.fled = 1; u.hp = 0; }
    BRES[1] = []; LB.dawn = 1; endBattle(true);
    return true;
}
