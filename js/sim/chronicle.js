/*
 * Svet („Svet“ update): veľké udalosti sveta, kronika hrdinu a konce hry.
 *
 * Udalosti sveta (G.wev = { k, end }): od 12. dňa raz za 18–30 dní začne jedna veľká udalosť, ohlási sa oknom
 *   „Správa zo sveta“, zapíše do kroniky a niekoľko dní mení svet:
 *   nazgul – Ťaženie Nazgûlov (až päť Nazgûlov na mape), ents – Pochod entov (Isengard slabne; hrdinovi dobra Stromobrad pošle enta),
 *   gondor – Vojna o Gondor (Mordor posilní armády a tiahne na Osgiliath alebo Minas Tirith), rohan – Rohan v ohni (Isengard tiahne na Helmov žľab),
 *   winter – Krutá zima (družina zje o polovicu viac, pochod pomalší), caravan – Karavány z juhu (jedlo o 40 % lacnejšie).
 * Kronika (G.chron): dôležité udalosti hrdinu (kapitoly, dobyté hrady, korunovácia, spoločníci, Nazgûli, udalosti sveta…) s dňom.
 *   Okno Kronika (panel Kronika → Kronika hrdinu) ukáže štatistiky a zápisy.
 * Konce: po dokončení príbehu alebo keď kráľ dosiahne slávu 30 sa podľa strany, cti, strachu, Prsteňa a kráľovstva vyberie jeden zo šiestich koncov;
 *   potom sa dá hrať ďalej.
 */
const WORLD_EV = {
    nazgul: { n: 'Ťaženie Nazgûlov', d: 10, t: 'Deväť jazdcov opustilo Minas Morgul. Nad krajinou zavládol chlad a psy prestali štekať. Nazgûli hľadajú každého, kto vzdoruje Oku – vyhýbaj sa im, alebo sa postav s veľkým vojskom.' },
    ents: { n: 'Pochod entov', d: 6, t: 'Fangorn sa pohol. Stromy kráčajú k Isengardu a hrádze sa lámu. Posádky Bielej ruky sú rozvrátené a jej armády prídu o veľa mužov.' },
    gondor: { n: 'Vojna o Gondor', d: 14, t: 'Z Morannonu vychádza nekonečný zástup. Mordor zbiera svoje armády a tiahne na hranice Gondoru. Biele mesto zapaľuje majáky.' },
    rohan: { n: 'Rohan v ohni', d: 12, t: 'Uruk-hai prekročili Brod cez Železnú. Isengard tiahne na Helmov žľab a dediny Západnej marky horia.' },
    winter: { n: 'Krutá zima', d: 8, t: 'Zo severu prišla zima, akú nepamätajú ani starci. Cesty zasypal sneh, družiny sa brodia a jedia viac než inokedy.' },
    caravan: { n: 'Karavány z juhu', d: 6, t: 'Po cestách prichádzajú bohaté karavány. Trhy sú plné jedla a kupci zľavujú, kým majú čo predávať.' }
};
const worldEv = k => !!(G && G.wev && G.wev.k === k && G.day <= G.wev.end);
/** Zápis do kroniky hrdinu. */
function chron(s) { if (!G) return; G.chron = G.chron || []; if (G.chron.length && G.chron[G.chron.length - 1].s === s) return; G.chron.push({ d: G.day, s }); if (G.chron.length > 300) G.chron.shift(); }
// dôležité správy z denníka sa zapisujú aj do kroniky
const CHRON_RE = /(Dobyl si|korunovaný|Splnená kapitola|Porazil si Nazgûla|Narodil sa ti|sa pridal k tvojej družine|Ubránil si|Víťazstvo v turnaji|Našiel si Jeden prsteň|Prsteň ťa ovládol|Pomohol si|Nový perk|vyhlásil|svadb|ťa po bitke zajal|Zbehlo|ti posiela enta)/;
if (typeof lg === 'function') { const lg0 = lg; lg = function (s) { lg0(s); try { if (G && CHRON_RE.test(s)) chron(s); } catch (e) { } }; }

const castleIdx = n => TW.findIndex(t => t.n === n);
/** Denný chod udalostí sveta (volá daily2): začiatok novej udalosti a jej trvanie. */
function worldDaily() {
    G.wev = G.wev || null;
    if (G.wev && G.day > G.wev.end) { lg('Udalosť sveta sa skončila: ' + WORLD_EV[G.wev.k].n + '.'); G.wev = null; G.wevNext = G.day + 18 + Math.floor(Math.random() * 12); }
    if (!G.wev) {
        if (G.wevNext == null) G.wevNext = 12 + Math.floor(Math.random() * 6);
        if (G.day >= G.wevNext) startWorldEvent();
    }
    if (!G.wev) return;
    const k = G.wev.k;
    // ťaženia: frakcia tiahne na svoj cieľ, kým udalosť trvá
    const aim = (f, names) => { const i = names.map(castleIdx).find(i => i >= 0 && hos(TW[i].f, f)); if (i != null) CP[f] = i; };
    if (k === 'gondor') aim(2, ['Osgiliath', 'Minas Tirith', 'Cair Andros', 'Pelargir']);
    if (k === 'rohan') aim(3, ['Helmov žľab', 'Edoras', 'Grimslade']);
}
/** Začne udalosť sveta k (alebo náhodnú, ktorá dáva zmysel). */
function startWorldEvent(k) {
    const pool = Object.keys(WORLD_EV).filter(x => x !== (G.wevLast || '') && (x !== 'ents' || TW.some(t => t.f === 3)) && (x !== 'gondor' || TW.some(t => t.f === 2)) && (x !== 'rohan' || TW.some(t => t.f === 3) && TW.some(t => t.f === 1)) && (x !== 'winter' || season() !== 1));
    k = k || pool[Math.floor(Math.random() * pool.length)];
    if (!k) return;
    const ev = WORLD_EV[k];
    G.wev = { k, end: G.day + ev.d }; G.wevLast = k;
    if (k === 'nazgul') { const t = TW.find(t => t.n === 'Minas Morgul') || TW.find(t => t.f === 2); if (t) for (let i = E.filter(e => e.nz).length; i < 5; i++) E.push({ id: ++NID, x: t.x + i * 20, y: t.y + 30, f: 2, nz: 1, n: 4, vx: 0, vy: 0, w: 0, nm: 'Nazgûl' }); }
    if (k === 'ents') {
        TW.forEach(t => { if (t.f === 3) t.g = Math.max(3, Math.round(t.g * .5)); });
        E.forEach(e => { if (e.f === 3 && !e.nz) e.n = Math.max(3, e.n * .7); });
        if (heroSide() === 0 && (G.ren || 0) >= 6 && (G.ent || 0) < 3) { G.ent = (G.ent || 0) + 1; lg('Stromobrad ti posiela enta, ktorý pôjde s tvojou družinou.'); }
    }
    if (k === 'gondor') E.forEach(e => { if (e.f === 2 && !e.nz) e.n = Math.round(e.n * 1.3); });
    if (k === 'rohan') E.forEach(e => { if (e.f === 3 && !e.nz) e.n = Math.round(e.n * 1.2); });
    chron('Udalosť sveta: ' + ev.n + '.');
    lg('Udalosť sveta: ' + ev.n + '.');
    if (typeof EVENTS !== 'undefined') TS = { s: 'Udalosť sveta: ' + ev.n, l: 300 };
    if (mode === 'map') { mode = 'town'; evShow('Správa zo sveta: ' + ev.n, ev.t + ' (trvá ' + ev.d + ' dní)'); btn('Pokračovať', () => { ov.classList.add('hide'); mode = 'map'; }, 0, 'door'); }
}

/** Koniec hry podľa strany, cti, strachu, Prsteňa a kráľovstva. why: 'story' alebo 'king'. */
function ending(why) {
    const side = heroSide(), hon = G.hon || 0, fear = G.fear || 0, castles = TW.filter(t => t.mine).length;
    let t, d;
    if (G.ring === 1) { t = 'Pán Prsteňa'; d = 'Prsteň si nezničil. Nosíš ho a jeho šepot je hlasnejší ako hlasy tvojich radcov. Kráľovstvá sa ti klaňajú, no každú noc vidíš v tme ohnivé oko – a už nevieš, či sa pozerá na teba, alebo tvojimi očami.'; }
    else if (G.fac === 6 && G.king) { t = 'Vlastné kráľovstvo'; d = 'Neslúžil si Západu ani Tieňu. Pod tvojou zástavou vyrástlo nové kráľovstvo s ' + castles + ' hradmi a jeho meno sa naučia deti v každej dedine od hôr po more. Kronikári sa ešte dlho budú hádať, či si bol osloboditeľ, alebo len ďalší pán.'; }
    else if (side === 0 && hon >= 10) { t = 'Mierový vládca'; d = 'Vojna sa skončila a tvoje meno sa spomína pri ohniskách s úctou. Držal si slovo, chránil slabých a ľud ti verí. Polia sa znova zelenajú a kováči kujú pluhy namiesto mečov.'; }
    else if (side === 0) { t = 'Železný pán Západu'; d = 'Tieň padol a ty si bol pri tom. No tvoje víťazstvá mali cenu – vypálené dediny a porušené sľuby si ľudia pamätajú. Západ je slobodný, ale pred tebou sa skláňa skôr zo strachu než z lásky.'; }
    else if (fear >= 20) { t = 'Tieň nad Stredozemou'; d = 'Biele mesto horí a tvoje zástavy vejú nad troskami. Tvoje meno šepkajú matky, aby deti poslúchali. Oko je spokojné – zatiaľ – a ty vieš, že jeho priazeň trvá len dovtedy, kým mu slúžiš.'; }
    else { t = 'Vazal Tieňa'; d = 'Vyhral si vojnu pre svojho pána a prežil si ju, čo je viac, než sa podarilo mnohým jeho veliteľom. Dostal si krajinu, otrokov a pokoj – a s ním aj večnú obavu, že jedného dňa si Oko spomenie aj na teba.'; }
    G.ending = t; chron('Koniec príbehu: ' + t + '.');
    mode = 'town';
    show(t, d + ' Za ' + G.day + ' dní: ' + statLine() + '.');
    btn('Kronika hrdinu', () => chronicle(() => ending(why)), 0, 'scroll');
    btn('Hrať ďalej', () => { ov.classList.add('hide'); mode = 'map'; }, 0, 'door');
    btn('Nová hra (hlavné menu)', () => location.reload(), 0, 'back');
}
const statLine = () => { const S = G.st || {}; return 'bitky ' + (S.b || 0) + ' (víťazstvá ' + (S.w || 0) + '), padlí nepriatelia ' + (S.k || 0) + ', dobyté hrady ' + (S.c || 0) + ', sláva ' + (G.ren || 0) + ', česť ' + (G.hon || 0) + ', strach ' + (G.fear || 0) + ', úroveň ' + (G.lv || 1); };
/** Kronika hrdinu: štatistiky a zápisy z ciest. */
function chronicle(back) {
    const fromMap = !back;
    if (fromMap) { if (mode !== 'map' && mode !== 'town') return; back = () => { ov.classList.add('hide'); mode = 'map'; }; }
    mode = 'town';
    PORTRAIT = Portraits.hero();
    const C = G.chron || [], perks = Object.keys(G.perk || {}).length;
    show('Kronika – ' + G.name, rank() + ' · ' + raceName() + ' · ' + traitName() + ' · deň ' + G.day + (G.ending ? ' · koniec: ' + G.ending : '') + '.'); ov.dataset.screen = 'sections';
    rowHead('Skutky');
    row(statLine() + ', najväčšie vojsko ' + (G.maxArmy || 0) + ' mužov, spoločníci ' + (G.comp || []).length + ', perky ' + perks + ', trofeje ' + (G.tro || []).length + '.');
    if (G.wev && worldEv(G.wev.k)) row('Práve teraz: ' + WORLD_EV[G.wev.k].n + ' (do dňa ' + G.wev.end + ').', { gold: 1 });
    rowHead('Zápisy z ciest');
    if (!C.length) row('Kronikár zatiaľ nemá čo zapísať. Choď a urob niečo, o čom sa bude spievať.');
    C.slice(-40).reverse().forEach(e => row('Deň ' + e.d + ': ' + e.s));
    btn(fromMap ? 'Zavrieť' : 'Späť', back, 0, 'back');
}
