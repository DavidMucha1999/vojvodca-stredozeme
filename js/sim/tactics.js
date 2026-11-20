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
