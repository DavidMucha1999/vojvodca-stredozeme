/*
 * Zajatci a výkupné.
 * G.pri = zajatí velitelia [{ nm, f, n, kr, day, id }] (staré uloženia mali len mená – prevedie ich priMigrate).
 * Zajatý lord zmizne z mapy; jeho frakcia po pár dňoch pošle list s ponukou výkupného (LETTERS, kind 'ransom'),
 * zajatca možno aj prepustiť (česť, vzťah) alebo vydať svojmu kráľovi (sláva, priazeň). Zajatci občas utečú.
 * Hráč môže byť po porážke od lorda sám zajatý (G.captive): sedí v hrade víťaza, každý deň sa môže pokúsiť o útek,
 * zaplatiť výkupné alebo čakať; po 6 dňoch ho prepustia.
 */
const priMigrate = () => { G.pri = (G.pri || []).map(p => typeof p === 'string' ? { nm: p, f: 9, n: 6, day: G.day } : p); };
const ransomOf = p => 60 + Math.round((p.n || 6) * 7) + (p.kr ? 400 : 0) + (p.f === 9 ? -40 : 0);
/** Zajatie porazeného veliteľa L (po bitke). */
function capturePrisoner(L) {
    priMigrate();
    G.pri.push({ nm: L.nm, f: L.f, n: Math.round(L.n0 || L.n || 6), kr: !!L.kr, day: G.day, id: L.id, home: L.home });
    if (L.f !== 9) rl(G.fac, L.f, -5);
    lg('Zajal si veliteľa ' + L.nm + (L.f !== 9 ? ' (' + FN[L.f] + ')' : '') + '. Výkupné by mohlo byť okolo ' + ransomOf(G.pri[G.pri.length - 1]) + ' zlata.');
    G.ren += L.kr ? 3 : 1;
}
/** Prepustenie zajatca p (index) – späť na mapu k domovskému hradu. */
function releasePrisoner(i, how) {
    const p = G.pri.splice(i, 1)[0];
    if (!p) return;
    if (p.f !== 9) {
        const home = TW.find(t => t.f === p.f) || TW[0];
        E.push({ id: ++NID, x: home.x + 20, y: home.y + 30, f: p.f, n: 4 + Math.floor(Math.random() * 4), vx: 0, vy: 0, w: 0, nm: p.nm, kr: p.kr, home: TW.indexOf(home), role: 'army', rl: how === 'free' ? 12 : 0 });
    }
    if (how === 'free') { G.hon = (G.hon || 0) + 3; if (p.f !== 9) rl(G.fac, p.f, 6); lg('Prepustil si ' + p.nm + ' bez výkupného. Česť +3.'); }
    if (how === 'ransom') lg(p.nm + ' bol vykúpený a vracia sa domov.');
    if (how === 'escape') lg(p.nm + ' utiekol zo zajatia!');
}
/** Denná kontrola: ponuky výkupného listom, úteky, zajatie hráča. */
function prisonersDaily() {
    priMigrate();
    G.pri.forEach((p, i) => {
        if (p.f !== 9 && G.day - p.day >= 2 && !p.offered && Math.random() < .4) {
            p.offered = G.day; const g = ransomOf(p);
            LETTERS.push({ kind: 'ransom', from: FN[p.f], f: p.f, day: G.day, pri: p.nm, gold: g, text: (p.kr ? 'My, dvor ' : 'Lordi ') + FN[p.f] + ', sme sa dozvedeli, že držíš v zajatí ' + (p.kr ? 'nášho panovníka ' : 'nášho lorda ') + p.nm + '. Ponúkame ti za jeho slobodu ' + g + ' zlata. Odpovedz po poslovi.' });
        }
    });
    for (let i = G.pri.length - 1; i >= 0; i--) if (Math.random() < .03 + (G.inf < 5 ? .05 : 0)) releasePrisoner(i, 'escape');
    if (G.captive) captiveDay();
}
/** Odpoveď na list s ponukou výkupného. */
function ransomLetter(L) {
    const i = G.pri.findIndex(p => p.nm === L.pri);
    mode = 'town';
    show('List od ' + L.from + ': výkupné', '„' + L.text + '“' + (i < 0 ? ' (Zajatec už u teba nie je.)' : ''));
    btn('Prijať výkupné (' + L.gold + ' zlata)', () => { G.gold += L.gold; if (G.pri[i].f !== 9) rl(G.fac, G.pri[i].f, 3); releasePrisoner(i, 'ransom'); upd(); ov.classList.add('hide'); mode = 'map'; }, i < 0, 'coins');
    btn('Žiadať dvojnásobok (šanca 40 %)', () => { if (Math.random() < .4) { G.gold += L.gold * 2; releasePrisoner(i, 'ransom'); lg('Zaplatili dvojnásobok.'); } else { rl(G.fac, G.pri[i].f, -4); if (G.pri[i]) G.pri[i].offered = null; lg('Odmietli platiť viac. Zajatec ostáva u teba.'); } upd(); ov.classList.add('hide'); mode = 'map'; }, i < 0, 'scales');
    btn('Odmietnuť', () => { if (i >= 0) { rl(G.fac, G.pri[i].f, -3); G.pri[i].offered = null; } ov.classList.add('hide'); mode = 'map'; }, 0, 'back');
}
/** Okno zajatcov v hrade (karta „Vojsko, zajatci a odpočinok“). */
function prisonersMenu(back) {
    priMigrate();
    mode = 'town';
    const own = TW.some(t => t.mine);
    show('Zajatí velitelia', G.pri.length ? 'Držíš ' + G.pri.length + ' zajatých veliteľov. Ich frakcie ti pošlú ponuku výkupného; v hrade ich možno predať do väzenia za nižšiu sumu, vydať panovníkovi alebo prepustiť.' : 'Nikoho nedržíš v zajatí. Veliteľa zajmeš po víťaznej bitke.');
    G.pri.forEach((p, i) => {
        rowHead(p.nm + (p.kr ? ' (panovník)' : '') + ' · ' + FN[p.f] + ' · zajatý deň ' + p.day + ' · výkupné ~' + ransomOf(p));
        btn('Predať do väzenia (' + Math.round(ransomOf(p) * .6) + ')', () => { G.gold += Math.round(ransomOf(p) * .6); G.pri.splice(i, 1); lg(p.nm + ' skončil vo väzení.'); upd(); prisonersMenu(back); }, 0, 'coins');
        if (G.fac !== 6 && !G.king) btn('Vydať panovníkovi (sláva +2, priazeň)', () => { G.pri.splice(i, 1); G.ren += 2; E.forEach(e => { if (e.f === G.fac && e.kr) e.rl = (e.rl || 0) + 8; }); lg('Vydal si ' + p.nm + ' svojmu panovníkovi.'); upd(); prisonersMenu(back); }, 0, 'crown');
        btn('Prepustiť (česť +3, vzťah +6)', () => { releasePrisoner(i, 'free'); upd(); prisonersMenu(back); }, 0, 'door');
    });
    btn('Späť', back, 0, 'back');
}
/* ---------- zajatie hráča ---------- */
/** Po porážke od lorda: hráč je zajatý v najbližšom hrade víťazovej frakcie. */
function captureHero(L) {
    const ts = TW.filter(t => t.f === L.f), t = ts.length ? ts.reduce((b, x) => Math.hypot(x.x - G.x, x.y - G.y) < Math.hypot(b.x - G.x, b.y - G.y) ? x : b) : null;
    if (!t) return false;
    G.captive = { t: TW.indexOf(t), f: L.f, by: L.nm, day: G.day, tries: 0 }; G.safe = 1e9;
    G.x = G.tx = t.x; G.y = G.ty = t.y + 30; G.dest = -1; G.chase = null; G.hp = Math.max(20, Math.floor(mh() * .4));
    lg(L.nm + ' ťa zajal a odviedol do hradu ' + t.n + '.');
    return true;
}
/** Každý deň v zajatí: okno s voľbami. */
function captiveDay() {
    const C = G.captive; if (!C) return;
    const t = TW[C.t], days = G.day - C.day, ransom = Math.max(50, Math.round(G.gold * .3) + 40);
    mode = 'town'; G.tx = G.x; G.ty = G.y;
    if (days >= 6 || t.f !== C.f) { G.captive = null; G.safe = 200; mode = 'map'; msg(t.f !== C.f ? 'Hrad ' + t.n + ' padol a v zmätku ťa stráže pustili.' : 'Po šiestich dňoch ťa ' + C.by + ' prepustil – žalár je drahý a ty si už nikoho nezaujímal.', () => { ov.classList.add('hide'); mode = 'map'; }); return; }
    show('V zajatí: ' + t.n, 'Sedíš v žalári hradu ' + t.n + ' (' + FN[C.f] + ') už ' + days + '. deň. Zajal ťa ' + C.by + '. Družina čaká pred hradbami; vojaci sa pomaly rozchádzajú.');
    const esc = .22 + G.s.ob * .05 + (G.trait === 'cunning' ? .15 : 0);
    btn('Pokúsiť sa o útek (šanca ' + Math.round(esc * 100) + ' %)', () => { C.tries++; if (Math.random() < esc) { G.captive = null; G.safe = 200; G.y += 60; G.ty = G.y; G.ren++; lg('Utiekol si zo žalára v ' + t.n + '!'); msg('V noci si podplatil strážcu – alebo mu len rozbil hlavu – a preplazil sa kanálom von. Sláva +1.', () => { ov.classList.add('hide'); mode = 'map'; }); } else { G.hp = Math.max(10, G.hp - 10); G.inf = Math.max(0, G.inf - 1); dayT = 600; msg('Chytili ťa pri stene. Bitka a tmavšia diera. Zdravie −10, jeden vojak dezertoval.', () => { ov.classList.add('hide'); mode = 'map'; }); } }, 0, 'key');
    btn('Zaplatiť výkupné (' + ransom + ' zlata)', () => { G.gold -= ransom; G.captive = null; G.safe = 200; G.y += 60; G.ty = G.y; lg('Vykúpil si sa zo zajatia za ' + ransom + ' zlata.'); upd(); msg('Mešec zmizol v rukách kastelána a brána sa otvorila.', () => { ov.classList.add('hide'); mode = 'map'; }); }, G.gold < ransom, 'coins');
    btn('Čakať (deň plynie)', () => { dayT = 600; G.inf = Math.max(0, G.inf - 1); ov.classList.add('hide'); mode = 'map'; }, 0, 'rest');
}
