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
    show(v.n + ' (' + FN[f] + ')', v.st > 0 ? 'Dedina je vypálená, obnoví sa o ' + v.st + ' dní.' : 'Dedina patrí k hradu ' + TW[v.t].n + '.');
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
    show(t.n + ' (' + FN[t.f] + ')', 'Zlato ' + G.gold + ', vojsko ' + ar() + ', zdravie ' + Math.ceil(G.hp) + '/' + mh() + '. Posádka hradu: ' + t.g + (t.lord ? ', léno drží ' + t.lord : '') + '.');
    [['r', 'Verbovanie vojakov'], ['e', 'Kováč a zbrojnica'], ['v', 'Vojsko, zajatci a odpočinok'], ...(t.mine ? [['h', 'Správa hradu']] : []), ['d', 'Dvor a diplomacia']].forEach(([c, n]) => btn(n, () => tsub(i, c)));
    btn('Hrdina a schopnosti' + (G.sk ? ' (' + G.sk + ' bodov)' : ''), () => skills(i));
    btn('Turnaj v aréne (vstupné 20)', () => { G.gold -= 20; upd(); ov.classList.add('hide'); startBattle({ n: 3 + Math.floor(G.lv / 2), f: t.f, ar: 1, t }); }, G.gold < 20);
    if (G.ring === 1 && t.n === 'Barad-dûr' && bloc(G.fac) === 1)
        btn('Odovzdať Prsteň Sauronovi', () => { G.ring = 2; G.gold += 1000; G.ren += 10; lg('Odovzdal si Jeden prsteň Sauronovi.'); ach(); upd(); town(i); });
    btn('Uložiť hru', () => msg(save() ? 'Hra uložená.' : 'Ukladanie nie je v tomto prostredí dostupné.', () => town(i)));
    btn('Odísť z mesta', () => { ov.classList.add('hide'); mode = 'map'; });
}
function tsub(i, c) {
    const t = TW[i], re = () => { upd(); tsub(i, c); }, T = { r: 'Verbovanie vojakov', e: 'Kováč a zbrojnica', v: 'Vojsko, zajatci a odpočinok', h: 'Správa hradu', d: 'Dvor a diplomacia' };
    mode = 'town';
    show(T[c], 'Zlato: ' + G.gold + '.' + (c === 'r' ? ' Pešiaci ' + G.inf + ', jazdci ' + G.cav + ', lukostrelci ' + G.arc + ', elfovia ' + G.elf + ', rohirimi ' + G.roh + ', veteráni ' + G.vet + '.' : c === 'e' ? ' Útok ' + dmg() + ', ochrana ' + Math.round((1 - red()) * 100) + ' %.' : c === 'v' ? ' Zajatci ' + G.cap + ', skúsenosti ' + G.txp + ', zajatí velitelia ' + G.pri.length + '.' : c === 'h' ? ' Hradby stupeň ' + (t.wl || 0) + ', posádka ' + t.g + '.' : ' Hodnosť: ' + rank() + ', sláva ' + G.ren + ', frakcia: ' + FN[G.fac] + '.'));
    if (c === 'r')
        rec(t).forEach(([n, p, k]) => btn(n + ' (' + p + ' zlata)', () => { G.gold -= p; G[k]++; re(); }, G.gold < p));
    if (c === 'e')
        SH.forEach(s => {
            const n = s.it[G.eq[s.k] + 1];
            if (n)
                btn(s.l + ': ' + n.n + ' (' + n.p + ')', () => { G.gold -= n.p; G.eq[s.k]++; re(); }, G.gold < n.p);
            else
                btn(s.l + ': ' + it(s.k).n + ' (najlepšie)', null, 1);
        });
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
        [['m', 'Mlyn (+10 zlata denne)', 200], ['k', 'Kasárne (+1 pešiak denne)', 250], ['v', 'Strážna veža (+8 obrancov)', 180]].forEach(([k, n, c2]) => {
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
function kingDlg() {
    mode = 'town';
    show('Nové kráľovstvo', 'Si kráľom! Pomenuj svoje kráľovstvo, vyber znak a farbu štítu.');
    const bt = document.getElementById('bt'), inp = document.createElement('input');
    inp.value = 'Kráľovstvo ' + G.name;
    inp.maxLength = 24;
    inp.style.gridColumn = '1/-1';
    inp.setAttribute('aria-label', 'Názov kráľovstva');
    bt.appendChild(inp);
    let ke = 6, kc = '#6a4a12';
    const EN = ['Biely strom', 'Kôň', 'Oko', 'Ruka', 'Had', 'Koruna', 'Hviezda', 'Slnko', 'List', 'Lebka'], KCs = ['#6a4a12', '#7a1a1a', '#1a3a6a', '#1f4a2a', '#3a1a4a', '#1a1a1a'];
    const rr = () => [...bt.querySelectorAll('button')].forEach(b => { b.style.outline = (b.dataset.e == ke || b.dataset.c === kc) ? '3px solid #fff' : ''; });
    EN.forEach((n, k) => { const b = document.createElement('button'); b.textContent = n; b.dataset.e = k; b.onclick = () => { ke = k; rr(); }; bt.appendChild(b); });
    KCs.forEach(c => { const b = document.createElement('button'); b.textContent = '\u00a0'; b.style.background = c; b.dataset.c = c; b.setAttribute('aria-label', 'Farba štítu'); b.onclick = () => { kc = c; rr(); }; bt.appendChild(b); });
    rr();
    btn('Potvrdiť korunováciu', () => { G.kn = inp.value.trim() || 'Nové kráľovstvo'; G.ke = ke; G.kc = kc; lg('Vzniklo kráľovstvo ' + G.kn + '.'); upd(); ov.classList.add('hide'); mode = 'map'; });
}
function lord(e) {
    per(e);
    {
        mode = 'town';
        e.rl = e.rl || 0;
        show(e.nm + ' (' + FN[e.f] + ')', 'Vzťah: ' + e.rl + '. Vojakov: ' + Math.ceil(e.n) + '. Tvoja sláva: ' + G.ren + '.');
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
