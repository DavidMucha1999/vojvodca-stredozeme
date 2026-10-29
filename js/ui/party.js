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
        const d = document.createElement('div'); d.style.cssText = 'grid-column:1/-1;text-align:left;font-size:.9rem'; d.textContent = '„' + c.join + '“'; document.getElementById('bt').appendChild(d);
        const ok = G.ren >= c.ren && G.gold >= c.p && (G.comp || []).length < 4;
        btn('Pripojiť ' + c.n + ' (' + c.p + ' zlata' + (G.ren < c.ren ? ', treba slávu ' + c.ren : '') + ((G.comp || []).length >= 4 ? ', družina je plná' : '') + ')', () => { G.gold -= c.p; compJoin(c); msg(c.n + ' sa pridáva k tvojej družine. V bitke bude bojovať po tvojom boku.', () => town(i)); }, !ok);
    });
    btn('Späť', () => town(i));
}
/** Okno Družina (z mapy): spoločníci, ich stav, rozhovor a prepustenie. */
function party(back) {
    const fromMap = !back;
    if (fromMap) { if (mode !== 'map' && mode !== 'town') return; back = () => { ov.classList.add('hide'); mode = 'map'; }; }
    mode = 'town';
    const C = myComps();
    show('Družina', C.length ? 'Tvoji spoločníci (' + C.length + '/4). V bitke bojujú po tvojom boku; ranený spoločník sa pár dní zotavuje.' : 'Zatiaľ cestuješ sám. Spoločníkov nájdeš v krčmách hradov: hrdinovia dobra v Bree, Lothlóriene, Erebore, Minas Tirith, Edorase, Osgiliathe a Hobitove; služobníci Tieňa v Isengarde, Minas Morgul, Edorase, Barad-dûre, Umbare a pri Morannone.');
    C.forEach(c => {
        const hp = Math.round((G.chp && G.chp[c.id] != null ? G.chp[c.id] : 1) * 100), w = G.cwound && G.cwound[c.id] > G.day;
        rowHead(c.n + ', ' + c.t + ' · zdravie ' + hp + ' %' + (w ? ' · ranený, zotaví sa o ' + (G.cwound[c.id] - G.day) + ' d.' : ''));
        btn('Porozprávať sa s ' + c.n, () => compTalk(c, fromMap ? null : back));
        btn('Prepustiť ' + c.n, () => { compLeave(c); msg('„' + c.leave + '“', () => party(fromMap ? null : back)); });
    });
    btn(fromMap ? 'Zavrieť' : 'Späť', back);
}
function compTalk(c, back, line) {
    mode = 'town';
    show(c.n, '„' + (line || compLine(c)) + '“');
    btn('Povedz niečo', () => compTalk(c, back, compLine(c)));
    btn('Ako sa ti darí?', () => { const hp = G.chp && G.chp[c.id] != null ? G.chp[c.id] : 1; compTalk(c, back, hp > .8 ? 'Som pripravený. Kam ideme?' : hp > .5 ? 'Rany sa hoja. Ešte deň či dva a budem ako nový.' : 'Zle. Potrebujem odpočinok, nie ďalšiu bitku.'); });
    btn('Čo si myslíš o našej ceste?', () => compTalk(c, back, G.ren > 15 ? 'Ľudia o tebe hovoria. To je dobre, kým hovoria dobre.' : G.ring === 1 ? 'Nesieš to so sebou. Cítim to každý deň. Daj si pozor.' : 'Je to dlhá cesta. Ale dlhé cesty majú dobré konce, ak ich človek dojde.'));
    btn('Späť', () => party(back));
}
