/*
 * Kráľovstvo a diplomacia („Kráľovstvo“ update).
 * Diplomacia (okno Diplomacia v hrade): prímerie na 20 dní (po ňom sa vojna obnoví, ak vzťah ostane zlý), požadovať alebo ponúknuť tribút,
 *   výmena zajatých lordov, spoločná vojna so spojencom. Porušiť prímerie stojí česť a lordi si to zapamätajú.
 * Poslovia: keď vládneš (nezávislý vojvodca alebo kráľ), frakcie posielajú poslov – jazdca s ich zástavou na mape. Keď ťa dobehne,
 *   prinesie ponuku: mier, spojenectvo, požiadavku tribútu alebo hrozbu vojnou.
 * Pamäť lordov (e.mem): lordi si pamätajú, keď si s nimi bojoval, prepustil ich, popravil ich druha, vyplienil ich dedinu alebo porušil prímerie.
 * Stavby v dedinách (v.bd): mlyn (+3 zlata denne, prosperita), pasienky (2 porcie mäsa denne do zásob), palisáda (lupiči ju vypália len zriedka).
 * Karavány (G.cars): z vlastného hradu vyšleš kupcov s 200 zlatými do najvzdialenejšieho priateľského hradu; po príchode vrátia zisk,
 *   no nepriateľské armády a lupiči ich môžu prepadnúť.
 * Vzbury (t.unrest): vysoké dane, nízka česť a chudoba zvyšujú nespokojnosť hradu; pri 12 sa vzbúrenci postavia proti tebe.
 * Hlasovanie vazalov: o léne môže rozhodnúť rada vazalov (všetci sú spokojnejší), alebo ho udelíš sám (ostatní žiarlia).
 */
// ---------- pamäť lordov ----------
function lordMem(e, s, v = 0) { if (!e) return; e.mem = e.mem || []; if (!e.mem.length || e.mem[e.mem.length - 1].s !== s) e.mem.push({ d: G.day, s }); if (e.mem.length > 6) e.mem.shift(); if (v) e.rl = (e.rl || 0) + v; }
const memText = e => (e.mem || []).slice(-3).map(m => m.s).join(' ');
const lordsOf = f => E.filter(e => e.f === f && !e.dead && !e.nz && e.f !== 9);

// ---------- prímerie, tribút, sila frakcie ----------
const truceLeft = f => G.truce && G.truce[f] ? Math.max(0, G.truce[f] - G.day) : 0;
const facPower = f => E.filter(e => e.f === f && !e.dead).reduce((s, e) => s + e.n, 0) + TW.filter(t => t.f === f).reduce((s, t) => s + t.g, 0) + (f === G.fac ? pw() : 0);
function makeTruce(f, days) { const a = G.fac; WR[a][f] = WR[f][a] = false; G.truce = G.truce || {}; G.truce[f] = G.day + days; lg('Prímerie s ' + FN[f] + ' na ' + days + ' dní.'); }
function breakTruce(f) {
    G.hon = (G.hon || 0) - 5; rl(G.fac, f, -20); if (G.truce) delete G.truce[f];
    lordsOf(f).forEach(e => lordMem(e, 'Porušil si prímerie s ' + FN[f] + '.', -10));
    lg('Porušil si prímerie s ' + FN[f] + '. Česť −5.');
}
const tributeAsk = f => 100 + TW.filter(t => t.f === f).length * 30;
const tributeOffer = f => 150 + TW.filter(t => t.f === G.fac).length * 20;
function truceDaily() {
    for (const f of Object.keys(G.truce || {}).map(Number)) if (G.day >= G.truce[f]) {
        delete G.truce[f];
        if (REL[G.fac][f] < -30 && bloc(f) !== bloc(G.fac)) { WR[G.fac][f] = WR[f][G.fac] = true; lg('Prímerie s ' + FN[f] + ' skončilo a vojna pokračuje.'); TS = { s: 'Prímerie s ' + FN[f] + ' skončilo – opäť vojna.', l: 260 }; }
        else lg('Prímerie s ' + FN[f] + ' prešlo do trvalého mieru.');
    }
}
/** Výmena zajatých lordov frakcie f: prepustia sa domov, vzťah +12, frakcia zaplatí 40 zlata za každého. */
function exchangePrisoners(f) {
    let n = 0;
    for (let i = (G.pri || []).length - 1; i >= 0; i--) if (G.pri[i].f === f) { const nm = G.pri[i].nm; releasePrisoner(i, 'exchange'); n++; const e = E.find(x => x.nm === nm); lordMem(e, 'Vrátil si ma pri výmene zajatcov.', 6); }
    if (n) { G.gold += n * 40; rl(G.fac, f, 12); lg('Výmena zajatcov s ' + FN[f] + ': domov sa vrátilo ' + n + ' lordov.'); }
    return n;
}

// ---------- poslovia ----------
/** Druh ponuky posla frakcie f pre hráča (alebo null). */
function envoyOffer(f) {
    const a = G.fac, war = WR[a][f], mine = facPower(a), theirs = facPower(f);
    if (war && !truceLeft(f)) { if (theirs < mine * .9) return 'peace'; if (bloc(f) === 1 && theirs > mine * 1.4) return 'tribute'; return null; }
    if (!war && !AL[a][f] && REL[a][f] >= 30) return 'alliance';
    if (!war && REL[a][f] <= -35 && bloc(f) !== bloc(a)) return 'threat';
    return null;
}
function envoyDaily() {
    if (!(G.fac === 6 || G.king)) return;
    G.envs = G.envs || [];
    if (G.envs.length || (G.envNext || 0) > G.day) return;
    G.envNext = G.day + 6 + Math.floor(Math.random() * 7);
    const opts = a0x.filter(f => f !== G.fac && TW.some(t => t.f === f)).map(f => [f, envoyOffer(f)]).filter(([, o]) => o);
    if (!opts.length) return;
    const [f, offer] = opts[Math.floor(Math.random() * opts.length)];
    const t = TW.filter(t => t.f === f).sort((p, q) => Math.hypot(p.x - G.x, p.y - G.y) - Math.hypot(q.x - G.x, q.y - G.y))[0];
    G.envs.push({ f, offer, x: t.x, y: t.y + 20, from: t.n });
    lg('Z hradu ' + t.n + ' vyrazil za tebou posol ' + FN[f] + '.');
}
/** Pohyb poslov a karaván po mape (volá updMap). */
function realmTick(dt) {
    for (const v of G.envs || []) {
        const dx = G.x - v.x, dy = G.y - v.y, d = Math.hypot(dx, dy);
        if (d < 70) { v.done = 1; LETTERS.push({ kind: 'envoy', f: v.f, offer: v.offer, from: FN[v.f] }); continue; }
        const s1 = navStep(v, G.x, G.y); if (s1) navMove(v, s1, Math.min(3.4 * dt, s1[2]));   // po súši (js/sim/nav.js)
    }
    if (G.envs) G.envs = G.envs.filter(v => !v.done);
    for (const c of G.cars || []) {
        const t = TW[c.to], dx = t.x - c.x, dy = t.y - c.y, d = Math.hypot(dx, dy);
        if (d < 40) { c.done = 1; const pay = c.inv + Math.round(c.inv * (.25 + c.dist / 14000) * (.7 + (t.pr ?? 40) / 100)); G.gold += pay; lg('Karavána dorazila do ' + t.n + ' a priniesla ' + pay + ' zlata.'); TS = { s: 'Karavána v ' + t.n + ': +' + pay + ' zlata.', l: 220 }; upd(); continue; }
        const s2 = navStep(c, t.x, t.y); if (s2) navMove(c, s2, Math.min(1.6 * dt, s2[2]));
    }
    if (G.cars) G.cars = G.cars.filter(c => !c.done);
}
/** List od posla: ponuka a odpoveď hráča. */
function envoyLetter(L) {
    const f = L.f, a = G.fac, end = () => { ov.classList.add('hide'); mode = 'map'; upd(); };
    const e = lordsOf(f)[0];
    mode = 'town';
    if (e) PORTRAIT = Portraits.forLord(e);
    const T = {
        peace: 'Vojna nás oboch stojí priveľa mužov a zlata. Môj pán ponúka mier – a dvadsať dní pokoja na potvrdenie.',
        tribute: 'Môj pán vie, koľko máš mužov. Pošli ' + tributeOffer(f) + ' zlata a tvoje hrady ostanú stáť. Odmietni a uvidíš dym.',
        alliance: 'Naše kráľovstvá majú spoločných nepriateľov. Môj pán ponúka spojenectvo – kto udrie na jedného, udrie na oboch.',
        threat: 'Môj pán je urazený. Pošli mu dar – 150 zlata – alebo budeme hovoriť mečmi.'
    };
    show('Posol – ' + FN[f], '„' + T[L.offer] + '“');
    if (L.offer === 'peace') { btn('Prijať mier', () => { makeTruce(f, 20); rl(a, f, 10); msg('Mier je uzavretý. Posol sa ukloní a odchádza.', end); }, 0, 'honor'); btn('Odmietnuť', () => { rl(a, f, -5); end(); }, 0, 'back'); }
    if (L.offer === 'tribute') { const g = tributeOffer(f); btn('Zaplatiť ' + g + ' zlata (prímerie 15 dní)', () => { G.gold -= g; makeTruce(f, 15); rl(a, f, 5); msg('Posol prepočíta zlato a bez slova odíde.', end); }, G.gold < g, 'coins'); btn('Odmietnuť (vytiahnu na tvoj hrad)', () => { rl(a, f, -10); const t = TW.findIndex(t => t.mine); if (t >= 0) CP[f] = t; lg(FN[f] + ' sa chystá na ťaženie proti tebe.'); end(); }, 0, 'sword'); }
    if (L.offer === 'alliance') { btn('Uzavrieť spojenectvo', () => { AL[a][f] = AL[f][a] = true; rl(a, f, 10); lg('Spojenectvo s ' + FN[f] + '.'); msg('Spojenectvo je uzavreté.', end); }, 0, 'honor'); btn('Odmietnuť', () => { rl(a, f, -5); end(); }, 0, 'back'); }
    if (L.offer === 'threat') { btn('Poslať dar 150 zlata', () => { G.gold -= 150; rl(a, f, 15); end(); }, G.gold < 150, 'coins'); btn('Odmietnuť (vojna)', () => { WR[a][f] = WR[f][a] = true; AL[a][f] = AL[f][a] = false; lg(FN[f] + ' ti vyhlásil vojnu.'); end(); }, 0, 'sword'); }
}
if (typeof readLetter === 'function') { const rl0 = readLetter; readLetter = function () { const L = LETTERS[0]; if (L && L.kind === 'envoy') { LETTERS.shift(); return envoyLetter(L); } if (L && L.kind === 'quarrel') { LETTERS.shift(); return quarrelLetter(L); } return rl0.apply(this, arguments); }; }

// ---------- karavány ----------
/** Najlepší cieľ karavány z hradu ti: najvzdialenejší hrad, ktorý nie je nepriateľský. */
function caravanDest(ti) { const t = TW[ti]; let b = -1, bd = 0; TW.forEach((o, j) => { if (j === ti || hos(o.f, G.fac)) return; const d = Math.hypot(o.x - t.x, o.y - t.y); if (d > bd && d < 9000) { bd = d; b = j; } }); return b; }
function sendCaravan(ti) {
    const j = caravanDest(ti); if (j < 0 || G.gold < 200) return false;
    G.gold -= 200; G.cars = G.cars || [];
    const t = TW[ti];
    G.cars.push({ to: j, from: ti, x: t.x, y: t.y + 20, inv: 200, dist: Math.hypot(TW[j].x - t.x, TW[j].y - t.y) });
    lg('Z hradu ' + t.n + ' vyrazila karavána do ' + TW[j].n + '.');
    return true;
}
function caravanDaily() {
    for (const c of G.cars || []) {
        const foe = E.find(e => !e.dead && hos(e.f, G.fac) && Math.hypot(e.x - c.x, e.y - c.y) < 500);
        if (foe && Math.random() < .35) { c.done = 1; lg('Karavánu do ' + TW[c.to].n + ' prepadli: ' + foe.nm + '. Tovar je stratený.'); TS = { s: 'Karavánu prepadli (' + foe.nm + ').', l: 260 }; }
    }
    if (G.cars) G.cars = G.cars.filter(c => !c.done);
}

// ---------- stavby v dedinách ----------
const VBUILD = [['m', 'Mlyn', 150, '+3 zlata denne a rastúca prosperita'], ['p', 'Pasienky', 120, '2 porcie mäsa denne do zásob družiny'], ['w', 'Palisáda', 200, 'lupiči dedinu vypália len zriedka']];
function villageDaily() {
    VL.forEach(v => {
        if (!v.bd || v.st > 0 || !TW[v.t].mine) return;
        if (v.bd.m) { G.gold += 3; v.pr = Math.min(100, (v.pr ?? 40) + 1); }
        if (v.bd.p) { G.fd = G.fd || {}; G.fd.meat = (G.fd.meat || 0) + 2; }
    });
}

// ---------- vzbury ----------
function unrestDaily() {
    const tax = G.tax || 'normal';
    TW.forEach(t => {
        if (!t.mine) { t.unrest = 0; return; }
        t.unrest = Math.max(0, (t.unrest || 0) + (tax === 'high' ? 1.2 : tax === 'low' ? -1 : 0) + ((G.hon || 0) < -5 ? .6 : 0) + ((t.pr ?? 40) < 25 ? .5 : 0) - (t.g >= 20 ? .4 : 0) - .2);
        if (t.unrest >= 8 && !t.unrestWarn) { t.unrestWarn = 1; lg('V ' + t.n + ' to vrie – ľud je nespokojný (dane, česť, chudoba).'); TS = { s: 'V ' + t.n + ' rastie nespokojnosť.', l: 240 }; }
        if (t.unrest >= 12) {
            t.unrest = 4; t.unrestWarn = 0; t.pr = Math.max(0, (t.pr ?? 40) - 10);
            E.push({ id: ++NID, x: t.x + 70, y: t.y + 60, f: 9, kind: 'deserters', n: 8 + lvl(t) * 3, vx: 0, vy: 0, w: 0, nm: 'Vzbúrenci z ' + t.n });
            lg('V ' + t.n + ' vypukla vzbura! Vzbúrenci sa zhromažďujú pred hradbami.'); TS = { s: 'Vzbura v ' + t.n + '!', l: 300 };
        }
    });
}

// ---------- hlasovanie vazalov o léne ----------
function fiefVote(ti) {
    const t = TW[ti], vas = E.filter(e => e.f === G.fac && !e.dead && !e.nz && !e.kr && !TW.some(x => x.lord === e.nm));
    if (!vas.length) return null;
    const cands = vas.slice().sort((a, b) => (b.n + (b.rl || 0)) - (a.n + (a.rl || 0))).slice(0, 3), votes = new Map(cands.map(c => [c, 0]));
    for (const v of vas) { per(v); const pick = cands.includes(v) && v.tr === 3 ? v : cands.slice().sort((a, b) => (a === v ? 50 : lr(v, a)) - (b === v ? 50 : lr(v, b))).pop(); votes.set(pick, votes.get(pick) + 1); }
    const win = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
    t.lord = win.nm; win.vas = 1; win.home = ti;
    vas.forEach(e => { loyOf(e); e.loy = Math.min(30, e.loy + (e === win ? 5 : 2)); });
    lordMem(win, 'Rada mi udelila léno ' + t.n + '.', 8);
    lg('Rada vazalov udelila léno ' + t.n + ' lordovi ' + win.nm + '.');
    return { win, votes: [...votes.entries()].map(([c, n]) => c.nm + ' ' + n).join(', ') };
}

/** Denný chod kráľovstva (volá daily2). */
function realmDaily() { truceDaily(); envoyDaily(); caravanDaily(); villageDaily(); unrestDaily(); }
