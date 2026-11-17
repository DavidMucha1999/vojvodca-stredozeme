/*
 * Menu hradu, verbovanie, kováč, správa hradu, dvor, diplomacia, velitelia a dediny.
 */
function skills(i) {
    mode = 'town';
    PORTRAIT = Portraits.hero();
    RICH.back = () => town(i); RICH.backLabel = 'Späť'; RICH.tab = 'attr';
    show('Hrdina ' + G.name, 'Rasa: ' + raceName() + ', povaha: ' + traitName() + '. Úroveň ' + G.lv + ', voľné body: ' + G.sk + '. Každá schopnosť môže mať až 5 stupňov.');
    [['st', 'Sila (+3 útok)'], ['od', 'Odolnosť (+15 zdravie)'], ['ob', 'Obratnosť (+8 % rýchlosť)'], ['pr', 'Presviedčanie (+6 pri prehováraní)'], ['ls', 'Lukostrelba (+1 zranenie šípov)']].forEach(([k, n]) => btn(n + ' [' + G.s[k] + ']', () => { G.sk--; G.s[k]++; upd(); skills(i); }, !G.sk || G.s[k] >= 5));
    ov.dataset.screen = 'hero';   // obrazovka Hrdina (js/engine/scenes/UIRich.js)
    btn('Perky' + (G.pp > 0 ? ' (voľné: ' + G.pp + ')' : ''), () => party(() => skills(i), 'p'), 0, 'crown');
    btn('Bojové schopnosti' + (G.bk > 0 ? ' (voľné: ' + G.bk + ')' : ''), () => party(() => skills(i), 'b'), 0, 'sword');
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
    show(FN[f], 'Vzťah: ' + REL[a][f] + ' (' + (WR[a][f] ? 'vojna' : AL[a][f] ? 'spojenec' : truceLeft(f) ? 'prímerie ešte ' + truceLeft(f) + ' d' : 'mier') + '). Tvoja sláva: ' + G.ren + '. Sila: tvoja strana ' + Math.round(facPower(a)) + ', ' + FN[f] + ' ' + Math.round(facPower(f)) + '.');
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
    // prímerie, tribút, výmena zajatcov, spoločná vojna (js/sim/realm.js)
    if (WR[a][f]) {
        btn('Navrhnúť prímerie na 20 dní', () => { if (REL[a][f] + G.ren + G.s.pr * 3 > -60) { makeTruce(f, 20); rl(a, f, 5); msg('Prímerie uzavreté. Po 20 dňoch sa vojna obnoví, ak vzťah ostane zlý.', () => dipF(i, f)); } else msg('Odmietajú aj prímerie.', () => dipF(i, f)); }, 0, 'honor');
        if (facPower(a) > facPower(f) * 1.3) btn('Požadovať tribút (' + tributeAsk(f) + ' zlata a prímerie 15 dní)', () => { if (Math.random() < .5 + (facPower(a) / facPower(f) - 1.3) * .5 + G.s.pr * .05) { G.gold += tributeAsk(f); makeTruce(f, 15); rl(a, f, -10); lordsOf(f).forEach(e => lordMem(e, 'Prinútil si nás platiť tribút.', -3)); upd(); msg(FN[f] + ' platí tribút ' + tributeAsk(f) + ' zlata.', () => dipF(i, f)); } else { rl(a, f, -5); msg('Odmietli. Vraj radšej zomrú v boji.', () => dipF(i, f)); } }, 0, 'coins');
        btn('Ponúknuť tribút za prímerie (' + tributeOffer(f) + ' zlata, 25 dní)', () => { G.gold -= tributeOffer(f); makeTruce(f, 25); rl(a, f, 10); upd(); msg('Prijali tvoje zlato. Na 25 dní je pokoj.', () => dipF(i, f)); }, G.gold < tributeOffer(f), 'coins');
    }
    if ((G.pri || []).some(p => p.f === f)) btn('Vymeniť zajatých lordov (' + G.pri.filter(p => p.f === f).length + ', vzťah +12, 40 zlata za každého)', () => { const n = exchangePrisoners(f); upd(); msg('Domov sa vrátilo ' + n + ' lordov. ' + FN[f] + ' posiela zlato a vďaku.', () => dipF(i, f)); }, 0, 'chain');
    if (AL[a][f]) { const x = a0x.find(o => o !== f && o !== a && WR[a][o] && !WR[f][o]); if (x != null) btn('Navrhnúť spoločnú vojnu proti ' + FN[x], () => { if (REL[a][f] >= 50) { WR[f][x] = WR[x][f] = true; lg(FN[f] + ' na tvoju žiadosť vyhlásil vojnu ' + FN[x] + '.'); msg(FN[f] + ' vyhlasuje vojnu ' + FN[x] + '.', () => dipF(i, f)); } else msg('Spojenec váha – treba vzťah aspoň 50.', () => dipF(i, f)); }, 0, 'sword'); }
    if (!WR[a][f]) {
        btn(truceLeft(f) ? 'Vyhlásiť vojnu (porušíš prímerie: česť −5)' : 'Vyhlásiť vojnu', () => { if (truceLeft(f)) breakTruce(f); WR[a][f] = WR[f][a] = true; AL[a][f] = AL[f][a] = false; rl(a, f, -40); dipF(i, f); });
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
    if (typeof ROOM !== 'undefined' && ROOM && ROOM.room === 'village' && ROOM.vi === i && !ROOM.menu) return roomReturn();   // „Späť“ z okna otvoreného v dedine
    mode = 'town';
    G.dest = -1;
    if (!v.good) v.good = villageGood(v, i);
    show(v.n + ' (' + FN[f] + ')', v.st > 0 ? 'Dedina je vypálená, obnoví sa o ' + v.st + ' dní.' : 'Dedina patrí k hradu ' + TW[v.t].n + '. Vyrába: ' + goodOf(v.good).n + ' (' + goodOf(v.good).ico + '), prosperita úroveň ' + lvl(v) + '.');
    if (!hos(f, G.fac) && roomSceneOk('Village')) btn('Vstúpiť do dediny (prejsť sa po návsi)', () => enterVillage(i), 0, 'village');
    if (v.st <= 0 && !hos(f, G.fac))
        btn('Trh (kúpiť a predať tovar)', () => market(v, () => vill(i)), 0, 'scales');
    if (v.st <= 0 && hos(f, G.fac))
        btn('Vyrabovať dedinu (bráni ju domáca stráž)', () => { ov.classList.add('hide'); startBattle({ n: 5 + Math.floor(Math.random() * 6), f, vil: v }); }, 0, 'fire');
    if (v.st <= 0 && !hos(f, G.fac))
        btn('Najať dobrovoľníkov (3 pešiaci za 25)', () => {
            if (G.gold >= 25) {
                G.gold -= 25;
                G.inf += 3;
                upd();
                vill(i);
            }
        }, G.gold < 25, { u: 'i' });
    btn('Odísť', () => { ov.classList.add('hide'); mode = 'map'; }, 0, 'door');
}
function town(i) {
    const t = TW[i];
    if (typeof ROOM !== 'undefined' && ROOM && ROOM.i === i && !ROOM.menu) return roomReturn();   // „Späť“ z okna otvoreného na nádvorí/v sieni/v krčme
    G.dest = -1;
    mode = 'town';
    if (hos(t.f, G.fac)) {
        if (G.besiege === i && t.sg) return siegeMenu(i);
        const sg = t.sg, ally = sg && !hos(sg.f, G.fac);
        show(t.n + ' (' + FN[t.f] + ')', 'Nepriateľský hrad. Posádka: ' + t.g + ' mužov' + (t.wl ? ', hradby stupeň ' + t.wl : '') + '. Za hradbami sa bránia oveľa silnejšie; na útok treba rebríky alebo obliehaciu vežu.' + (sg ? ' Hrad práve oblieha ' + FN[sg.f] + ' (' + (G.day - sg.d0 + 1) + '. deň).' : ''));
        if (!sg || ally) btn(ally ? 'Pridať sa k obliehaniu (' + FN[sg.f] + ')' : 'Obliehať hrad (postaviť tábor)', () => siege(i), 0, 'ram');
        btn('Odísť', () => { ov.classList.add('hide'); mode = 'map'; }, 0, 'door');
        return;
    }
    if (t.sg && hos(t.sg.f, G.fac) && G.defend !== i) {   // spojenecký hrad v obliehaní: hráč môže vstúpiť a brániť ho
        show(t.n + ' – v obliehaní', 'Hrad oblieha ' + FN[t.sg.f] + ' (' + Math.round(siegeMen(i)) + ' mužov, ' + (G.day - t.sg.d0 + 1) + '. deň). Posádka ' + t.g + ', zásoby ' + (t.sg.food > 0 ? 'na ' + t.sg.food + ' dní' : 'došli') + '. Obliehatelia stavajú: ' + (aiBuild(t) ? SIEGE_NAME[aiBuild(t)] + ' (' + pct(siegeProg(t.sg, aiBuild(t))) + ')' : 'technika je hotová') + '.');
        btn('Vstúpiť do hradu a brániť ho', () => defendCastle(i), 0, 'shield');
        btn('Odísť', () => { ov.classList.add('hide'); mode = 'map'; }, 0, 'door');
        return;
    }
    qChk('v', t.n);
    questEvent('v', t.n);
    show(t.n + ' (' + FN[t.f] + ')', 'Zlato ' + G.gold + ', vojsko ' + ar() + ', zdravie ' + Math.ceil(G.hp) + '/' + mh() + '. Posádka hradu: ' + t.g + (t.lord ? ', léno drží ' + t.lord : '') + '.');
    ov.dataset.screen = 'town'; ov.dataset.ti = i;   // bohatá obrazovka vstupu do hradu (js/engine/scenes/UIRich.js)
    if (roomsOk()) btn('Vstúpiť na nádvorie', () => enterCastle(i, 'yard'), 0, 'castle');
    [['r', 'Verbovanie vojakov', 'recruit'], ['e', 'Kováč a zbrojnica', 'anvil'], ['v', 'Vojsko, zajatci a odpočinok', 'rest'], ...(t.mine ? [['h', 'Správa hradu', 'castle']] : []), ['d', 'Dvor a diplomacia', 'court']].forEach(([c, n, ic]) => btn(n, () => tsub(i, c), 0, ic));
    btn('Trh', () => market(t, () => town(i)), 0, 'scales');
    btn('Krčma' + (compsAt(t).length ? ' (niekto tu čaká)' : ''), () => enterTavern(i), 0, 'mug');
    questsAt(t).forEach(q => {
        const d = qDef(q), s = qStep(q);
        if (s.k === 'r') btn('Úloha: uzavrieť „' + d.n + '“ u ' + q.lord, () => { questComplete(q); msg('„' + qText(q, d.done) + '“', () => town(i)); }, 0, 'quest');
        else btn('Úloha: odovzdať ' + s.n + '× ' + goodOf(s.a).n + ' (' + d.n + ')', () => { if (questDeliver(q)) msg(q.step >= d.steps.length ? '„' + qText(q, d.done) + '“' : 'Tovar odovzdaný.', () => town(i)); }, ((G.cargo || {})[s.a] || 0) < s.n, 'quest');
    });
    btn('Hrdina a schopnosti' + (G.sk ? ' (' + G.sk + ' bodov)' : ''), () => skills(i), 0, 'hero');
    btn('Turnaj v aréne (vstupné 20)', () => { G.gold -= 20; upd(); ov.classList.add('hide'); startBattle({ n: 3 + Math.floor(G.lv / 2), f: t.f, ar: 1, t }); }, G.gold < 20, 'attack');
    if (G.ring === 1 && t.n === 'Barad-dûr' && bloc(G.fac) === 1)
        btn('Odovzdať Prsteň Sauronovi', () => { G.ring = 2; G.gold += 1000; G.ren += 10; lg('Odovzdal si Jeden prsteň Sauronovi.'); ach(); upd(); town(i); }, 0, 'ring');
    btn('Uložiť hru', () => saveMenu(() => town(i)), 0, 'chest');
    btn('Odísť z mesta', () => { ov.classList.add('hide'); mode = 'map'; }, 0, 'door');
}
function tsub(i, c) {
    if (c === 'e')
        return smithy(i);
    const t = TW[i], re = () => { upd(); tsub(i, c); }, T = { r: 'Verbovanie vojakov', e: 'Kováč a zbrojnica', v: 'Vojsko, zajatci a odpočinok', h: 'Správa hradu', d: 'Dvor a diplomacia' };
    mode = 'town';
    show(T[c], 'Zlato: ' + G.gold + '.' + (c === 'r' ? ' Pešiaci ' + G.inf + ', jazdci ' + G.cav + ', lukostrelci ' + G.arc + ', elfovia ' + G.elf + ', rohirimi ' + G.roh + ', veteráni ' + G.vet + '.' : c === 'e' ? ' Útok ' + dmg() + ', ochrana ' + Math.round((1 - red()) * 100) + ' %.' : c === 'v' ? ' Zajatci ' + G.cap + ', skúsenosti ' + G.txp + ', zajatí velitelia ' + G.pri.length + '.' : c === 'h' ? ' Hradby stupeň ' + (t.wl || 0) + ', posádka ' + t.g + '.' : ' Hodnosť: ' + rank() + ', sláva ' + G.ren + ', frakcia: ' + FN[G.fac] + '.'));
    if (c === 'r')
        rec(t).forEach(([n, p, k]) => btn(n + ' (' + p + ' zlata)', () => { G.gold -= p; G[k]++; re(); }, G.gold < p, { u: unitKind(k) }));
    if (c === 'v') {
        btn('Odpočinúť si (plné zdravie)', () => { G.hp = mh(); re(); }, G.hp >= mh(), 'heart');
        btn('Povýšiť pešiaka na veterána (20 zlata, 15 skúseností)', () => { G.gold -= 20; G.txp -= 15; G.inf--; G.vet++; re(); }, G.gold < 20 || G.txp < 15 || G.inf < 1, { u: 'v' });
        btn('Naverbovať zajatcov (8 zlata/ks)', () => { const n = Math.min(G.cap, Math.floor(G.gold / 8)); G.gold -= n * 8; G.inf += n; G.cap -= n; re(); }, !G.cap || G.gold < 8, 'chain');
        btn('Predať zajatcov (' + (G.tcun ? 15 : 12) + ' zlata/ks)', () => { G.gold += G.cap * (G.tcun ? 15 : 12); G.cap = 0; re(); }, !G.cap, 'coins');
        btn('Zajatí velitelia (' + G.pri.length + '): výkupné, prepustenie', () => prisonersMenu(() => tsub(i, c)), 0, 'chain');
    }
    if (c === 'h') {
        const w = t.wl || 0, cw = 150 * (w + 1), bd = t.bd || (t.bd = {});
        if (w < 3)
            btn('Vylepšiť hradby na stupeň ' + (w + 1) + ' (' + cw + ')', () => { G.gold -= cw; t.wl = w + 1; re(); }, G.gold < cw);
        else
            btn('Hradby: maximum', null, 1);
        row('Prosperita: úroveň ' + lvl(t) + ' (' + Math.round(t.pr ?? 40) + ' %), denný príjem ' + castleIncome(t) + ' zlata. ' + (bd.s ? 'Kováč predáva o 20 % lacnejšie. ' : '') + (bd.j ? 'Kone sú tu o 25 % lacnejšie a hrad dáva 1 jazdca za 3 dni. ' : '') + (bd.c ? 'Chrám: tvoji vojaci sú v bitke pevnejší (menej zranení). ' : '') + (bd.t ? 'Trhovisko priťahuje tovar a zvyšuje prosperitu. ' : ''), { dim: 1 });
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
        btn('Diplomacia s frakciami', () => dip(i), 0, 'honor');
        btn('Dvor: lordi, vzťahy a spory' + (t.mine ? ', hostina' : ''), () => court(i), 0, 'court');
        if ((G.king || TW.some(x => x.mine))) btn('Kráľovstvo: léna, vazali, správa', () => kingdom(i), 0, 'crown');
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
    btn('Späť', () => town(i), 0, 'back');
}
/** Druh vojaka (kľúč v Soldiers.UNITS) pre položku verbovania k. */
const unitKind = k => ({ inf: 'i', arc: 'a', cav: 'c', roh: 'r', elf: 'e', vet: 'v' })[k] || k;
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
    const rr = () => [...bt.querySelectorAll('button')].forEach(b => { const on = b.dataset.e == ke || b.dataset.c === kc || b.dataset.sd == sd; b.style.outline = on ? '3px solid #fff' : ''; if (on) b.dataset.sel = '1'; else delete b.dataset.sel; });
    [['Strana dobra', 0], ['Strana zla', 1]].forEach(([n, v]) => { const b = document.createElement('button'); b.textContent = n; b.dataset.sd = v; b.onclick = () => { sd = v; rr(); }; bt.appendChild(b); });
    EN.forEach((n, k) => { const b = document.createElement('button'); b.textContent = n; b.dataset.e = k; b.onclick = () => { ke = k; rr(); }; bt.appendChild(b); });
    KCs.forEach(c => { const b = document.createElement('button'); b.textContent = '\u00a0'; b.style.background = c; b.dataset.c = c; b.setAttribute('aria-label', 'Farba štítu'); b.onclick = () => { kc = c; rr(); }; bt.appendChild(b); });
    rr();
    btn('Potvrdiť korunováciu', () => { G.kn = inp.value.trim() || 'Nové kráľovstvo'; G.ke = ke; G.kc = kc; lg('Vzniklo kráľovstvo ' + G.kn + '.'); chooseSide(sd); upd(); ov.classList.add('hide'); mode = 'map'; });
}
/** Okno Úlohy: aktívne úlohy, postup a čo robiť ďalej. */
function questLog() {
    if (mode !== 'map') return;
    mode = 'town';
    const Q = G.qu || [], chap = QS[G.q];
    show('Úlohy', Q.length ? 'Máš ' + Q.length + ' z ' + MAX_QUESTS + ' úloh. Splnených: ' + Object.values(G.qdone || {}).reduce((a, b) => a + b, 0) + '.' : 'Nemáš žiadnu vedľajšiu úlohu. Porozprávaj sa s veliteľmi na mape, ponúknu ti prácu.'); ov.dataset.screen = 'sections';
    if (chap) { rowHead('Príbeh: kapitola ' + (G.q + 1) + '/' + QS.length); row(chap.t + (chap.k === 'k' ? ' (' + G.qc + '/' + chap.n + ')' : '')); }
    Q.forEach(q => {
        const d = qDef(q), s = qStep(q);
        rowHead(d.n + ' · od ' + q.lord + ' (' + FN[q.lf] + ')');
        row('Krok ' + (q.step + 1) + '/' + d.steps.length + ': ' + qText(q, s.s) + (s.k === 'k' ? ' Zatiaľ ' + q.cnt + '/' + s.n + '.' : s.k === 'd' ? ' Vezieš ' + ((G.cargo || {})[s.a] || 0) + '/' + s.n + '.' : '') + ' Odmena ' + d.r + ' zlata.');
        btn('Vzdať sa úlohy: ' + d.n, () => { questAbandon(q); questLog(); });
    });
    btn('Zavrieť', () => { ov.classList.add('hide'); mode = 'map'; });
}

/** Výber pozície na uloženie. */
