/*
 * Spoločníci: krčma v hrade (pripojenie) a okno Družina (rozhovor, prepustenie).
 * Logika v js/sim/companions.js, postavy v js/data/companions.js.
 */
/** Krčma hradu i: spoločníci, ktorí tu čakajú. */
function tavern(i) {
    const t = TW[i], list = compsAt(t);
    mode = 'town';
    show('Krčma v ' + t.n, list.length ? 'Pri ohni sedí niekto, kto vyzerá, že hľadá prácu alebo spoločnosť.' : 'V krčme je dnes len obyčajný ľud. Hrdinovia sa tu objavujú podľa toho, kam ťa cesty zavedú a aká je tvoja sláva.');
    list.forEach(c => {
        rowHead(c.n + ', ' + c.t);
        row('„' + c.join + '“');
        const ok = G.ren >= c.ren && G.gold >= c.p && (G.comp || []).length < 4;
        btn('Pripojiť ' + c.n + ' (' + c.p + ' zlata' + (G.ren < c.ren ? ', treba slávu ' + c.ren : '') + ((G.comp || []).length >= 4 ? ', družina je plná' : '') + ')', () => { G.gold -= c.p; compJoin(c); msg(c.n + ' sa pridáva k tvojej družine. V bitke bude bojovať po tvojom boku.', () => town(i)); }, !ok);
    });
    btn('Späť', () => town(i));
}
/** Úroveň spoločníka podľa skúseností (G.cxp): každých 40 skúseností +1, najviac 10. Bonus +6 % zdravia a útoku za úroveň. */
const compLv = c => Math.min(10, 1 + Math.floor(((G.cxp || {})[c.id] || 0) / 40));
const compBonus = c => 1 + (compLv(c) - 1) * .06;
/** Okno Družina (z mapy): záložky Spoločníci, Vojsko a Rozkazy. */
function party(back, tab) {
    const fromMap = !back;
    if (fromMap) { if (mode !== 'map' && mode !== 'town') return; back = () => { ov.classList.add('hide'); mode = 'map'; }; }
    mode = 'town';
    tab = tab || 'c';
    const C = myComps(), re = t => party(fromMap ? null : back, t);
    const tabs = () => { [['c', 'Spoločníci', 'hero'], ['a', 'Vojsko', 'recruit'], ['z', 'Zásoby a zajatci', 'mug'], ['p', 'Perky' + (G.pp > 0 ? ' (' + G.pp + ')' : ''), 'crown'], ['o', 'Rozkazy', 'sword']].forEach(([k, n, ic]) => { const b = btn(n, () => re(k), 0, ic); if (k === tab) select(b); }); };
    if (tab === 'c') {
        show('Správa družiny – spoločníci', C.length ? 'Tvoji spoločníci (' + C.length + '/4). V bitke bojujú po tvojom boku, zbierajú skúsenosti (každých 40 = nová úroveň, +6 % zdravia a útoku) a ranený sa pár dní zotavuje.' : 'Zatiaľ cestuješ sám. Spoločníkov nájdeš v krčmách hradov: hrdinovia dobra v Bree, Lothlóriene, Erebore, Minas Tirith, Edorase, Osgiliathe a Hobitove; služobníci Tieňa v Isengarde, Minas Morgul, Edorase, Barad-dûre, Umbare a pri Morannone.');
        tabs();
        C.forEach(c => {
            const hp = Math.round((G.chp && G.chp[c.id] != null ? G.chp[c.id] : 1) * 100), w = G.cwound && G.cwound[c.id] > G.day, lv = compLv(c), xp = (G.cxp || {})[c.id] || 0, k = (G.ckills || {})[c.id] || 0;
            let pic = null; try { pic = { canvas: Portraits.canvas(c.look, 34), key: 'ico_por_c_' + c.id }; } catch (e) { }
            row(c.n + ' · ' + c.t + ' · úroveň ' + lv + ' (' + (xp % 40) + '/40) · zdravie ' + hp + ' %' + (w ? ' · ranený, zotaví sa o ' + (G.cwound[c.id] - G.day) + ' d.' : '') + ' · zabití: ' + k, { gold: 1, icon: pic });
            const m = (G.cmount || {})[c.id];
            row('Sila: zdravie ' + Math.round(c.hp * compBonus(c)) + ', útok ' + Math.round(c.d * compBonus(c)) + ', rýchlosť ' + c.sp.toFixed(1) + (c.archer ? ', lukostrelec' : ', bojovník zblízka') + (m ? ', na koni (' + SH.find(x => x.k === 'm').it[m].n + ')' : '') + '.', { dim: 1 });
            btn('Rozhovor', () => compTalk(c, fromMap ? null : back), 0, 'talk');
            const horses = (G.own && G.own.m || []).filter(i => i > 0 && i !== G.eq.m && !Object.entries(G.cmount || {}).some(([id, v]) => id !== c.id && v === i));
            if (!c.archer && c.id !== 'gimli') {
                if (m) btn('Zosadnúť z koňa', () => { delete G.cmount[c.id]; re('c'); }, 0, 'horse');
                else if (horses.length) btn('Dať koňa: ' + SH.find(x => x.k === 'm').it[horses[0]].n + ' (+30 % rýchlosti)', () => { (G.cmount = G.cmount || {})[c.id] = horses[0]; re('c'); }, 0, { k: 'm', i: horses[0] });
            }
            btn('Prepustiť', () => { compLeave(c); msg('„' + c.leave + '“', () => re('c')); }, 0, 'door');
        });
    }
    if (tab === 'a') {
        const up = Math.floor((G.inf + G.cav * 2) / 3);
        show('Správa družiny – vojsko', 'Vojsko spolu: ' + ar() + ' mužov, sila ' + Math.round(pw()) + '. Denný žold: ' + up + ' zlata (pešiaci a jazdci). Zajatci: ' + G.cap + ', skúsenosti na povýšenie: ' + G.txp + '.');
        tabs();
        const list = [['inf', 'Pešiaci', 'i'], ['arc', 'Lukostrelci', 'a'], ['cav', 'Jazdci', 'c'], ['vet', 'Veteráni', 'v'], ['elf', 'Elfovia', 'e'], ['roh', 'Rohirimi', 'r']];
        Object.keys(FU).filter(k => k[0] === 'u' && G[k]).forEach(k => list.push([k, FU[k].n, k]));
        if (G.ent) list.push(['ent', 'Enti (pastieri stromov)', 'n']);
        list.filter(([k]) => G[k] > 0).forEach(([k, n, u]) => { const b = btn(n + ': ' + G[k] + (k === 'inf' ? ' (žold 1/3 denne)' : k === 'cav' ? ' (žold 2/3 denne)' : ''), null, 1, { u }); b.style.opacity = 1; });
        if (G.inf > 3) btn('Prepustiť 5 pešiakov (menší žold)', () => { G.inf = Math.max(1, G.inf - 5); upd(); re('a'); }, 0, 'door');
        if (G.cap) btn('Prepustiť zajatcov (česť +1)', () => { G.cap = 0; G.hon = (G.hon || 0) + 1; upd(); re('a'); }, 0, 'chain');
    }
    if (tab === 'z') {
        const fd = G.fd || {}, evil = heroSide() === 1, w = woundedTotal();
        show('Správa družiny – zásoby a zajatci', 'Morálka družiny: ' + (G.pm ?? 60) + '/100' + ((G.pm ?? 60) < 25 ? ' – muži dezertujú!' : (G.pm ?? 60) < 40 ? ' – nespokojnosť' : (G.pm ?? 60) > 75 ? ' – výborná' : '') + '. Zásoby: ' + foodTotal() + ' porcií na ' + foodDays() + ' d (denne ' + foodNeed() + ').' + (G.hungry ? ' DRUŽINA HLADUJE.' : ''));
        tabs();
        row('Jedlo: ' + (Object.keys(fd).length ? Object.entries(fd).map(([k, n]) => foodName(k, evil) + ' ' + n).join(', ') : 'žiadne') + '. Jedlo kúpiš na trhu v hrade alebo v dedine; každý ďalší druh jedla dvíha morálku.', { gold: 1 });
        row('Morálku dvíha pestrá strava, víťazstvá, tvoja úroveň a perk Charizma; znižuje ju hlad, nevyplatený žold (zlato pod nulou), porážky a veľké vojsko. Pod 25 muži zbiehajú. V bitke sa prenáša do odvahy vojska.');
        row(w ? 'Ranení: ' + Object.entries(G.wd).map(([k, n]) => n + '× ' + ({ inf: 'pešiak', cav: 'jazdec', arc: 'lukostrelec', vet: 'veterán', elf: 'elf', roh: 'rohirim', ent: 'ent' }[k] || (FU[k] ? FU[k].n : k))).join(', ') + ' – hoja sa (v hrade rýchlejšie).' : 'Ranení: nikto.');
        if (G.cap) btn('Presvedčiť zajatcov, aby sa pridali (' + G.cap + ' zajatcov, šanca ' + Math.round(Math.min(.8, .12 + .06 * G.s.pr + (perk('nabor') ? .15 : 0) + (G.pm > 70 ? .05 : 0)) * 100) + ' %' + (G.prd === G.day ? ', dnes už nie' : '') + ')', () => { const n = recruitPrisoners(); upd(); msg(n ? n + ' zajatcov prisahalo vernosť a pridalo sa k tvojim pešiakom.' : 'Zajatci mlčia a hľadia do zeme. Nikto sa nepridal.', () => re('z')); }, G.prd === G.day, 'chain');
        if (G.cap) btn('Prepustiť zajatcov (česť +1)', () => { G.cap = 0; G.hon = (G.hon || 0) + 1; upd(); re('z'); }, 0, 'door');
    }
    if (tab === 'p') {
        show('Perky hrdinu', 'Voľné body perkov: ' + (G.pp || 0) + '. Za každú novú úroveň získaš bod. Vyšší perk vo vetve vyžaduje predošlý a úroveň hrdinu 2, 4 alebo 6 (teraz ' + (G.lv || 1) + ').');
        tabs();
        PERKS.forEach(([, bn, , list], bi) => {
            rowHead(bn);
            list.forEach(([id, n, d], ti) => { const st = perkState(bi, ti); const b = btn((st === 'has' ? '✔ ' : '') + n + ' – ' + d + (st !== 'has' && st !== 'ok' ? ' (' + st + ')' : ''), () => { takePerk(bi, ti); upd(); re('p'); }, st !== 'ok', PERKS[bi][2]); if (st === 'has') select(b); });
        });
    }
    if (tab === 'o') {
        show('Správa družiny – rozkazy', 'Východzí rozkaz, s ktorým vojsko vstupuje do bitky (v bitke vyberieš skupinu klávesmi 1–4 a rozkaz T Útok, H Držať, F Za mnou, G Šík, R Ústup).');
        tabs();
        [['a', 'Útok – všetci vpred', 'attack'], ['h', 'Držať líniu – lukostrelci strieľajú, pešiaci čakajú', 'shield'], ['f', 'Nasledovať hrdinu – šík okolo teba', 'hero'], ['l', 'Šík – línia čelom k nepriateľovi (lukostrelci za pechotou)', 'shield'], ['r', 'Ústup', 'back']].forEach(([k, n, ic]) => { const b = btn(n, () => { G.ord0 = k; re('o'); }, 0, ic); if ((G.ord0 || 'a') === k) select(b); });
    }
    btn(fromMap ? 'Zavrieť' : 'Späť', back, 0, 'back');
}
function compTalk(c, back, line) {
    mode = 'town';
    PORTRAIT = c.look;
    show(c.n, '„' + (line || compLine(c)) + '“');
    btn('Povedz niečo', () => compTalk(c, back, compLine(c)));
    btn('Ako sa ti darí?', () => { const hp = G.chp && G.chp[c.id] != null ? G.chp[c.id] : 1; compTalk(c, back, hp > .8 ? 'Som pripravený. Kam ideme?' : hp > .5 ? 'Rany sa hoja. Ešte deň či dva a budem ako nový.' : 'Zle. Potrebujem odpočinok, nie ďalšiu bitku.'); });
    btn('Čo si myslíš o našej ceste?', () => compTalk(c, back, G.ren > 15 ? 'Ľudia o tebe hovoria. To je dobre, kým hovoria dobre.' : G.ring === 1 ? 'Nesieš to so sebou. Cítim to každý deň. Daj si pozor.' : 'Je to dlhá cesta. Ale dlhé cesty majú dobré konce, ak ich človek dojde.'));
    btn('Späť', () => party(back));
}
