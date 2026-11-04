/*
 * Obliehanie hradov (ako v Mount & Blade: Warband). Stav je uložený priamo v hrade: TW[i].sg, takže sa ukladá spolu s hradmi.
 *   sg = { f: frakcia útočníkov, d0: deň začiatku, lead: 'G' (vedie hráč) alebo id lorda, w: { lad, ram, tow } odpracovaná práca,
 *          lad/ram/tow: hotová technika (rebríky, baranidlo, obliehacia veža), build: čo hráč práve stavia, food: dni zásob posádky,
 *          fail: neúspešné útoky, ask: deň, kedy sa hráča naposledy pýtali na útok }
 * Technika sa stavia prácou mužov: každý deň pribudne toľko práce, koľko mužov oblieha (najviac 60). Rebríky = 90, baranidlo = 150,
 * veža = 300 práce (rebríky najskôr za dva dni, veža za päť). Kým nie sú rebríky alebo veža, na hradby sa nedá zaútočiť; AI útočí
 * najskôr na štvrtý deň, keď má všetku techniku, ktorú si na daný hrad naplánovalo (pevnejšie hradby = aj baranidlo a veža). Posádka počas obliehania nedostáva posily a je
 * odkázaná na zásoby; keď dôjdu, každý deň časť mužov zomrie od hladu alebo zbehne. Obrancovia môžu podniknúť výpad.
 * AI lordi (poľné vojsko maršala) oblieha rovnako; keď majú techniku, zaútočia – ak je hráč pri tom, môže sa pridať (alebo brániť).
 * Okná pre hráča sú v js/ui/siegeui.js.
 */
const SIEGE_WORK = { lad: 90, ram: 150, tow: 300 }, SIEGE_DAY_WORK = 60, SIEGE_NAME = { lad: 'rebríky', ram: 'baranidlo', tow: 'obliehacia veža' };
const SIEGE_R = 40 * K;   // okruh obliehacieho tábora okolo hradu
/** Nové obliehanie hradu i frakciou f (lead = 'G' alebo id lorda). */
function startSiege(i, f, lead) {
    const t = TW[i];
    t.sg = { f, d0: G.day, lead, w: { lad: 0, ram: 0, tow: 0 }, lad: 0, ram: 0, tow: 0, build: 'lad', food: siegeFood(t), fail: 0 };
    lg(FN[f] + ' začal obliehať hrad ' + t.n + '.');
    if (t.mine || t.f === G.fac) TS = { s: 'Hrad ' + t.n + ' je obliehaný! (' + FN[f] + ')', l: 400 };
    return t.sg;
}
/** Zásoby posádky v dňoch: väčší a bohatší hrad vydrží dlhšie, trhovisko pridá. */
const siegeFood = t => 6 + lvl(t) * 2 + (t.wl || 0) * 2 + (t.bd && t.bd.t ? 3 : 0);
/** Armády obliehateľov pri hrade i (spojenci frakcie obliehania, nepriatelia hradu). */
function besiegers(i) {
    const t = TW[i], s = t.sg; if (!s) return [];
    return E.filter(e => !e.dead && !e.nz && e.f !== 9 && (e.f === s.f || AL[s.f][e.f]) && hos(e.f, t.f) && Math.hypot(e.x - t.x, e.y - t.y) < SIEGE_R);
}
/** Lordi, ktorí bránia hrad i zvnútra (frakcia hradu v jeho bezprostrednej blízkosti). */
const defenders = i => { const t = TW[i]; return E.filter(e => !e.dead && e.f === t.f && Math.hypot(e.x - t.x, e.y - t.y) < 15 * K); };
/** Sila obrancov: posádka + lordi vnútri. */
const defStrength = i => TW[i].g + defenders(i).reduce((a, e) => a + e.n, 0);
/** Je hráč súčasťou obliehania i (vedie ho alebo sa pridal a stojí pri hrade)? */
const playerBesieging = i => G.besiege === i && Math.hypot(G.x - TW[i].x, G.y - TW[i].y) < SIEGE_R * 1.3;
/** Muži obliehateľov (hráčovo vojsko + lordi). */
const siegeMen = i => besiegers(i).reduce((a, e) => a + e.n, 0) + (playerBesieging(i) ? ar() : 0);
/** Postup práce na technike k (0–1). */
const siegeProg = (s, k) => s[k] ? 1 : Math.min(1, (s.w[k] || 0) / SIEGE_WORK[k]);
/** Dá sa zaútočiť na hradby (sú rebríky alebo veža)? */
const siegeReady = s => !!(s && (s.lad || s.tow));
/** Čo stavajú AI obliehatelia: rebríky, potom pri pevnejších hradbách baranidlo a vežu. */
function aiBuild(t) { const s = t.sg; return !s.lad ? 'lad' : (t.wl || 0) >= 1 && !s.ram ? 'ram' : (t.wl || 0) >= 2 && !s.tow ? 'tow' : null; }

/** Denný prepočet všetkých obliehaní (volá daily2). */
function siegeDaily() {
    TW.forEach((t, i) => {
        const s = t.sg; if (!s) return;
        if (!hos(t.f, s.f)) { t.sg = null; return; }   // mier alebo hrad zmenil majiteľa inak
        const bs = besiegers(i), me = playerBesieging(i);
        if (!bs.length && !me) { lg('Obliehanie hradu ' + t.n + ' sa skončilo – obliehatelia odtiahli.'); t.sg = null; if (G.besiege === i) G.besiege = -1; return; }
        // práca na technike
        const men = Math.min(SIEGE_DAY_WORK, siegeMen(i)) * (s.lead === 'G' && hasRole('inzinier') ? 1.3 : 1), k = s.lead === 'G' ? s.build : aiBuild(t);
        if (k && !s[k]) {
            s.w[k] = (s.w[k] || 0) + men;
            if (s.w[k] >= SIEGE_WORK[k]) { s[k] = 1; if (s.lead === 'G' || me) TS = { s: 'Pri ' + t.n + ' je hotová technika: ' + SIEGE_NAME[k] + '.', l: 320 }; if (s.lead === 'G') { s.build = !s.lad ? 'lad' : !s.ram ? 'ram' : !s.tow ? 'tow' : null; } }
        }
        // zásoby posádky a hlad
        s.food--;
        if (s.food <= 0) { const lost = Math.max(1, Math.ceil(t.g * .12)); t.g = Math.max(2, t.g - lost); if (me) TS = { s: 'V ' + t.n + ' došli zásoby: posádka hladuje (−' + lost + ' mužov).', l: 300 }; }
        // výpad obrancov
        const D = defStrength(i), A = siegeMen(i);
        if (D > A * .7 && t.g >= 8 && Math.random() < .2) {
            if (me) { SIEGE_EVENT = { kind: 'sortie', i }; return; }
            const kill = Math.min(A * .1, D * .15); bs.forEach(e => e.n = Math.max(2, e.n - kill / bs.length)); t.g = Math.max(3, t.g - Math.ceil(kill * .6));
        }
        // AI útok, keď je technika pripravená a hráč obliehanie nevedie
        if (s.lead !== 'G' && siegeReady(s) && !aiBuild(t) && G.day - s.d0 >= 3 && bs.length) {
            const pd = Math.hypot(G.x - t.x, G.y - t.y), near = pd < SIEGE_R * 1.6 && !G.captive;
            const withAtt = near && !hos(G.fac, s.f) && hos(G.fac, t.f), withDef = near && (G.defend === i || (!hos(G.fac, t.f) && hos(G.fac, s.f) && pd < 20 * K));
            if ((withAtt || withDef) && s.ask !== G.day) { s.ask = G.day; SIEGE_EVENT = { kind: withAtt ? 'assault' : 'defend', i }; return; }
            siegeAssaultAI(i);
        }
        // príliš slabé obliehanie sa rozpadne
        if (t.sg && s.lead !== 'G' && A < D * .45) { lg(FN[s.f] + ' zrušil obliehanie hradu ' + t.n + ' – obrancovia sú príliš silní.'); t.sg = null; if (CP[s.f] === i) CP[s.f] = null; if (G.besiege === i) G.besiege = -1; }
    });
}
/** Udalosť obliehania, ktorá čaká na okno hráča (útok, obrana, výpad); spracuje ju updMap, keď je mapa voľná. */
let SIEGE_EVENT = null;

/** Útok AI na hradby (bez hráča): sila útočníkov s technikou proti obrancom za hradbami. */
function siegeAssaultAI(i) {
    const t = TW[i], s = t.sg, bs = besiegers(i); if (!bs.length) return;
    const A = bs.reduce((a, e) => a + e.n, 0) * (s.tow ? 1.3 : 1) * (s.ram && (t.wl || 0) ? 1.1 : 1);
    const D = defStrength(i) * (1.5 + .2 * (t.wl || 0)) * (s.food <= 0 ? .8 : 1);
    const lead = bs.find(e => e.id === s.lead) || bs.reduce((a, b) => b.n > a.n ? b : a);
    if (A * (.8 + Math.random() * .4) > D) {
        bs.forEach(e => e.n = Math.max(3, e.n - D * .35 / bs.length));
        siegeCapture(i, lead.f, lead.nm, lead);
    } else {
        bs.forEach(e => e.n = Math.max(3, e.n - A * .15 / bs.length)); t.g = Math.max(3, Math.round(t.g * .8));
        s.fail++; mst(s.f).losses++;
        lg('Útok ' + FN[s.f] + ' na hradby ' + t.n + ' bol odrazený.');
        if (s.fail >= 3) { lg(FN[s.f] + ' po troch neúspešných útokoch zrušil obliehanie hradu ' + t.n + '.'); t.sg = null; if (CP[s.f] === i) CP[s.f] = null; if (G.besiege === i) G.besiege = -1; }
    }
}
/** Dobytie hradu i frakciou f (who = meno dobyvateľa, e = lord alebo null pre hráča). Spoločné pre AI aj hráča. */
function siegeCapture(i, f, who, e) {
    const t = TW[i], oldF = t.f;
    captureEvent(t, oldF, f, who); mst(f).wins++; courtEvent(f, 'won'); courtEvent(oldF, 'lost');
    defenders(i).forEach(o => { o.n = Math.max(2, o.n * .4); o.home = null; o.role = 'army'; });   // obrancovia utekajú zdecimovaní
    E.filter(o => o.home === i && o.f !== f).forEach(o => { o.n = Math.max(2, o.n * .5); o.home = null; });
    // podiel na koristi pre hráča, ak bol pri tom na strane útočníkov
    if (e && (G.besiege === i || (G.join && G.join.ci === i)) && Math.hypot(G.x - t.x, G.y - t.y) < SIEGE_R * 1.3) { G.ren += 3; G.gold += 60; e.rl = (e.rl || 0) + 6; lg('Za účasť na obliehaní si dostal podiel na koristi (60 zlata) a slávu.'); G.join = null; }
    if (G.defend === i) G.defend = -1;
    if (G.besiege === i) G.besiege = -1;
    t.lord = 0; t.f = f; t.g = 5; t.mine = 0; t.wl = 0; t.sg = null;
    if (CP[f] === i) CP[f] = null;
    if (e) e.mu = null;
}
/** Hráč prehral bitku pri obliehaní: útok na hradby zlyhal, bránený hrad padol, alebo výpad rozprášil jeho tábor. */
function siegeLost(L) {
    const i = L.siege ? TW.indexOf(L.t) : L.def != null ? L.def : L.sortie != null ? L.sortie : -1;
    if (i < 0) return;
    const t = TW[i], s = t.sg, bs = besiegers(i);
    if (L.def != null) {
        G.defend = -1;
        if (s && bs.length) { const ld = bs.reduce((a, b) => b.n > a.n ? b : a); siegeCapture(i, s.f, ld.nm, ld); }
        return;
    }
    G.besiege = -1;
    if (!s) return;
    if (L.siege) s.fail = (s.fail || 0) + 1;
    if (s.lead === 'G') {
        if (!bs.length) { t.sg = null; lg('Obliehanie hradu ' + t.n + ' sa skončilo tvojou porážkou.'); }
        else s.lead = bs.reduce((a, b) => b.n > a.n ? b : a).id;
    }
}
