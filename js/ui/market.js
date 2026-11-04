/*
 * Trh: nákup a predaj tovaru v dedine alebo hrade (logika v js/sim/trade.js).
 * back = kam sa vrátiť po zatvorení trhu.
 */
function market(o, back) {
    mode = 'town';
    const inv = stock(o), cargo = G.cargo || {}, cc = cargoCount();
    const carry = GOODS.filter(g => cargo[g.k]).map(g => g.ico + ' ' + g.n + ' ' + cargo[g.k]).join(', ');
    show('Trh: ' + o.n, 'Zlato ' + G.gold + '. Voz: ' + cc + '/' + CARGO_MAX + (carry ? ' (' + carry + ')' : ' (prázdny)') + '.' + (o.good ? ' Dedina vyrába: ' + goodOf(o.good).n + '.' : ' Hrad kupuje všetko, draho predáva, čo mu chýba.'));
    // zásoby jedla pre družinu (js/sim/supply.js)
    const evil = bloc(o.good ? TW[o.t].f : o.f);
    rowHead('Zásoby pre družinu: ' + foodTotal() + ' porcií, vystačia na ' + foodDays() + ' d (denne ' + foodNeed() + ' porcií). Pestrá strava dvíha morálku.', { gold: 1 });
    foodsAt(o).forEach(f => { const p = foodPrice(o, f.k); btn(foodName(f.k, evil) + ' ×' + FOOD_PACK + (f.k === 'lembas' ? ' (za dvoch)' : '') + ' · ' + p + ' zl' + ((G.fd || {})[f.k] ? ' (máš ' + G.fd[f.k] + ')' : ''), () => { buyFood(o, f.k); upd(); market(o, back); }, G.gold < p, 'bread'); });
    GOODS.forEach(g => {
        const p = price(o, g.k), n = inv[g.k], have = cargo[g.k] || 0, cheap = p < g.p * .85, dear = p > g.p * 1.25;
        rowHead(g.ico + ' ' + g.n + ' · tu ' + n + ' ks · cena ' + p + (cheap ? ' (lacno)' : dear ? ' (draho)' : '') + (have ? ' · vezieš ' + have : ''));
        btn('Kúpiť 1', () => { buyGood(o, g.k, 1); upd(); market(o, back); }, !n || G.gold < p || cc >= CARGO_MAX);
        btn('Kúpiť 5', () => { buyGood(o, g.k, 5); upd(); market(o, back); }, n < 1 || G.gold < p || cc >= CARGO_MAX);
        btn(have > 1 ? 'Predať všetko (' + have + ')' : 'Predať', () => { sellGood(o, g.k, have); upd(); market(o, back); }, !have);
    });
    btn('Späť', back);
}
