/*
 * Spoločníci (dáta v js/data/companions.js).
 * G.comp = zoznam id spoločníkov v družine, G.chp = ich zdravie mimo bitky (0–1), G.cgone = id tých, čo odišli navždy.
 * Spoločník sa dá nájsť v krčme svojho hradu (ak je hrad priateľský a máš dosť slávy), v bitke bojuje ako silný
 * hrdina s vlastným vzhľadom a po bitke sa lieči. Ak v bitke padne, je ranený a niekoľko dní nebojuje.
 */
const compDef = id => COMPANIONS.find(c => c.id === id);
const myComps = () => (G.comp || []).map(compDef).filter(Boolean);
/** Spoločníci, ktorí čakajú v hrade t. */
const compsAt = t => COMPANIONS.filter(c => c.at === t.n && c.side === heroSide() && !(G.comp || []).includes(c.id) && !(G.cgone || []).includes(c.id));
function compJoin(c) {
    G.comp = G.comp || []; G.chp = G.chp || {};
    G.comp.push(c.id); G.chp[c.id] = 1;
    lg(c.n + ' sa pridal k tvojej družine.');
    upd();
}
function compLeave(c) {
    G.comp = (G.comp || []).filter(id => id !== c.id);
    lg(c.n + ' opustil družinu.');
    upd();
}
/** Náhodná hláška spoločníka. */
const compLine = c => c.lines[Math.floor(Math.random() * c.lines.length)];
/** Jednotky spoločníkov do bitky (volá startBattle). */
function compUnits() {
    return myComps().filter(c => (G.chp && G.chp[c.id] != null ? G.chp[c.id] : 1) > .25 && !(G.cwound && G.cwound[c.id] > G.day)).map(c => ({
        cp: c.id, t: 0, x: 120 + Math.random() * 40, y: BH / 2 - 60 + Math.random() * 120, hp: c.hp * (G.chp[c.id] || 1), mh: c.hp, sp: c.sp, d: c.d, c: 0, r: c.r, k: c.archer ? 'a' : 'i', uk: c.art && FU[c.art] ? c.art : undefined, f: 0, fc: G.fac, nm: c.n, bn: 0
    }));
}
/** Po bitke: zdravie spoločníkov, zranenie pri páde. */
function compAfterBattle() {
    if (!U) return;
    G.chp = G.chp || {}; G.cwound = G.cwound || {};
    for (const u of U) if (u.cp) {
        const c = compDef(u.cp);
        if (u.hp <= 0) { G.chp[u.cp] = .3; G.cwound[u.cp] = G.day + 3; lg(c.n + ' bol v bitke ranený a tri dni sa bude zotavovať.'); }
        else G.chp[u.cp] = Math.max(.3, u.hp / u.mh);
    }
}
/** Denné liečenie spoločníkov. */
function compDaily() {
    if (!G.chp) return;
    for (const id in G.chp) G.chp[id] = Math.min(1, G.chp[id] + (G.camp ? .35 : .2));
}
/** Hláška spoločníka v bitke (každých pár sekúnd jeden pokrik). */
let compShout = 0;
function compBattleShout() {
    const alive = U.filter(u => u.cp && u.hp > 0);
    if (!alive.length || tm < compShout) return;
    compShout = tm + 400 + Math.random() * 500;
    const u = alive[Math.floor(Math.random() * alive.length)], c = compDef(u.cp);
    TS = { s: c.n + ': „' + c.battle[Math.floor(Math.random() * c.battle.length)] + '“', l: 150 };
}
