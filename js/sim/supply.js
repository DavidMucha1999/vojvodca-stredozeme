/*
 * Družina („Družina“ update): zásoby jedla, morálka družiny, dezercie, ranení vojaci a verbovanie zajatcov.
 *
 * Zásoby (G.fd = { druh: porcie }): družina denne zje porcie podľa počtu mužov (1 porcia na 6 mužov, Zásobovač −25 %).
 *   Jedlo sa kupuje na trhu v hrade aj v dedine (balík = 10 porcií). Čím viac druhov jedla, tým lepšia nálada;
 *   lembas z Lothlórienu zasýti za dvoch a dvíha náladu. Hlad: morálka padá, pochod je pomalší.
 * Morálka družiny (G.pm 0–100): mieri k cieľu podľa pestrosti jedla, víťazstiev (G.pmv), úrovne a Charizmy hrdinu,
 *   veľkosti vojska (veľké vojsko sa ťažšie udrží), hladu a nevyplateného žoldu (zlato pod nulou).
 *   Pod 25 muži dezertujú. V bitke sa prenáša do morálky tvojho vojska (combat.js).
 * Ranení (G.wd = { druh vojaka: počet }): po víťazstve je časť padlých len ranená (35 %, Ranhojič +25 %);
 *   neboja, ale denne sa hojí 20 % (v hrade 35 %, Ranhojič ×1,5) a vracajú sa do vojska.
 * Zajatci: v okne Družina → Zásoby a zajatci ich hrdina môže raz denne presvedčiť, aby sa pridali (Presviedčanie, Náborár).
 */
const FOODS = [
    { k: 'bread', n: 'Chlieb', ne: 'Čierny chlieb', p: 16 },
    { k: 'meat', n: 'Sušené mäso', ne: 'Surové mäso', p: 28 },
    { k: 'cheese', n: 'Syr', ne: 'Plesnivý syr', p: 24 },
    { k: 'ale', n: 'Pivo', ne: 'Grog', p: 26 },
    { k: 'lembas', n: 'Lembas', ne: 'Lembas', p: 55, elf: 1 }
];
const FOOD_PACK = 10;
const foodName = (k, evil) => { const f = FOODS.find(x => x.k === k); return f ? (evil ? f.ne : f.n) : k; };
const perk = id => !!(G && G.perk && G.perk[id]);
/** Všetci muži v družine (bez hrdinu). */
const men = () => G.inf + G.cav + G.arc + G.elf + G.roh + G.vet + (G.ent || 0) + uS() + (G.comp || []).length;
const foodTotal = () => Object.values(G.fd || {}).reduce((a, b) => a + b, 0);
/** Porcie, ktoré družina zje za deň. */
const foodNeed = () => Math.max(1, Math.ceil((men() + 1) / 6 * (perk('zasobovac') ? .75 : 1) * (typeof worldEv === 'function' && worldEv('winter') ? 1.5 : 1)));
/** Na koľko dní vystačia zásoby (lembas sa počíta za dvojnásobok). */
const foodDays = () => Math.floor((foodTotal() + ((G.fd || {}).lembas || 0)) / foodNeed());
/** Čo sa dá kúpiť na trhu miesta o: chlieb a nápoj všade, mäso a syr v hradoch a na statkoch, lembas v Lothlóriene. */
function foodsAt(o) {
    const t = o.good ? TW[o.t] : o, f = t ? t.f : 6, farm = !o.good || ['grain', 'horses', 'wool'].includes(o.good);
    return FOODS.filter(x => x.elf ? f === 8 : x.k === 'bread' || x.k === 'ale' || (x.k === 'meat' && farm) || (x.k === 'cheese' && (farm || !o.good)));
}
const foodPrice = (o, k) => Math.round(FOODS.find(x => x.k === k).p * (.85 + (o.pr ?? 40) / 250) * (perk('kupec') ? .92 : 1) * (typeof worldEv === 'function' && worldEv('caravan') ? .6 : 1));
function buyFood(o, k) {
    const p = foodPrice(o, k);
    if (G.gold < p) return 0;
    G.gold -= p; G.fd = G.fd || {}; G.fd[k] = (G.fd[k] || 0) + FOOD_PACK;
    return FOOD_PACK;
}
/** Denná spotreba jedla, morálka družiny, dezercie a hojenie ranených (volá daily2). */
function supplyDaily() {
    G.fd = G.fd || {}; G.wd = G.wd || {};
    G.maxArmy = Math.max(G.maxArmy || 0, men());
    if (G.pm == null) G.pm = 60;
    let need = foodNeed();
    const eaten = new Set();
    // jeme striedavo zo všetkých druhov (pestrá strava); lembas zasýti dvoch
    while (need > 0) {
        const ks = Object.keys(G.fd).filter(k => G.fd[k] > 0);
        if (!ks.length) break;
        for (const k of ks) { if (need <= 0) break; G.fd[k]--; need -= k === 'lembas' ? 2 : 1; eaten.add(k); }
    }
    Object.keys(G.fd).forEach(k => { if (G.fd[k] <= 0) delete G.fd[k]; });
    const hungry = need > 0;
    G.hungry = hungry ? (G.hungry || 0) + 1 : 0;
    if (G.hungry === 1) { lg('Družine došlo jedlo! Kúp zásoby na trhu v hrade alebo v dedine.'); TS = { s: 'Došlo jedlo – morálka družiny padá. Kúp zásoby na trhu.', l: 300 }; }
    if (!hungry && foodDays() <= 1) TS = TS && TS.l > 0 ? TS : { s: 'Zásoby jedla vystačia už len na deň.', l: 200 };
    G.pmv = (G.pmv || 0) * .7;
    const target = 48 + Math.min(4, eaten.size) * 5 + (eaten.has('lembas') ? 5 : 0) + (G.pmv || 0) + Math.min(10, G.lv || 1) + (perk('vodca') ? 8 : 0)
        - Math.max(0, men() - 30) / 6 - (hungry ? 30 + Math.min(20, G.hungry * 5) : 0) - (G.gold < 0 ? 15 : 0);
    G.pm = Math.round(Math.max(0, Math.min(100, G.pm + (target - G.pm) * .35)));
    if (G.pm < 25 && men() > 3) {   // dezercie
        let n = Math.max(1, Math.ceil(men() * (25 - G.pm) / 300)), lost = 0;
        for (const k of ['inf', 'arc', 'cav', 'vet', 'roh', 'elf']) while (n > 0 && G[k] > 0) { G[k]--; n--; lost++; }
        if (lost) { lg('Pre nízku morálku z družiny zbehlo ' + lost + ' mužov.'); TS = { s: 'Zbehlo ' + lost + ' mužov – morálka družiny je nízka (' + G.pm + ').', l: 260 }; }
    }
    // hojenie ranených
    const rate = (G.camp && G.stay ? .35 : .2) * (perk('ranhojic') ? 1.5 : 1);
    for (const k of Object.keys(G.wd)) { const h = Math.min(G.wd[k], Math.max(1, Math.round(G.wd[k] * rate))); G.wd[k] -= h; G[k] = (G[k] || 0) + h; if (G.wd[k] <= 0) delete G.wd[k]; }
}
/** Ranení po víťazstve: časť padlých vojakov hráča prežije a hojí sa (vojsko ich už odpočítalo). */
function woundAfterBattle() {
    const KK = { i: 'inf', c: 'cav', a: 'arc', v: 'vet', e: 'elf', r: 'roh', n: 'ent' }, rate = .35 + (perk('ranhojic') ? .25 : 0);
    G.wd = G.wd || {};
    const dead = {};
    for (const u of U) if (!u.t && !u.h && !u.ally && !u.cp && fallen(u)) { const k = u.uk || KK[u.k]; if (k) dead[k] = (dead[k] || 0) + 1; }
    let tot = 0;
    for (const [k, d] of Object.entries(dead)) { const w = Math.floor(d * rate) + (Math.random() < (d * rate) % 1 ? 1 : 0); if (w > 0) { G.wd[k] = (G.wd[k] || 0) + w; tot += w; } }
    return tot;
}
const woundedTotal = () => Object.values(G.wd || {}).reduce((a, b) => a + b, 0);
/** Presvedčiť zajatcov, aby sa pridali (raz denne). Vráti počet nových pešiakov. */
function recruitPrisoners() {
    if (!G.cap || G.prd === G.day) return 0;
    G.prd = G.day;
    const ch = Math.min(.8, .12 + .06 * G.s.pr + (perk('nabor') ? .15 : 0) + (G.pm > 70 ? .05 : 0));
    let n = 0;
    for (let i = 0; i < G.cap; i++) if (Math.random() < ch) n++;
    G.cap -= n; G.inf += n;
    if (n) G.pm = Math.max(0, G.pm - Math.floor(n / 5));   // noví muži, ktorým starí neveria
    return n;
}
