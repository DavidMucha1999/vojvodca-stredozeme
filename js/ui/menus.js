/*
 * Prehľad sveta, návod, denník, štatistiky, trofeje, úspechy, celá obrazovka a encyklopédia.
 */
function ovw() {
    if (mode !== 'map')
        return;
    mode = 'town';
    show('Prehľad sveta', 'Rozhoduješ za: ' + FN[G.fac] + '. Hrady: ' + TW.filter(t => t.f === G.fac).length + '.');
    const bt = document.getElementById('bt');
    [0, 1, 2, 3, 4, 5, 7, 8].forEach(f => { row(FN[f] + ': hrady ' + TW.filter(t => t.f === f).length + ', vzťah ' + (f === G.fac ? '-' : REL[G.fac][f]) + ', ' + (f === G.fac ? 'tvoja frakcia' : WR[G.fac][f] ? 'vojna' : AL[G.fac][f] ? 'spojenec' : 'mier') + '. Velitelia: ' + (E.filter(e => e.f === f).map(e => e.nm + ' ' + Math.ceil(e.n)).join(', ') || '-')); });
    btn('Minimapa: hrady ' + (MF.t ? 'zap' : 'vyp'), () => { MF.t = !MF.t; mode = 'map'; ovw(); });
    btn('Minimapa: velitelia ' + (MF.e ? 'zap' : 'vyp'), () => { MF.e = !MF.e; mode = 'map'; ovw(); });
    btn('Zavrieť', () => { ov.classList.add('hide'); mode = 'map'; });
}
function help() {
    mode = 'town';
    show('Návod', 'Na mape klikni, kam má družina ísť. Klikni na armádu a začne bitka, klikni na hrad a vojdi dnu. Ostatné sa dozvieš na mieste.');
    btn('Rozumiem', () => {
        ov.classList.add('hide');
        mode = 'map';
        if (G.q === 0 && !G.qs) {
            G.qs = 1;
            qShow();
        }
    });
}
function dnk() {
    if (mode !== 'map')
        return;
    mode = 'town';
    show('Denník udalostí', LOG.length ? 'Najnovšie udalosti sú hore.' : 'Zatiaľ sa nič nestalo.'); ov.dataset.screen = 'sections';
    LOG.slice(0, 25).forEach(s => { row(s); });
    btn('Zavrieť', () => { ov.classList.add('hide'); mode = 'map'; });
}
function sts() {
    if (mode !== 'map')
        return;
    mode = 'town';
    const s = G.st || {};
    show('Štatistiky', G.name + ', ' + rank() + '. Deň ' + G.day + '.'); ov.dataset.screen = 'sections';
    [['Bitky', s.b], ['Víťazstvá', s.w], ['Prehry', s.l], ['Porazení nepriatelia', s.k], ['Padlí vlastní vojaci', s.d], ['Dobyté hrady', s.c], ['Vyrabované dediny', s.r], ['Vlastné hrady', TW.filter(t => t.mine).length], ['Sláva', G.ren], ['Zlato', G.gold]].forEach(([n, v]) => { row(n + ': ' + (v || 0)); });
    btn('Zavrieť', () => { ov.classList.add('hide'); mode = 'map'; });
}
function tro() {
    if (mode !== 'map')
        return;
    mode = 'town';
    const T = G.tro || [], D = G.dl || [];
    show('Trofeje a porazení velitelia', 'Trofeje: ' + T.length + ' (každá +1 útok). Porazení velitelia: ' + D.length + '.'); ov.dataset.screen = 'sections';
    const bt = document.getElementById('bt');
    [...T.map(s => '🏆 ' + s), ...D.slice(0, 20).map(s => '⚔ ' + s)].forEach(s => { row(s); });
    btn('Zavrieť', () => { ov.classList.add('hide'); mode = 'map'; });
}
function achs() {
    if (mode !== 'map')
        return;
    mode = 'town';
    G.ach = G.ach || {};
    show('Úspechy', 'Získané: ' + Object.keys(G.ach).length + '/' + ACH.length + '.'); ov.dataset.screen = 'sections';
    const bt = document.getElementById('bt');
    ACH.forEach(([id, n]) => { row((G.ach[id] ? '✔ ' : '✘ ') + n, { dim: !G.ach[id] }); });
    btn('Zavrieť', () => { ov.classList.add('hide'); mode = 'map'; });
}
function fsc() { try {
    const w = document.getElementById('wrap');
    if (document.fullscreenElement)
        document.exitFullscreen();
    else
        (w.requestFullscreen || w.webkitRequestFullscreen).call(w);
}
catch (e) { } }
const fstat = f => WR[G.fac] && f !== G.fac ? (hos(f, G.fac) ? ['Vojna', '#c0392b'] : AL[G.fac][f] ? ['Spojenec', '#4a9a4a'] : ['Mier', '#7a7a6a']) : f === G.fac ? ['Tvoja frakcia', '#d9a441'] : ['-', '#7a7a6a'];
const epill = (t, c, dot) => '<span class="pill" style="--fc:' + c + '">' + (dot ? '<i></i>' : '') + t + '</span>';
const ebar = (v, mx, c) => '<div class="bar"><b style="width:' + Math.max(2, Math.min(100, v / mx * 100)) + '%;background:' + c + '"></b></div>';
const eesc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let EF = -1;
function ency(c) {
    if (!G || (mode !== 'map' && mode !== 'town'))
        return;
    c = c || 'f';
    mode = 'town';
    ov.classList.add('encv');
    const T = [['f', 'Frakcie'], ['l', 'Velitelia'], ['u', 'Jednotky'], ['h', 'Hrady'], ['r', 'Pravidlá a povesť']];
    let h = '<div class="enc"><div class="enc-top"><h1>Encyklopédia Stredozeme</h1><button id="ecl">Zavrieť</button></div><div class="tabs">' + T.map(([k, n]) => '<button data-t="' + k + '" class="' + (k === c ? 'on' : '') + '">' + n + '</button>').join('') + '</div>';
    const F = [0, 1, 2, 3, 4, 5, 7, 8, 9, 6];
    if (c === 'f') {
        h += '<div class="egrid">';
        F.forEach(f => {
            const img = snap(84, 84, () => { const g = ctx.createRadialGradient(42, 42, 4, 42, 42, 60); g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 84, 84); bnr(20, 8, f, 44, 62); });
            const L = E.filter(e => e.f === f), k = L.find(e => e.kr), s = fstat(f), us = (FK[f] || []).map(u => FU[u].n);
            h += '<div class="card" style="--fc:' + FC[f] + '"><img src="' + img + '" width="84" height="84" alt=""><div class="cb"><div class="nm">' + eesc(FN[f]) + '</div>' + epill(s[0], s[1], 1) + (k ? epill('Panovník: ' + eesc(k.nm), '#ffd24a') : '') + '<div class="desc">' + eesc(FD[f].replace(/^[^:]+: /, '')) + '</div>' +
                (us.length ? '<div>' + us.map(n => epill(eesc(n), FC[f])).join('') + '</div>' : '') +
                '<div class="st"><span>Hrady ' + TW.filter(t => t.f === f).length + '</span>' + ebar(TW.filter(t => t.f === f).length, 12, FC[f]) + '<span>Velitelia ' + L.length + '</span>' + ebar(L.length, 8, FC[f]) + '<span>Vojsko ' + Math.round(L.reduce((a, e) => a + e.n, 0)) + '</span>' + ebar(L.reduce((a, e) => a + e.n, 0), 150, FC[f]) +
                (f !== G.fac && f < 9 && REL[G.fac] ? '<span>Vzťah ' + REL[G.fac][f] + '</span>' + ebar(REL[G.fac][f] + 100, 200, REL[G.fac][f] < 0 ? '#c0392b' : '#4a9a4a') : '') + '</div></div></div>';
        });
        h += '</div>';
    }
    if (c === 'l') {
        h += '<div class="chips"><button data-ef="-1" style="--fc:#d9a441" class="' + (EF < 0 ? 'on' : '') + '">Všetci</button>' + F.filter(f => E.some(e => e.f === f)).map(f => '<button data-ef="' + f + '" style="--fc:' + FC[f] + '" class="' + (EF === f ? 'on' : '') + '">' + eesc(FN[f]) + '</button>').join('') + '</div><div class="egrid">';
        E.filter(e => EF < 0 || e.f === EF).sort((a, b) => (b.kr | 0) - (a.kr | 0) || (b.nz | 0) - (a.nz | 0) || a.f - b.f).forEach(e => {
            per(e);
            const img = Portraits.canvas(Portraits.forLord(e), 84).toDataURL(), hs = hos(e.f, G.fac), r = Math.round(e.rl || 0);
            h += '<div class="card" style="--fc:' + FC[e.f] + '"><img src="' + img + '" width="72" height="82" alt=""><div class="cb"><div class="nm">' + eesc(e.nm) + '</div>' + epill(eesc(FN[e.f]), FC[e.f], 1) + (e.kr ? epill('Panovník', '#ffd24a') : '') + (e.nz ? epill('Prsteňový prízrak', '#c0392b') : '') + (e.vas ? epill('Tvoj vazal', '#d9a441') : '') + (e.f !== 9 && !e.nz ? epill(TR[e.tr][0], '#9fb8a0') : '') + epill(hs ? 'Nepriateľ' : 'Priateľ', hs ? '#c0392b' : '#4a9a4a') +
                '<div class="desc">' + (e.nz ? 'Jeden z deviatich služobníkov Temného pána, ktorý cíti Jeden prsteň na veľkú diaľku.' : e.f === 9 ? 'Vodca lúpežníckej tlupy, ktorý prepadáva dediny a pocestných.' : eesc(TR[e.tr][1] + ' ' + BO[e.bo])) + '</div><div class="st"><span>Vojsko ' + Math.ceil(e.n) + '</span>' + ebar(e.n, 40, FC[e.f]) + '<span>Vzťah ' + r + '</span>' + ebar(r + 100, 200, r < 0 ? '#c0392b' : '#4a9a4a') + '</div></div></div>';
        });
        h += '</div>';
    }
    if (c === 'u') {
        const B = [['Domobranec', 'i', 6, 15, 'Pechota'], ['Lukostrelec', 'a', 6, 30, 'Strelec'], ['Jazdec', 'c', 6, 45, 'Jazda'], ['Veterán', 'v', 6, 0, 'Pechota'], ['Troll', 't', 2, 0, 'Netvor'], ['Vlk', 'w', 3, 0, 'Netvor'], ['Olifant', 'x', 4, 0, 'Netvor'], ['Nazgûl', 'z', 2, 0, 'Prízrak']];
        const P = { i: [30, 5, 1.2], a: [24, 5, 1.1], c: [45, 7, 1.9], v: [50, 8, 1.25], t: [120, 14, .8], w: [18, 5, 2.2], x: [220, 20, .7], z: [150, 13, 1.5] };
        const card = (n, k, f, p, ty, hp, d, sp, en) => {
            const img = snap(84, 84, () => { const g = ctx.createRadialGradient(42, 42, 4, 42, 42, 60); g.addColorStop(0, '#3a5a2e'); g.addColorStop(1, '#16220f'); ctx.fillStyle = g; ctx.fillRect(0, 0, 84, 84); const u = mk(en ? 1 : 0, k, f); Object.assign(u, { x: 0, y: 0, f: -.6, c: 0, bn: false }); u.hp = u.mh; const key = Art.unitArt(u), sp2 = Soldiers.UNITS[key] || Soldiers.UNITS.i; ctx.translate(42, 48); ctx.rotate(-.6); const sc = Math.min(3, 22 / u.r) * .55; ctx.scale(sc, sc); Soldiers.drawUnit(ctx, sp2, 0, 'base'); });
            return '<div class="card" style="--fc:' + FC[f] + '"><img src="' + img + '" width="72" height="72" alt=""><div class="cb"><div class="nm">' + eesc(n) + '</div>' + epill(eesc(FN[f]), FC[f], 1) + epill(ty, '#9fb8a0') + (p ? epill('Cena ' + p, '#d9a441') : '') + '<div class="st"><span>Zdravie ' + hp + '</span>' + ebar(hp, 220, '#6fbf5a') + '<span>Útok ' + d + '</span>' + ebar(d, 20, '#e0662b') + '<span>Rýchlosť ' + sp + '</span>' + ebar(sp, 2.3, '#8fb0c9') + '</div></div></div>';
        };
        h += '<div class="sec">Základné jednotky a netvory</div><div class="egrid">' + B.map(([n, k, f, p, ty]) => card(n, k, f, p, ty, ...P[k], f !== 6)).join('') + '</div><div class="sec" style="margin-top:.6rem">Elitné jednotky frakcií</div><div class="egrid">';
        Object.entries(FU).forEach(([k, u]) => { const hp = u.hp || (k === 'roh' ? 60 : 26), d = u.d || (k === 'roh' ? 9 : 6), sp = u.sp || (k === 'roh' ? 2.1 : 1.3), ty = { i: 'Pechota', a: 'Strelec', e: 'Strelec', c: 'Jazda' }[u.b] || (k === 'roh' ? 'Jazda' : 'Strelec'); h += card(u.n, k, u.f, u.p, ty, hp, d, sp, 0); });
        h += '</div>';
    }
    if (c === 'h') {
        h += '<div class="chips"><button data-ef="-1" style="--fc:#d9a441" class="' + (EF < 0 ? 'on' : '') + '">Všetky</button>' + F.filter(f => TW.some(t => t.f === f)).map(f => '<button data-ef="' + f + '" style="--fc:' + FC[f] + '" class="' + (EF === f ? 'on' : '') + '">' + eesc(FN[f]) + '</button>').join('') + '</div><div class="egrid">';
        TW.filter(t => EF < 0 || t.f === EF).forEach(t => {
            const img = snap(110, 84, () => { const g = ctx.createLinearGradient(0, 0, 0, 84); g.addColorStop(0, '#3a4a5a'); g.addColorStop(1, '#2a3a20'); ctx.fillStyle = g; ctx.fillRect(0, 0, 110, 84); const im = Art.img['map_castle_' + t.f]; if (im) ctx.drawImage(im, 55 - im.width * .3 / 2, 80 - im.height * .3, im.width * .3, im.height * .3); });
            const L = lvl(t), bd = t.bd || {}, vs = VL.filter(v => v.t === TW.indexOf(t));
            h += '<div class="card" style="--fc:' + FC[t.f] + '"><img src="' + img + '" width="96" height="73" alt=""><div class="cb"><div class="nm">' + eesc(t.n) + ' <span style="color:#ffd24a;font-size:.8rem">' + '★'.repeat(L) + '</span></div>' + epill(eesc(FN[t.f]), FC[t.f], 1) + (t.mine ? epill('Tvoj hrad', '#d9a441') : '') + (t.lord ? epill('Léno: ' + eesc(t.lord), '#9fb8a0') : '') +
                (bd.m ? epill('Mlyn', '#8a7a6a') : '') + (bd.k ? epill('Kasárne', '#8a7a6a') : '') + (bd.v ? epill('Strážna veža', '#8a7a6a') : '') + '<div class="st"><span>Posádka ' + t.g + '</span>' + ebar(t.g, 50, FC[t.f]) + '<span>Prosperita ' + Math.round(t.pr ?? 40) + ' %</span>' + ebar(t.pr ?? 40, 100, '#d9a441') + '<span>Hradby ' + (t.wl || 0) + '/3</span>' + ebar(t.wl || 0, 3, '#9a9aa6') + '</div><div class="desc">Dediny: ' + eesc(vs.map(v => v.n + (v.st > 0 ? ' (vypálená)' : '')).join(', ')) + '</div></div></div>';
        });
        h += '</div>';
    }
    if (c === 'r') {
        const R = [['Povesť', 'Česť ' + (G.hon || 0) + ' a strach ' + (G.fear || 0) + '. Prepúšťanie zajatcov zvyšuje česť, popravy a rabovanie strach. Čestní velitelia ťa majú radi pri vysokej cti, krutí pri vysokom strachu. Veľký strach ti prináša dane od vystrašených dedín.', '#d9a441'],
            ['Čas, pauza a tábor', 'Hra stojí, keď stojíš. Ak chceš čakať a nechať čas plynúť, utábor sa tlačidlom Tábor. V tábore sa každý deň uzdravíš.', '#9fb8a0'],
            ['Obliehanie', 'Pri nepriateľskom hrade postav rebríky a baranidlo, vyhladuj posádku a potom zaútoč na hradby. Vojaci prejdú len cez zničenú bránu alebo po rebríkoch.', '#9a9aa6'],
            ['Rada šľachticov', 'Ak slúžiš frakcii, rada sa schádza každý 7. deň a hlasuje o lénach a vojnách. Tvoj hlas má váhu podľa slávy.', '#7aa84a'],
            ['Povahy veliteľov', TR.map(t => t[0] + ': ' + t[1]).join(' '), '#8fb0c9'],
            ['Jeden prsteň', 'Dáva veľkú moc, no každý deň ťa kazí a priťahuje Nazgûlov. Zničíš ho pri Hore osudu, alebo ho ako služobník Tieňa odovzdáš v Barad-dûre.', '#e0662b'],
            ['Cesta ku korune', 'Buď nezávislý, získaj slávu 14 a drž aspoň 3 hrady. Potom sa v hrade korunuj, pomenuj kráľovstvo a vyber erb.', '#ffd24a']];
        h += '<div class="egrid">' + R.map(([n, d, col]) => '<div class="card" style="--fc:' + col + '"><div class="cb"><div class="nm">' + n + '</div><div class="desc">' + eesc(d) + '</div>' + (n === 'Povesť' ? '<div class="st"><span>Česť</span>' + ebar((G.hon || 0) + 50, 100, '#d9a441') + '<span>Strach</span>' + ebar(G.fear || 0, 50, '#c0392b') + '</div>' : '') + '</div></div>').join('') + '</div>';
    }
    ov.innerHTML = h + '</div>';
    ov.classList.remove('hide');
    ov.scrollTop = 0;
    ov.querySelector('#ecl').onclick = () => { ov.classList.remove('encv'); ov.classList.add('hide'); mode = 'map'; };
    ov.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { EF = -1; ency(b.dataset.t); });
    ov.querySelectorAll('[data-ef]').forEach(b => b.onclick = () => { EF = +b.dataset.ef; ency(c); });
}
