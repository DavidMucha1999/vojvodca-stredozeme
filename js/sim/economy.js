/*
 * Dni a hospodárstvo: prosperita hradov a dedín, príjem, budovy vlastného hradu, denné udalosti (obchod, počasie, spoločníci,
 * zajatci, dvor, automatické uloženie, Prsteň) a denná ozvena povahy lordov (česť a strach hráča).
 */
const lvl = o => Math.min(5, 1 + Math.floor((o.pr ?? 40) / 20)), DOOM = { x: 1690 * K, y: 600 * K };
/** Denný príjem z vlastného hradu podľa prosperity a budov. */
const castleIncome = t => lvl(t) * 4 + (G.king ? 20 : 10) + (t.bd && t.bd.m ? 10 : 0) + (t.bd && t.bd.t ? lvl(t) * 2 : 0);
/** Budovy vlastného hradu: [kľúč, názov, cena]. Účinky: mlyn zlato, kasárne pešiaci, veža obrancovia,
 *  kováčska dielňa lacnejšia výbava, stajňa lacnejšie kone a jazdci, chrám morálka v bitke, trhovisko tovar a prosperita. */
const BUILDINGS = [['m', 'Mlyn (+10 zlata denne)', 200], ['k', 'Kasárne (+1 pešiak denne)', 250], ['v', 'Strážna veža (+8 obrancov)', 180],
    ['s', 'Kováčska dielňa (výbava o 20 % lacnejšia)', 300], ['j', 'Stajňa (kone o 25 % lacnejšie, +1 jazdec za 3 dni)', 320], ['c', 'Chrám (tvoji vojaci sú v bitke pevnejší)', 260], ['t', 'Trhovisko (viac tovaru, +prosperita, +zlato)', 280]];
function daily2() {
    TW.forEach(t => { t.pr = Math.min(100, (t.pr ?? 40) + 1 + (t.bd && t.bd.m ? 1 : 0) + (t.bd && t.bd.t ? 1 : 0) + (t.mine ? taxPr() : 0)); if (t.mine)
        G.gold += Math.round((lvl(t) * 4 + (t.bd && t.bd.t ? lvl(t) * 2 : 0)) * taxMul() * fiefShare(t)); });
    if ((G.tax || 'normal') === 'high') E.forEach(e => { if (e.f === G.fac && e.vas && e.loy != null) e.loy = Math.max(0, e.loy - .1); });
    if (G.camp && G.stay) G.hp = Math.min(mh(), G.hp + 25);   // pobyt v hrade: rýchlejšie hojenie
    dailyTrade();
    dailyWeather();
    compDaily();
    prisonersDaily();
    courtDaily();
    if (mode === 'map' && save('auto')) TS = TS && TS.l > 0 ? TS : { s: 'Hra automaticky uložená (deň ' + G.day + ').', l: 150 };
    if (G.comp && G.comp.length && Math.random() < .5) { const c = compDef(G.comp[Math.floor(Math.random() * G.comp.length)]); if (c) TS = { s: c.n + ': „' + compLine(c) + '“', l: 320 }; }
    VL.forEach(v => { v.pr = Math.max(0, Math.min(100, (v.pr ?? 40) + (v.st > 0 ? -2 : 1) + (TW[v.t].mine ? taxPr() : 0))); if (TW[v.t].mine)
        G.gold += lvl(v) * 2; });
    if (G.ring === 1) {
        G.cor = Math.min(100, (G.cor || 0) + 2);
        E.forEach(e => { if (e.f === G.fac)
            e.rl = (e.rl || 0) - .5; });
        if (E.filter(e => e.nz).length < 4) {
            const t = TW.find(t => t.f === 2);
            if (t)
                E.push({ id: ++NID, x: t.x, y: t.y + 30, f: 2, nz: 1, n: 4, vx: 0, vy: 0, w: 0, nm: 'Nazgûl' });
        }
        if (G.cor >= 100) {
            G.ring = 0;
            G.cor = 0;
            G.hp = Math.max(10, G.hp - 50);
            lg('Prsteň ťa ovládol a Nazgûli si ho vzali späť.');
        }
    }
    ach();
    upd();
}
function dailyEcho() {
    E.forEach(e => { per(e); if (e.f === G.fac || e.rl) {
        if (e.tr === 0)
            e.rl = (e.rl || 0) + (G.hon || 0) * .02;
        if (e.tr === 4)
            e.rl = (e.rl || 0) + (G.fear || 0) * .02;
        if (e.tr === 3 && e.f === G.fac && !e.vas)
            e.rl = (e.rl || 0) - .2;
    } });
    if ((G.fear || 0) > 20)
        G.gold += Math.floor(G.fear / 10);
}
