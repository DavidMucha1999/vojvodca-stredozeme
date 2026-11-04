/*
 * Kováč a inventár.
 * Kováč predáva výbavu podľa strany hradu: hrady dobra výbavu dobra, hrady zla
 * (Mordor, Isengard, Harad, Rhûn) výbavu zla. Tvoje hrady predávajú výbavu strany,
 * ktorú si si vybral pri korunovácii. Kúpené veci ostávajú v inventári
 * (G.own) a dajú sa kedykoľvek vymeniť – tlačidlom Inventár na mape alebo u kováča.
 */
const eqStat = (k, x) => k === 'r' ? (x.rt ? 'zranenie ' + x.v + ', ' + x.ammo + ' strel' + (x.rt === 'xbow' ? ', nie z koňa' : '') : 'nič') : k === 'w' ? 'útok ' + x.v + (x.r ? ', dlhý dosah' : '') + (x.t2 ? ', obojručná – bez štítu' : '') : k === 'm' ? 'rýchlosť ' + x.v : x.v ? 'ochrana ' + Math.round(x.v * 100) + ' %' : 'bez ochrany';
/** Krátky údaj o sile veci (do inventára). */
const eqShort = (k, x) => k === 'r' ? (x.rt ? 'zran. ' + x.v + ' · ' + x.ammo + '×' : '–') : k === 'w' ? 'útok ' + x.v + (x.t2 ? ' · obojručná' : '') : k === 'm' ? 'rýchl. ' + x.v : x.v ? Math.round(x.v * 100) + ' %' : '–';
const eqSum = () => 'Útok ' + Math.round(dmg()) + ', ochrana ' + Math.round((1 - red()) * 100) + ' %, rýchlosť ' + it('m').v + '.';
const owns = (k, i) => G.own[k].includes(i);
function wear(k, i) { G.eq[k] = i; upd(); }

/** Nadpis skupiny v okne (napr. Zbrane). */

/** Kováč v hrade i. Bez k ukáže prehľad, s k (w, a, s, h, m) ponuku jedného druhu výbavy. */
function smithy(i, k) {
    const t = TW[i], evil = shopSide(t.f), back = () => smithy(i, k), bd = t.bd || {};
    const cost = (k, x) => Math.round(x.p * (bd.s ? .8 : 1) * (k === 'm' && bd.j ? .75 : 1));   // zľava z kováčskej dielne a stajne
    mode = 'town';
    if (!k) {
        show('Kováč a zbrojnica', 'Zlato: ' + G.gold + '. ' + eqSum() + ' ' + (bd.s ? 'Kováčska dielňa: výbava o 20 % lacnejšia. ' : '') + (bd.j ? 'Stajňa: kone o 25 % lacnejšie. ' : '') + (evil ? 'Tunajší kováči kujú výbavu zla pre služobníkov Saurona a Sarumana.' : 'Tunajší kováči kujú výbavu dobra pre Gondor, Rohan, elfov a trpaslíkov.') + (t.f === 6 ? ' Tvoj hrad predáva výbavu tvojej strany.' : ''));
        SH.forEach(s => btn(s.l + ' (nosíš: ' + it(s.k).n + ')', () => smithy(i, s.k), 0, { k: s.k, i: G.eq[s.k] }));
        btn('Inventár', () => inv(() => smithy(i)));
        btn('Späť', () => town(i));
        return;
    }
    const s = SH.find(x => x.k === k);
    show('Kováč: ' + s.l.toLowerCase(), 'Zlato: ' + G.gold + '. Nosíš: ' + it(k).n + ' (' + eqStat(k, it(k)) + ').' + ' Výbava ' + sideName(evil) + '.');
    s.it.map((x, j) => [x, j]).sort((a, b) => a[0].p - b[0].p).forEach(([x, j]) => {
        if (!x.p || !x.z !== !evil) return;           // základné veci sa nepredávajú a výbava druhej strany tu nie je
        if (owns(k, j)) {
            const b = btn(x.n + (G.eq[k] === j ? ' · nosíš' : ' · máš, obliecť'), () => { wear(k, j); back(); }, 0, { k, i: j });
            if (G.eq[k] === j) select(b);
        } else
            btn(x.n + ' · ' + cost(k, x) + ' zl. · ' + eqShort(k, x) + (x.r ? ', dosah' : ''), () => { G.gold -= cost(k, x); G.own[k].push(j); wear(k, j); back(); }, G.gold < cost(k, x), { k, i: j });
    });
    btn('Späť', () => smithy(i));
}

/** Inventár: všetky kúpené veci, kliknutím ich hrdina oblečie. back = kam sa vrátiť (bez neho z mapy a späť na mapu). */
function inv(back) {
    if (!back) {
        if (mode !== 'map') return;
        invShow(() => { ov.classList.add('hide'); mode = 'map'; }, 'Zavrieť');
    } else invShow(back, 'Späť');
}
function invShow(back, close) {
    mode = 'town';
    show('Inventár', eqSum() + ' Biely rámik = to, čo nosíš. Kliknutím vec oblečieš.');
    SH.forEach(s => {
        rowHead(s.l);
        [...G.own[s.k]].sort((a, b) => a - b).forEach(j => {
            const x = s.it[j], on = G.eq[s.k] === j;
            const b = btn(x.n + ' · ' + eqShort(s.k, x), () => { wear(s.k, j); invShow(back, close); }, 0, { k: s.k, i: j });
            if (on) select(b);
        });
    });
    btn(close, back);
}
