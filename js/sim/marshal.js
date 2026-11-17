/*
 * Maršali kráľovstiev: voľba lordmi každých 20 dní, nespokojnosť po prehrách a zvrhnutie, listy o zvolaní vojska,
 * a oznámenia o dobytí hradov (fronta EVENTS, ktorú kreslí UIScene).
 * MST[f] = { wins, losses, day (voľba), since (deň nástupu) }. Maršal samotný je v MAR[f] (js/sim/world.js, marshal()).
 */
const MST = {};
let LETTERS = [], EVENTS = [];
const mst = f => MST[f] || (MST[f] = { wins: 0, losses: 0, day: 0, since: 0 });

/** Voľba maršala frakcie f: lordi hlasujú podľa sily, úspechov a koruny. Vráti nového maršala (alebo null). */
function electMarshal(f, why) {
    const c = E.filter(e => e.f === f && !e.dead && !e.nz);
    if (!c.length) return null;
    const old = E.find(e => e.id === MAR[f] && !e.dead);
    const S = mst(f);
    const score = e => e.n + (e.kr ? 8 : 0) + (e === old ? S.wins * 5 - S.losses * 4 : 0) + Math.random() * 6;
    const m = c.reduce((a, b) => score(b) > score(a) ? b : a);
    MAR[f] = m.id; m.role = 'army';
    S.wins = 0; S.losses = 0; S.day = G.day; S.since = G.day;
    if (m !== old) {
        const txt = (why === 'overthrow' ? 'Lordi ' + FN[f] + ' zvrhli maršala ' + (old ? old.nm : '?') + ' a zvolili ' : 'Lordi ' + FN[f] + ' zvolili za maršala vojska ') + m.nm + '.';
        lg(txt);
        if (f === G.fac || (G.fac === 6 && !hos(f, G.fac) && bloc(f) === heroSide())) TS = { s: txt, l: 320 };
        if (why === 'overthrow') courtEvent(f, 'overthrow');
    }
    return m;
}
/** Denná kontrola maršalov: pravidelná voľba každých 20 dní a zvrhnutie pri prehrách. */
function marshalDaily() {
    [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach(f => {
        if (!E.some(e => e.f === f && !e.dead && !e.nz)) return;
        const S = mst(f);
        if (!E.some(e => e.id === MAR[f] && !e.dead)) { electMarshal(f, 'dead'); return; }
        if (S.losses >= S.wins + 2 && G.day - S.since >= 3) electMarshal(f, 'overthrow');
        else if (G.day - S.day >= 20) electMarshal(f, 'term');
    });
}
/** Maršal zvoláva vojsko: lordi dostanú list (zbabelci a nespokojní odmietnu), hráč list dostane len od vlastnej frakcie. */
function onMuster(m, ci) {
    const t = TW[ci];
    if (!t) return;
    E.forEach(e => {
        if (e === m || e.f !== m.f || e.dead || e.role !== 'army') return;
        per(e);
        const p = (e.tr === 2 ? .4 : e.tr === 3 ? .65 : .85) * (lr(e, m) < -3 ? .3 : 1);         // zbabelý váha, ambiciózny nerád slúži inému, lord v spore s maršalom neprichádza
        e.muSkip = Math.random() < p ? null : ci;
    });
    if (m.f === G.fac || (G.fac === 6 && G.side != null && bloc(m.f) === G.side && !hos(m.f, G.fac) && TW.some(x => x.f === 6))) {
        if (m.f !== G.fac) return;
        LETTERS.push({ from: m.nm, f: m.f, ci, day: G.day, mid: m.id, text: 'Lordi a kapitáni ' + FN[m.f] + '! Ja, ' + m.nm + ', maršal nášho vojska, zvolávam zraz pri hrade ' + musterPoint(m, t).n + '. Cieľom ťaženia je ' + t.n + ' (' + FN[t.f] + '). Kto príde s vojskom, bude mať podiel na koristi a mojej priazni. Kto neprí­de, nech sa nečuduje, keď naňho kráľovstvo zabudne.' });
    }
}
/** Zraz: vlastný hrad najbližšie k cieľu. */
function musterPoint(m, t) { const own = TW.filter(x => x.f === m.f); return own.length ? own.reduce((b, x) => Math.hypot(x.x - t.x, x.y - t.y) < Math.hypot(b.x - t.x, b.y - t.y) ? x : b) : TW[m.home] || t; }
/** Prečítanie listu od maršala (okno). */
function readLetter() {
    const L = LETTERS.shift();
    if (!L) return;
    if (L.kind === 'ransom') return ransomLetter(L);
    if (L.kind === 'court') return courtLetter(L);
    const m = E.find(e => e.id === L.mid);
    mode = 'town';
    if (m) PORTRAIT = Portraits.forLord(m);
    evShow('List od maršala ' + L.from, '„' + L.text + '“');
    btn('Pridať sa k ťaženiu (ísť na zraz)', () => { const t = TW[L.ci], mp = m ? musterPoint(m, t) : t; G.tx = mp.x; G.ty = mp.y + 30; G.dest = -1; G.join = { f: L.f, ci: L.ci, mid: L.mid }; if (m) m.rl = (m.rl || 0) + 3; lg('Prisľúbil si účasť na ťažení maršala ' + L.from + '.'); ov.classList.add('hide'); mode = 'map'; }, 0, 'sword');
    btn('Odmietnuť', () => { if (m) m.rl = (m.rl || 0) - 4; lg('Odmietol si výzvu maršala ' + L.from + '.'); ov.classList.add('hide'); mode = 'map'; }, 0, 'back');
}
/** Oznámenie o dobytí hradu: stará a nová frakcia, dobyvateľ. UIScene ho ukáže na obrazovke. */
function captureEvent(t, oldF, newF, who) {
    EVENTS.push({ t: t.n, oldF, newF, who, l: 420 });
    lg(FN[newF] + ' (' + who + ') dobyl hrad ' + t.n + ', ktorý patril ' + FN[oldF] + '.');
}
