/*
 * Rokovanie a rozhovor s veliteľom na mape alebo v sieni: dary, presviedčanie, témy rozhovoru podľa povahy (js/data/dialogue.js), úlohy od pána.
 */
function lord(e) {
    per(e);
    {
        mode = 'town';
        e.rl = e.rl || 0;
        PORTRAIT = Portraits.forLord(e);
        show(e.nm + ' (' + FN[e.f] + ')', 'Vzťah: ' + e.rl + '. Vojakov: ' + Math.ceil(e.n) + '. Tvoja sláva: ' + G.ren + '.');
        btn('Porozprávať sa', () => talk(e));
        btn('Spýtať sa na iných lordov', () => { const fr = friends(e).map(o => o.nm), fo = foes(e).map(o => o.nm); PORTRAIT = Portraits.forLord(e); msg('„' + (fr.length ? 'S ' + fr.join(' a ') + ' sme bojovali bok po boku; na tých sa dá spoľahnúť. ' : '') + (fo.length ? fo.join(' a ') + ' – tých nech mi nikto nespomína. ' : '') + (!fr.length && !fo.length ? 'Držím sa stranou dvorných hádok.' : '') + (loyOf(e) < 6 ? ' A môj pán? Radšej mlčať. Nie som s ním spokojný.' : '') + '“', () => lord(e)); }, 0, 'talk');
        btn('Darovať 50 zlata (+8 vzťah)', () => { G.gold -= 50; e.rl += 8; upd(); lord(e); }, G.gold < 50);
        if (e.f !== G.fac && !e.kr)
            btn('Presvedčiť k prestúpeniu (100 zlata)', () => {
                G.gold -= 100;
                upd();
                const sc = e.rl + G.ren * 3 + G.s.pr * 6 + (G.king ? 25 : 0) + Math.random() * 30, end = () => { ov.classList.add('hide'); mode = 'map'; };
                if (sc > 70) {
                    const o = e.f;
                    e.f = G.fac;
                    rl(G.fac, o, -6);
                    lg(e.nm + ' prestúpil k tebe.');
                    msg(e.nm + ' opúšťa ' + FN[o] + ' a pridáva sa k tebe.', end);
                }
                else {
                    e.rl -= 5;
                    msg(e.nm + ' odmieta. Potrebuje vyšší vzťah alebo väčšiu slávu.', end);
                }
            }, G.gold < 100);
        btn(typeof ROOM !== 'undefined' && ROOM ? 'Späť do siene' : 'Odísť', () => { if (typeof ROOM !== 'undefined' && ROOM) return roomReturn(); ov.classList.add('hide'); mode = 'map'; });
    }
    const p = document.querySelector('#ov p');
    if (p)
        p.textContent += ' Povaha: ' + TR[e.tr][0] + '. ' + TR[e.tr][1] + ' ' + BO[e.bo];
    const ps = [...document.querySelectorAll('#bt button')].find(b => /Presvedčiť/.test(b.textContent));
    if (ps && e.tr === 0 && (e.rl || 0) < 50) {
        ps.disabled = true;
        ps.textContent = 'Čestný veliteľ nezradí (treba vzťah 50)';
    }
    if (e.tr === 1 && e.f !== G.fac) {
        const b = document.createElement('button'), bt = document.getElementById('bt');
        b.textContent = 'Podplatiť (300 zlata, +30 vzťah)';
        b.disabled = G.gold < 300;
        b.onclick = () => { G.gold -= 300; e.rl = (e.rl || 0) + 30; upd(); lord(e); };
        bt.insertBefore(b, bt.lastChild);
    }
}
/** Kontext pre rozhovor s veliteľom e (pozri js/data/dialogue.js). */
const dlgCtx = e => ({ e, f: e.f, same: e.f === G.fac, war: hos(e.f, G.fac), rl: e.rl || 0, evil: bloc(e.f), king: !!e.kr, you: G.name, ren: G.ren, ring: G.ring === 1 });
/**
 * Rozhovor s veliteľom: pán hovorí podľa svojej povahy a frakcie, hráč vyberá témy.
 * line = čo pán práve povedal (bez neho pozdraví). Témy sa po použití už neponúkajú, kým sa okno nezavrie.
 */
function talk(e, line, used = {}) {
    per(e);
    const c = dlgCtx(e), say = s => '„' + s + '“';
    mode = 'town';
    PORTRAIT = Portraits.forLord(e);
    show(e.nm + ', ' + TR[e.tr][0] + ' veliteľ ' + FN[e.f], say(line || DLG.greet(c)));
    const topic = (key, label, fn) => { if (used[key]) return; btn(label, () => { used[key] = 1; const r = fn(c); if (typeof r === 'string') talk(e, r, used); else { e.rl = (e.rl || 0) + r.d; upd(); talk(e, r.t, used); } }); };
    topic('world', 'Čo sa deje vo svete?', c => DLG.pick(DLG.WORLD[c.f] || DLG.WORLD[0]));
    topic('plan', 'Aké máš plány?', c => DLG.PLAN[e.tr](c));
    topic('you', 'Čo si myslíš o mne?', c => DLG.YOU[e.tr](c));
    topic('war', c.war ? 'Prečo medzi nami vládne vojna?' : 'Čo si myslíš o mieri medzi nami?', c => DLG.WAR[e.tr](c));
    topic('liege', c.king ? 'Aké je to vládnuť?' : 'Čo si myslíš o svojom pánovi?', c => DLG.LIEGE[e.tr](c));
    topic('side', c.evil ? 'Prečo slúžiš Tieňu?' : 'Prečo bojuješ za dobro?', c => DLG.SIDE[e.tr](c));
    if (c.ring) topic('ring', 'Všimol si si niečo?', c => DLG.RING[e.tr](c));
    if (!c.war) {   // úloha od pána
        const qo = questFor(e), mine = (G.qu || []).find(q => q.lord === e.nm);
        if (mine) btn('O úlohe: ' + qDef(mine).n, () => talk(e, qStep(mine).k === 'r' ? 'Splnil si, o čo som žiadal? Príď za mnou do ' + mine.t + ', tam to uzavrieme.' : qText(mine, qStep(mine).s) + ' Nenechaj ma čakať pridlho.', used));
        else if (qo && (c.rl >= -5)) btn('Máš pre mňa úlohu?', () => questOffer(e, qo));
    }
    questEvent('t', e.f);
    topic('flatter', 'Zalichotiť', c => DLG.FLATTER[e.tr](c));
    topic('insult', 'Uraziť', c => DLG.INSULT[e.tr](c));
    btn('Späť k rokovaniu', () => lord(e));
}
/** Pán ponúkne úlohu: text zadania a prijatie alebo odmietnutie. */
function questOffer(e, qo) {
    mode = 'town';
    const d = qo.def, king = e.kr;
    PORTRAIT = Portraits.forLord(e);
    show(d.n, '„' + d.intro.replace(/\{Y\}/g, G.name) + '“\n\nOdmena: ' + d.r + ' zlata, sláva +' + d.ren + ', vzťah (' + e.nm + ') +' + d.rl * (king ? 2 : 1) + (king ? ', panovník: zlepší sa aj vzťah s frakciou ' + FN[e.f] : '') + '.');
    btn('Prijať úlohu', () => { questAccept(e, d, qo.home); talk(e, ['Dobre. Viem, že slovo dodržíš.', 'Výborne. Zlato čaká, keď bude hotovo.', 'Ďakujem. Naozaj ďakujem.', 'Dobre. Nesklam ma, mám na teba plány.', 'Tak choď. A nevracaj sa s prázdnymi rukami.', 'Múdra voľba. Budem sledovať, ako si počínaš.'][e.tr]); });
    btn('Odmietnuť', () => talk(e, ['Škoda. Ale vážim si, že si to povedal rovno.', 'Tvoja strata. Zlato si nájde iné ruky.', 'Ach... dobre. Chápem.', 'Zapamätám si, že si odmietol.', 'Zbabelec. Choď mi z očí.', 'Rozumiem. Možno inokedy.'][e.tr]));
}
