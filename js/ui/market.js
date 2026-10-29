/*
 * Trh: nákup a predaj tovaru v dedine alebo hrade (logika v js/sim/trade.js).
 * back = kam sa vrátiť po zatvorení trhu.
 */
function market(o, back) {
    mode = 'town';
    const inv = stock(o), cargo = G.cargo || {}, cc = cargoCount();
    const carry = GOODS.filter(g => cargo[g.k]).map(g => g.ico + ' ' + g.n + ' ' + cargo[g.k]).join(', ');
    show('Trh: ' + o.n, 'Zlato ' + G.gold + '. Voz: ' + cc + '/' + CARGO_MAX + (carry ? ' (' + carry + ')' : ' (prázdny)') + '.' + (o.good ? ' Dedina vyrába: ' + goodOf(o.good).n + '.' : ' Hrad kupuje všetko, draho predáva, čo mu chýba.'));
    GOODS.forEach(g => {
        const p = price(o, g.k), n = inv[g.k], have = cargo[g.k] || 0, cheap = p < g.p * .85, dear = p > g.p * 1.25;
        rowHead(g.ico + ' ' + g.n + ' · tu ' + n + ' ks · cena ' + p + (cheap ? ' (lacno)' : dear ? ' (draho)' : '') + (have ? ' · vezieš ' + have : ''));
        btn('Kúpiť 1', () => { buyGood(o, g.k, 1); upd(); market(o, back); }, !n || G.gold < p || cc >= CARGO_MAX);
        btn('Kúpiť 5', () => { buyGood(o, g.k, 5); upd(); market(o, back); }, n < 1 || G.gold < p || cc >= CARGO_MAX);
        btn(have > 1 ? 'Predať všetko (' + have + ')' : 'Predať', () => { sellGood(o, g.k, have); upd(); market(o, back); }, !have);
    });
    btn('Späť', back);
}
