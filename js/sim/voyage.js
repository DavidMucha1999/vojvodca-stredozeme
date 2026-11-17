/*
 * Plavba: v prístavných hradoch (more: Šedé prístavy, Dol Amroth, Pelargir, Umbar; Anduin: Pelargir, Osgiliath, Cair Andros, Lothlórien)
 * si najmeš loď do iného prístavu. Plavba stojí zlato podľa vzdialenosti a veľkosti družiny a trvá niekoľko dní (žold aj jedlo bežia).
 * Na mori pri juhu číhajú korzári z Umbaru. Plaviť sa dá aj k nepriateľskému prístavu – družina sa vylodí pred jeho hradbami.
 */
const PORTS = { 'Šedé prístavy': 'sea', 'Dol Amroth': 'sea', 'Pelargir': 'both', 'Umbar': 'sea', 'Osgiliath': 'river', 'Cair Andros': 'river', 'Lothlórien': 'river' };
const portIdx = n => TW.findIndex(t => t.n === n);
const sameWater = (a, b) => { const A = PORTS[a], B = PORTS[b]; return A && B && a !== b && (A === 'both' || B === 'both' || A === B); };
/** Prístavy, kam sa dá doplávať z hradu i. */
const portsFrom = i => Object.keys(PORTS).filter(n => sameWater(TW[i].n, n)).map(portIdx).filter(j => j >= 0);
const sailDist = (i, j) => Math.hypot(TW[i].x - TW[j].x, TW[i].y - TW[j].y);
const sailCost = (i, j) => 20 + Math.round(sailDist(i, j) / K / 12) + Math.ceil(men() / 4);
const sailDays = (i, j) => Math.max(1, Math.round(sailDist(i, j) / K / 260));
const pirateRisk = (i, j) => { const s = [TW[i].n, TW[j].n]; return (s.includes('Umbar') || s.includes('Pelargir') || s.includes('Dol Amroth')) && PORTS[TW[i].n] !== 'river' && PORTS[TW[j].n] !== 'river' && hos(4, G.fac) ? .35 : 0; };
/** Plavba z i do j: dni plynú (žold, jedlo, svet), družina sa vylodí pri cieľovom hrade; možný prepad korzárov. Vráti text. */
function sail(i, j, free) {
    if (!free) G.gold -= sailCost(i, j);
    const days = sailDays(i, j), t = TW[j];
    for (let d = 0; d < days; d++) { G.day++; G.gold -= Math.floor((G.inf + G.cav * 2) / 3); dayT = 0; daily2(); }
    const hostile = hos(t.f, G.fac);
    G.x = G.tx = t.x + (hostile ? 120 : 30); G.y = G.ty = t.y + (hostile ? 110 : 40); G.dest = -1; G.camp = 0; G.stay = 0; G.chase = null;
    lg('Doplával si do ' + t.n + ' (' + days + ' d).');
    if (Math.random() < pirateRisk(i, j)) return { pirates: 1, text: 'Pri vyloďovaní sa z hmly vynorili čierne plachty korzárov z Umbaru!' };
    return { text: 'Loď pristála ' + (hostile ? 'pod hradbami nepriateľského hradu ' + t.n + '. Vylodenie sa podarilo – môžeš začať obliehanie.' : 'v prístave ' + t.n + '.') + ' Plavba trvala ' + days + ' d.' };
}
/** Okno prístavu v hrade i. */
function portMenu(i) {
    mode = 'town';
    const P = portsFrom(i);
    show('Prístav – ' + TW[i].n, 'Kapitáni ponúkajú plavbu. Cena závisí od vzdialenosti a veľkosti družiny (' + men() + ' mužov); počas plavby plynie čas, žold aj jedlo.' + (P.some(j => pirateRisk(i, j)) ? ' Na juhu pozor na korzárov z Umbaru.' : ''));
    P.forEach(j => {
        const c = sailCost(i, j), hostile = hos(TW[j].f, G.fac), risk = pirateRisk(i, j);
        btn('Plaviť sa do ' + TW[j].n + ' · ' + sailDays(i, j) + ' d · ' + c + ' zlata' + (hostile ? ' (vylodenie pri nepriateľskom hrade)' : '') + (risk ? ' · korzári' : ''), () => {
            const r = sail(i, j); upd();
            mode = 'town'; evShow('Plavba', r.text);
            if (r.pirates) btn('Brániť sa (boj s korzármi)', () => { ov.classList.add('hide'); startBattle({ n: 10 + Math.floor(G.day / 4), f: hos(4, G.fac) ? 4 : 9, nm: 'Korzári z Umbaru' }); }, 0, 'sword');
            else btn('Vylodiť sa', () => { ov.classList.add('hide'); mode = 'map'; }, 0, 'door');
        }, G.gold < c, 'map');
    });
    btn('Späť', () => town(i), 0, 'back');
}
