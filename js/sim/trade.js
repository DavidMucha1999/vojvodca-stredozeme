/*
 * Hospodárstvo a obchod.
 * Každá dedina a hrad majú tovar. Dedina vyrába jeden hlavný tovar podľa kraja (obilie na rovinách,
 * železo pri horách, kone v Rohane, soľ a korenie na juhu…). Cena tovaru závisí od toho, koľko ho
 * miesto má (veľa = lacno, málo = draho) a od prosperity. Hráč vozí tovar vo voze (G.cargo, najviac
 * CARGO_MAX kusov) a zarába na rozdiele cien. Vypálená dedina nevyrába a nepredáva.
 */
const GOODS = [
    { k: 'grain', n: 'Obilie', p: 10, ico: '🌾' },
    { k: 'wool', n: 'Vlna', p: 14, ico: '🧶' },
    { k: 'wood', n: 'Drevo', p: 12, ico: '🪵' },
    { k: 'iron', n: 'Železo', p: 26, ico: '⛏' },
    { k: 'horses', n: 'Kone', p: 45, ico: '🐎' },
    { k: 'wine', n: 'Víno', p: 30, ico: '🍷' },
    { k: 'salt', n: 'Soľ a korenie', p: 36, ico: '🧂' },
    { k: 'mithril', n: 'Trpasličie zlato', p: 90, ico: '💎' }
];
const CARGO_MAX = 40;
const goodOf = k => GOODS.find(g => g.k === k);

/** Hlavný tovar dediny podľa frakcie hradu a polohy (deterministicky podľa poradia). */
function villageGood(v, i) {
    const f = TW[v.t].f, h = (i * 7 + 3) % 5;
    if (f === 1) return ['horses', 'grain', 'wool', 'horses', 'grain'][h];
    if (f === 5) return ['iron', 'mithril', 'iron', 'wood', 'iron'][h];
    if (f === 8) return ['wine', 'wood', 'wool', 'wine', 'wood'][h];
    if (f === 4 || f === 7) return ['salt', 'salt', 'grain', 'horses', 'wine'][h];
    if (f === 2 || f === 3) return ['iron', 'wood', 'iron', 'grain', 'wood'][h];
    return ['grain', 'wine', 'wool', 'iron', 'wood'][h];     // Gondor, vlastná družina, banditi
}

/** Zásoby miesta o (dedina alebo hrad); pri prvom použití sa vytvoria. */
function stock(o) {
    if (!o.inv) {
        o.inv = {};
        GOODS.forEach(g => o.inv[g.k] = 2 + Math.floor(Math.random() * 4));
        if (o.good) o.inv[o.good] = 14 + Math.floor(Math.random() * 10);
        if (o.g != null) GOODS.forEach(g => o.inv[g.k] += 4);      // hrad: väčší trh
    }
    return o.inv;
}
/** Cena tovaru k v mieste o: základ × (nedostatok alebo nadbytok) × prosperita. */
function price(o, k) {
    const g = goodOf(k), n = stock(o)[k], pr = (o.pr ?? 40) / 100;
    const scarcity = Math.max(.45, Math.min(2.2, 12 / (n + 4)));
    return Math.max(1, Math.round(g.p * scarcity * (.8 + pr * .5)));
}
const cargoCount = () => Object.values(G.cargo || {}).reduce((a, b) => a + b, 0);
function buyGood(o, k, n) {
    const inv = stock(o); n = Math.min(n, inv[k], CARGO_MAX - cargoCount());
    let cost = 0;
    for (let i = 0; i < n; i++) { cost += price(o, k); inv[k]--; }
    if (G.gold < cost) { inv[k] += n; return 0; }
    G.gold -= cost; G.cargo = G.cargo || {}; G.cargo[k] = (G.cargo[k] || 0) + n;
    G.st.tr = (G.st.tr || 0) + cost;
    return n;
}
function sellGood(o, k, n) {
    const inv = stock(o); n = Math.min(n, (G.cargo || {})[k] || 0);
    let gain = 0;
    for (let i = 0; i < n; i++) { gain += price(o, k); inv[k]++; }
    G.gold += gain; G.cargo[k] -= n;
    G.st.tr = (G.st.tr || 0) + gain;
    if (o.pr != null) o.pr = Math.min(100, o.pr + n * .1);      // obchod pomáha prosperite
    return gain;
}
/** Denná výroba a spotreba: dediny vyrábajú svoj tovar, hrady spotrebúvajú; trh sa pomaly vracia k rovnováhe. */
function dailyTrade() {
    VL.forEach((v, i) => {
        if (!v.good) v.good = villageGood(v, i);
        const inv = stock(v);
        if (v.st <= 0) inv[v.good] = Math.min(40, inv[v.good] + 2 + Math.floor(lvl(v) / 2));
        GOODS.forEach(g => { if (g.k !== v.good && inv[g.k] > 3 && Math.random() < .3) inv[g.k]--; });
    });
    TW.forEach(t => {
        const inv = stock(t);
        GOODS.forEach(g => { if (inv[g.k] > 2 && Math.random() < .5) inv[g.k]--; if (inv[g.k] < 6 && Math.random() < .25) inv[g.k]++; });
        if (t.mine && t.bd && t.bd.t) GOODS.forEach(g => { if (inv[g.k] < 10) inv[g.k]++; });     // trhovisko priťahuje tovar
    });
}
