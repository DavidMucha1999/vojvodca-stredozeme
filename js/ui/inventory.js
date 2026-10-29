/*
 * Kováč a inventár.
 * Kováč predáva výbavu podľa strany hradu: hrady dobra výbavu dobra, hrady zla
 * (Mordor, Isengard, Harad, Rhûn) výbavu zla. Tvoje hrady predávajú výbavu strany,
 * ktorú si si vybral pri korunovácii. Kúpené veci ostávajú v inventári
 * (G.own) a dajú sa kedykoľvek vymeniť – tlačidlom Inventár na mape alebo u kováča.
 */
const eqStat = (k, x) => k === 'w' ? 'útok ' + x.v + (x.r ? ', dlhý dosah' : '') : k === 'm' ? 'rýchlosť ' + x.v : x.v ? 'ochrana ' + Math.round(x.v * 100) + ' %' : 'bez ochrany';
/** Krátky údaj o sile veci (do inventára). */
const eqShort = (k, x) => k === 'w' ? 'útok ' + x.v : k === 'm' ? 'rýchl. ' + x.v : x.v ? Math.round(x.v * 100) + ' %' : '–';
const eqSum = () => 'Útok ' + Math.round(dmg()) + ', ochrana ' + Math.round((1 - red()) * 100) + ' %, rýchlosť ' + it('m').v + '.';
const owns = (k, i) => G.own[k].includes(i);
function wear(k, i) { G.eq[k] = i; upd(); }

/** Nadpis skupiny v okne (napr. Zbrane). */
function rowHead(text) {
    const d = document.createElement('div');
    d.style.cssText = 'grid-column:1/-1;text-align:left;font-size:.95rem;color:var(--gold);margin-top:.3rem';
    d.textContent = text;
    document.getElementById('bt').appendChild(d);
}

/** Kováč v hrade i. Bez k ukáže prehľad, s k (w, a, s, h, m) ponuku jedného druhu výbavy. */
function smithy(i, k) {
    const t = TW[i], evil = shopSide(t.f), back = () => smithy(i, k);
    mode = 'town';
    if (!k) {
        show('Kováč a zbrojnica', 'Zlato: ' + G.gold + '. ' + eqSum() + ' ' + (evil ? 'Tunajší kováči kujú výbavu zla pre služobníkov Saurona a Sarumana.' : 'Tunajší kováči kujú výbavu dobra pre Gondor, Rohan, elfov a trpaslíkov.') + (t.f === 6 ? ' Tvoj hrad predáva výbavu tvojej strany.' : ''));
        SH.forEach(s => btn(s.l + ' (nosíš: ' + it(s.k).n + ')', () => smithy(i, s.k), 0, { k: s.k, i: G.eq[s.k] }));
        btn('Inventár', () => inv(() => smithy(i)));
        btn('Späť', () => town(i));
        return;
    }
    const s = SH.find(x => x.k === k);
    show('Kováč: ' + s.l.toLowerCase(), 'Zlato: ' + G.gold + '. Nosíš: ' + it(k).n + ' (' + eqStat(k, it(k)) + ').' + ' Výbava ' + sideName(evil) + '.');
    s.it.forEach((x, j) => {
        if (!x.p || !x.z !== !evil) return;           // základné veci sa nepredávajú a výbava druhej strany tu nie je
        if (owns(k, j)) {
            const b = btn(x.n + (G.eq[k] === j ? ' · nosíš' : ' · máš, obliecť'), () => { wear(k, j); back(); }, 0, { k, i: j });
            if (G.eq[k] === j) b.style.outline = '3px solid #fff';
        } else
            btn(x.n + ' · ' + x.p + ' zl. · ' + eqShort(k, x) + (x.r ? ', dosah' : ''), () => { G.gold -= x.p; G.own[k].push(j); wear(k, j); back(); }, G.gold < x.p, { k, i: j });
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
            if (on) b.style.outline = '3px solid #fff';
        });
    });
    btn(close, back);
}
