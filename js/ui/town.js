/*
 * Menu hradu, verbovanie, kováč, správa hradu, dvor, diplomacia, velitelia a dediny.
 */
function skills(i) {
    mode = 'town';
    show('Hrdina ' + G.name, 'Úroveň ' + G.lv + ', voľné body: ' + G.sk + '. Každá schopnosť môže mať až 5 stupňov.');
    [['st', 'Sila (+3 útok)'], ['od', 'Odolnosť (+15 zdravie)'], ['ob', 'Obratnosť (+8 % rýchlosť)'], ['pr', 'Presviedčanie (+6 pri prehováraní)'], ['ls', 'Lukostrelba (+1 zranenie šípov)']].forEach(([k, n]) => btn(n + ' [' + G.s[k] + ']', () => { G.sk--; G.s[k]++; upd(); skills(i); }, !G.sk || G.s[k] >= 5));
    btn('Späť', () => town(i));
}
function dip(i) {
    mode = 'town';
    show('Diplomacia', 'Rozhoduješ za: ' + FN[G.fac] + '.');
    [0, 1, 2, 3, 4, 5, 7, 8].filter(f => f !== G.fac).forEach(f => btn(FN[f] + ': ' + REL[G.fac][f] + ' (' + (WR[G.fac][f] ? 'vojna' : AL[G.fac][f] ? 'spojenec' : 'mier') + ')', () => dipF(i, f)));
    btn('Späť', () => town(i));
}
function dipF(i, f) {
    const a = G.fac;
    mode = 'town';
    show(FN[f], 'Vzťah: ' + REL[a][f] + ' (' + (WR[a][f] ? 'vojna' : AL[a][f] ? 'spojenec' : 'mier') + '). Tvoja sláva: ' + G.ren + '.');
    btn('Darovať 100 zlata (+8 vzťah)', () => { G.gold -= 100; rl(a, f, 8); upd(); dipF(i, f); }, G.gold < 100);
    if (WR[a][f])
        btn('Navrhnúť mier', () => {
            if (REL[a][f] + G.ren + G.s.pr * 3 > -35) {
                WR[a][f] = WR[f][a] = false;
                rl(a, f, 15);
                msg('Mier uzavretý.', () => dipF(i, f));
            }
            else
                msg('Odmietajú. Zlepši vzťah darmi.', () => dipF(i, f));
        });
    else {
        btn('Vyhlásiť vojnu', () => { WR[a][f] = WR[f][a] = true; AL[a][f] = AL[f][a] = false; rl(a, f, -40); dipF(i, f); });
        if (!AL[a][f])
            btn('Navrhnúť spojenectvo', () => {
                if (REL[a][f] >= 45 - Math.min(15, G.ren)) {
                    AL[a][f] = AL[f][a] = true;
                    msg('Spojenectvo uzavreté.', () => dipF(i, f));
                }
                else
                    msg('Vzťah nestačí (treba aspoň 45).', () => dipF(i, f));
            });
        else
            btn('Zrušiť spojenectvo', () => { AL[a][f] = AL[f][a] = false; rl(a, f, -15); dipF(i, f); });
    }
    if (G.wed < 0 && !WR[a][f])
        btn('Navrhnúť sobáš so šľachtičnou z rodu ' + FN[f], () => {
            if (REL[a][f] >= 30 && G.ren >= 8) {
                G.wed = f;
                AL[a][f] = AL[f][a] = true;
                rl(a, f, 30);
                lg('Sobáš s rodom ' + FN[f] + ', spojenectvo spečatené.');
                msg('Sobáš uzavretý. ' + FN[f] + ' je teraz tvoj spojenec.', () => dipF(i, f));
            }
            else
                msg('Odmietajú. Treba vzťah aspoň 30 a slávu 8.', () => dipF(i, f));
        });
    btn('Späť', () => dip(i));
}
function vill(i) {
    const v = VL[i], f = TW[v.t].f;
    mode = 'town';
    G.dest = -1;
    if (!v.good) v.good = villageGood(v, i);
    show(v.n + ' (' + FN[f] + ')', v.st > 0 ? 'Dedina je vypálená, obnoví sa o ' + v.st + ' dní.' : 'Dedina patrí k hradu ' + TW[v.t].n + '. Vyrába: ' + goodOf(v.good).n + ' (' + goodOf(v.good).ico + '), prosperita úroveň ' + lvl(v) + '.');
    if (v.st <= 0 && !hos(f, G.fac))
        btn('Trh (kúpiť a predať tovar)', () => market(v, () => vill(i)));
    if (v.st <= 0 && hos(f, G.fac))
        btn('Vyrabovať dedinu (bráni ju domáca stráž)', () => { ov.classList.add('hide'); startBattle({ n: 5 + Math.floor(Math.random() * 6), f, vil: v }); });
    if (v.st <= 0 && !hos(f, G.fac))
        btn('Najať dobrovoľníkov (3 pešiaci za 25)', () => {
            if (G.gold >= 25) {
                G.gold -= 25;
                G.inf += 3;
                upd();
                vill(i);
            }
        }, G.gold < 25);
    btn('Odísť', () => { ov.classList.add('hide'); mode = 'map'; });
}
function town(i) {
    const t = TW[i];
    G.dest = -1;
    mode = 'town';
    if (hos(t.f, G.fac)) {
        show(t.n + ' (' + FN[t.f] + ')', 'Nepriateľský hrad. Garnizón: ' + t.g + ' mužov. Pri dobývaní sa bránia o 30 % silnejšie.');
        btn('Obliehať hrad', () => siege(i));
        btn('Odísť', () => { ov.classList.add('hide'); mode = 'map'; });
        return;
    }
    qChk('v', t.n);
    questEvent('v', t.n);
    show(t.n + ' (' + FN[t.f] + ')', 'Zlato ' + G.gold + ', vojsko ' + ar() + ', zdravie ' + Math.ceil(G.hp) + '/' + mh() + '. Posádka hradu: ' + t.g + (t.lord ? ', léno drží ' + t.lord : '') + '.');
    [['r', 'Verbovanie vojakov'], ['e', 'Kováč a zbrojnica'], ['v', 'Vojsko, zajatci a odpočinok'], ...(t.mine ? [['h', 'Správa hradu']] : []), ['d', 'Dvor a diplomacia']].forEach(([c, n]) => btn(n, () => tsub(i, c)));
    btn('Trh', () => market(t, () => town(i)));
    btn('Krčma' + (compsAt(t).length ? ' (niekto tu čaká)' : ''), () => tavern(i));
    questsAt(t).forEach(q => {
        const d = qDef(q), s = qStep(q);
        if (s.k === 'r') btn('Úloha: uzavrieť „' + d.n + '“ u ' + q.lord, () => { questComplete(q); msg('„' + qText(q, d.done) + '“', () => town(i)); });
        else btn('Úloha: odovzdať ' + s.n + '× ' + goodOf(s.a).n + ' (' + d.n + ')', () => { if (questDeliver(q)) msg(q.step >= d.steps.length ? '„' + qText(q, d.done) + '“' : 'Tovar odovzdaný.', () => town(i)); }, ((G.cargo || {})[s.a] || 0) < s.n);
    });
    btn('Hrdina a schopnosti' + (G.sk ? ' (' + G.sk + ' bodov)' : ''), () => skills(i));
    btn('Turnaj v aréne (vstupné 20)', () => { G.gold -= 20; upd(); ov.classList.add('hide'); startBattle({ n: 3 + Math.floor(G.lv / 2), f: t.f, ar: 1, t }); }, G.gold < 20);
    if (G.ring === 1 && t.n === 'Barad-dûr' && bloc(G.fac) === 1)
        btn('Odovzdať Prsteň Sauronovi', () => { G.ring = 2; G.gold += 1000; G.ren += 10; lg('Odovzdal si Jeden prsteň Sauronovi.'); ach(); upd(); town(i); });
    btn('Uložiť hru', () => saveMenu(() => town(i)));
    btn('Odísť z mesta', () => { ov.classList.add('hide'); mode = 'map'; });
}
function tsub(i, c) {
    if (c === 'e')
        return smithy(i);
    const t = TW[i], re = () => { upd(); tsub(i, c); }, T = { r: 'Verbovanie vojakov', e: 'Kováč a zbrojnica', v: 'Vojsko, zajatci a odpočinok', h: 'Správa hradu', d: 'Dvor a diplomacia' };
    mode = 'town';
    show(T[c], 'Zlato: ' + G.gold + '.' + (c === 'r' ? ' Pešiaci ' + G.inf + ', jazdci ' + G.cav + ', lukostrelci ' + G.arc + ', elfovia ' + G.elf + ', rohirimi ' + G.roh + ', veteráni ' + G.vet + '.' : c === 'e' ? ' Útok ' + dmg() + ', ochrana ' + Math.round((1 - red()) * 100) + ' %.' : c === 'v' ? ' Zajatci ' + G.cap + ', skúsenosti ' + G.txp + ', zajatí velitelia ' + G.pri.length + '.' : c === 'h' ? ' Hradby stupeň ' + (t.wl || 0) + ', posádka ' + t.g + '.' : ' Hodnosť: ' + rank() + ', sláva ' + G.ren + ', frakcia: ' + FN[G.fac] + '.'));
    if (c === 'r')
        rec(t).forEach(([n, p, k]) => btn(n + ' (' + p + ' zlata)', () => { G.gold -= p; G[k]++; re(); }, G.gold < p));
    if (c === 'v') {
        btn('Odpočinúť si (plné zdravie)', () => { G.hp = mh(); re(); }, G.hp >= mh());
        btn('Povýšiť pešiaka na veterána (20 zlata, 15 skúseností)', () => { G.gold -= 20; G.txp -= 15; G.inf--; G.vet++; re(); }, G.gold < 20 || G.txp < 15 || G.inf < 1);
        btn('Naverbovať zajatcov (8 zlata/ks)', () => { const n = Math.min(G.cap, Math.floor(G.gold / 8)); G.gold -= n * 8; G.inf += n; G.cap -= n; re(); }, !G.cap || G.gold < 8);
        btn('Predať zajatcov (12 zlata/ks)', () => { G.gold += G.cap * 12; G.cap = 0; re(); }, !G.cap);
        btn('Výkupné za zajatých veliteľov (' + G.pri.length * 80 + ')', () => { G.gold += G.pri.length * 80; G.pri = []; re(); }, !G.pri.length);
    }
    if (c === 'h') {
        const w = t.wl || 0, cw = 150 * (w + 1), bd = t.bd || (t.bd = {});
        if (w < 3)
            btn('Vylepšiť hradby na stupeň ' + (w + 1) + ' (' + cw + ')', () => { G.gold -= cw; t.wl = w + 1; re(); }, G.gold < cw);
        else
            btn('Hradby: maximum', null, 1);
        const d = document.createElement('div'); d.style.cssText = 'grid-column:1/-1;text-align:left;font-size:.9rem;opacity:.85';
        d.textContent = 'Prosperita: úroveň ' + lvl(t) + ' (' + Math.round(t.pr ?? 40) + ' %), denný príjem ' + castleIncome(t) + ' zlata. ' + (bd.s ? 'Kováč predáva o 20 % lacnejšie. ' : '') + (bd.j ? 'Kone sú tu o 25 % lacnejšie a hrad dáva 1 jazdca za 3 dni. ' : '') + (bd.c ? 'Chrám: tvoji vojaci sú v bitke pevnejší (menej zranení). ' : '') + (bd.t ? 'Trhovisko priťahuje tovar a zvyšuje prosperitu. ' : '');
        document.getElementById('bt').appendChild(d);
        BUILDINGS.forEach(([k, n, c2]) => {
            if (bd[k])
                btn('Postavené: ' + n, null, 1);
            else
                btn('Postaviť: ' + n + ' (' + c2 + ')', () => {
                    G.gold -= c2;
                    bd[k] = 1;
                    if (k === 'v')
                        t.g += 8;
                    lg('V hrade ' + t.n + ' postavená budova: ' + n.split(' (')[0] + '.');
                    re();
                }, G.gold < c2);
        });
        if (!t.lord)
            E.filter(e => e.f === G.fac && !e.kr && Math.hypot(e.x - t.x, e.y - t.y) < 900).slice(0, 3).forEach(e => btn('Udeliť léno: ' + e.nm, () => { t.lord = e.nm; e.rl = (e.rl || 0) + 30; e.vas = 1; lg(e.nm + ' dostal léno ' + t.n + '.'); re(); }));
        else
            btn('Léno drží: ' + t.lord, null, 1);
    }
    if (c === 'd') {
        btn('Diplomacia s frakciami', () => dip(i));
        if (G.fac === 6 && t.f !== 6)
            btn('Vstúpiť do služieb: ' + FN[t.f], () => {
                G.fac = t.f;
                TW.forEach(x => {
                    if (x.f === 6)
                        x.f = t.f;
                });
                re();
            });
        if (G.fac !== 6)
            btn('Opustiť službu frakcie', () => {
                G.fac = 6;
                TW.forEach(x => {
                    if (x.mine)
                        x.f = 6;
                });
                re();
            });
        if (G.fac === 6 && !G.king && G.ren >= 14 && TW.filter(x => x.mine).length >= 3)
            btn('Korunovať sa za kráľa', () => { G.king = 1; lg(G.name + ' bol korunovaný za kráľa.'); re(); });
        if (G.king && G.side == null)
            btn('Vybrať stranu kráľovstva (dobro alebo zlo)', () => sideDlg(() => tsub(i, c)));
        if (G.king || G.ren >= 5)
            btn('Zvolať ťaženie na najbližší nepriateľský hrad', () => {
                const h = TW.filter(x => hos(x.f, G.fac)).sort((p, q) => Math.hypot(p.x - G.x, p.y - G.y) - Math.hypot(q.x - G.x, q.y - G.y))[0];
                if (h) {
                    CP[G.fac] = TW.indexOf(h);
                    msg('Ťaženie na ' + h.n + ' vyhlásené. Tvoji velitelia a spojenci sa zhromažďujú.', () => tsub(i, c));
                }
                else
                    msg('Nemáš nepriateľa.', () => tsub(i, c));
            });
    }
    btn('Späť', () => town(i));
}
function rec(t) {
    const L = [['Domobranec (pešiak)', 15, 'inf'], ['Lukostrelec', 30, 'arc'], ['Jazdec', 45, 'cav']];
    [t.f, ...[0, 1, 2, 3, 4, 5, 7, 8].filter(x => x !== t.f && AL[t.f][x] && !hos(x, G.fac))].forEach(f => (FK[f] || []).forEach(k => { G[k] = G[k] || 0; L.push([FU[k].n + ' (' + FN[f] + ', máš ' + G[k] + ')', FU[k].p, k]); }));
    return L;
}
/** Výber strany kráľovstva (pre kráľov z uložení spred tejto voľby). */
function sideDlg(back) {
    mode = 'town';
    show('Strana kráľovstva', 'Vyber, ktorú stranu bude tvoje kráľovstvo zastávať. Frakcie tejto strany uzavrú mier a frakcie druhej strany ti vyhlásia vojnu. Kováči v tvojich hradoch budú predávať výbavu tejto strany.');
    [['Strana dobra', 0], ['Strana zla', 1]].forEach(([n, v]) => btn(n, () => { chooseSide(v); upd(); back(); }));
    btn('Späť', back);
}
function kingDlg() {
    mode = 'town';
    show('Nové kráľovstvo', 'Si kráľom! Pomenuj svoje kráľovstvo, vyber znak, farbu štítu a stranu, ktorú budeš zastávať. Frakcie tvojej strany uzavrú mier, frakcie druhej strany ti vyhlásia vojnu a kováči v tvojich hradoch budú predávať výbavu tvojej strany.');
    const bt = document.getElementById('bt'), inp = document.createElement('input');
    inp.value = 'Kráľovstvo ' + G.name;
    inp.maxLength = 24;
    inp.style.gridColumn = '1/-1';
    inp.setAttribute('aria-label', 'Názov kráľovstva');
    bt.appendChild(inp);
    let ke = 6, kc = '#6a4a12', sd = heroSide();
    const EN = ['Biely strom', 'Kôň', 'Oko', 'Ruka', 'Had', 'Koruna', 'Hviezda', 'Slnko', 'List', 'Lebka'], KCs = ['#6a4a12', '#7a1a1a', '#1a3a6a', '#1f4a2a', '#3a1a4a', '#1a1a1a'];
    const rr = () => [...bt.querySelectorAll('button')].forEach(b => { b.style.outline = (b.dataset.e == ke || b.dataset.c === kc || b.dataset.sd == sd) ? '3px solid #fff' : ''; });
    [['Strana dobra', 0], ['Strana zla', 1]].forEach(([n, v]) => { const b = document.createElement('button'); b.textContent = n; b.dataset.sd = v; b.onclick = () => { sd = v; rr(); }; bt.appendChild(b); });
    EN.forEach((n, k) => { const b = document.createElement('button'); b.textContent = n; b.dataset.e = k; b.onclick = () => { ke = k; rr(); }; bt.appendChild(b); });
    KCs.forEach(c => { const b = document.createElement('button'); b.textContent = '\u00a0'; b.style.background = c; b.dataset.c = c; b.setAttribute('aria-label', 'Farba štítu'); b.onclick = () => { kc = c; rr(); }; bt.appendChild(b); });
    rr();
    btn('Potvrdiť korunováciu', () => { G.kn = inp.value.trim() || 'Nové kráľovstvo'; G.ke = ke; G.kc = kc; lg('Vzniklo kráľovstvo ' + G.kn + '.'); chooseSide(sd); upd(); ov.classList.add('hide'); mode = 'map'; });
}
function lord(e) {
    per(e);
    {
        mode = 'town';
        e.rl = e.rl || 0;
        show(e.nm + ' (' + FN[e.f] + ')', 'Vzťah: ' + e.rl + '. Vojakov: ' + Math.ceil(e.n) + '. Tvoja sláva: ' + G.ren + '.');
        btn('Porozprávať sa', () => talk(e));
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
        btn('Odísť', () => { ov.classList.add('hide'); mode = 'map'; });
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
    show(d.n, '„' + d.intro.replace(/\{Y\}/g, G.name) + '“\n\nOdmena: ' + d.r + ' zlata, sláva +' + d.ren + ', vzťah (' + e.nm + ') +' + d.rl * (king ? 2 : 1) + (king ? ', panovník: zlepší sa aj vzťah s frakciou ' + FN[e.f] : '') + '.');
    btn('Prijať úlohu', () => { questAccept(e, d, qo.home); talk(e, ['Dobre. Viem, že slovo dodržíš.', 'Výborne. Zlato čaká, keď bude hotovo.', 'Ďakujem. Naozaj ďakujem.', 'Dobre. Nesklam ma, mám na teba plány.', 'Tak choď. A nevracaj sa s prázdnymi rukami.', 'Múdra voľba. Budem sledovať, ako si počínaš.'][e.tr]); });
    btn('Odmietnuť', () => talk(e, ['Škoda. Ale vážim si, že si to povedal rovno.', 'Tvoja strata. Zlato si nájde iné ruky.', 'Ach... dobre. Chápem.', 'Zapamätám si, že si odmietol.', 'Zbabelec. Choď mi z očí.', 'Rozumiem. Možno inokedy.'][e.tr]));
}
/** Okno Úlohy: aktívne úlohy, postup a čo robiť ďalej. */
function questLog() {
    if (mode !== 'map') return;
    mode = 'town';
    const Q = G.qu || [], chap = QS[G.q];
    show('Úlohy', Q.length ? 'Máš ' + Q.length + ' z ' + MAX_QUESTS + ' úloh. Splnených: ' + Object.values(G.qdone || {}).reduce((a, b) => a + b, 0) + '.' : 'Nemáš žiadnu vedľajšiu úlohu. Porozprávaj sa s veliteľmi na mape, ponúknu ti prácu.');
    if (chap) { rowHead('Príbeh: kapitola ' + (G.q + 1) + '/' + QS.length); const d = document.createElement('div'); d.style.cssText = 'grid-column:1/-1;text-align:left;font-size:.9rem'; d.textContent = chap.t + (chap.k === 'k' ? ' (' + G.qc + '/' + chap.n + ')' : ''); document.getElementById('bt').appendChild(d); }
    Q.forEach(q => {
        const d = qDef(q), s = qStep(q);
        rowHead(d.n + ' · od ' + q.lord + ' (' + FN[q.lf] + ')');
        const el = document.createElement('div'); el.style.cssText = 'grid-column:1/-1;text-align:left;font-size:.9rem';
        el.textContent = 'Krok ' + (q.step + 1) + '/' + d.steps.length + ': ' + qText(q, s.s) + (s.k === 'k' ? ' Zatiaľ ' + q.cnt + '/' + s.n + '.' : s.k === 'd' ? ' Vezieš ' + ((G.cargo || {})[s.a] || 0) + '/' + s.n + '.' : '') + ' Odmena ' + d.r + ' zlata.';
        document.getElementById('bt').appendChild(el);
        btn('Vzdať sa úlohy: ' + d.n, () => { questAbandon(q); questLog(); });
    });
    btn('Zavrieť', () => { ov.classList.add('hide'); mode = 'map'; });
}

/** Výber pozície na uloženie. */
function saveMenu(back) {
    mode = 'town';
    show('Uložiť hru', 'Vyber pozíciu. Hra sa okrem toho sama ukladá na konci každého dňa do automatickej pozície.');
    SLOTS.filter(([k]) => k !== 'auto').forEach(([k, n]) => { const info = slotInfo(k); btn(n + ': ' + (info || 'prázdna'), () => msg(save(k) ? 'Hra uložená do pozície ' + k + '.' : 'Ukladanie nie je v tomto prostredí dostupné.', back)); });
    btn('Späť', back);
}
/** Výber pozície na načítanie (z úvodu). */
function loadMenu() {
    const any = SLOTS.some(([k]) => slotInfo(k));
    if (!any) return load(1);
    show('Načítať hru', 'Vyber uloženú pozíciu.');
    ov.classList.add('intro');
    SLOTS.forEach(([k, n]) => { const info = slotInfo(k); btn(n + ': ' + (info || 'prázdna'), () => load(k), !info); });
    btn('Späť', () => location.reload());
}
