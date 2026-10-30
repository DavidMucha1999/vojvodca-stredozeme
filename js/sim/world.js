/*
 * Simulácia sveta: pohyb armád, AI, dni, prosperita, Prsteň, strategická AI, pauza a tábor.
 */
function worldTick(dt) {
    if (G.qd) {
        G.qd = 0;
        qDone();
        return;
    }
    if (G.safe > 0)
        G.safe -= dt;
    if (G.chase) {
        if (E.includes(G.chase) && !G.chase.dead) {
            G.tx = G.chase.x;
            G.ty = G.chase.y;
            G.dest = -1;
        }
        else
            G.chase = null;
    }
    if (G.talk) {
        if (E.includes(G.talk) && !G.talk.dead) {
            G.tx = G.talk.x;
            G.ty = G.talk.y;
            G.dest = -1;
        }
        else
            G.talk = null;
    }
    const dx = G.tx - G.x, dy = G.ty - G.y, d = Math.hypot(dx, dy), v = it('m').v * (season() === 3 ? .85 : 1) * weatherSlow() * (isNight() ? .85 : 1);
    if (d > 3) {
        G.x += dx / d * v * dt;
        G.y += dy / d * v * dt;
        G.f = Math.atan2(dy, dx);
    }
    else if (G.dest >= 0)
        town(G.dest);
    else if (G.vd >= 0) {
        const i = G.vd;
        G.vd = -1;
        vill(i);
    }
    else if (G.pd >= 0) {
        const i = G.pd;
        G.pd = -1;
        place(i);
    }
    dayT += dt;
    if (dayT > 600) {
        dayT = 0;
        G.day++;
        G.gold -= Math.floor((G.inf + G.cav * 2) / 3);
        TW.forEach(t => {
            if (t.mine && t.bd) {
                if (t.bd.m)
                    G.gold += 10;
                if (t.bd.k)
                    G.inf++;
                if (t.bd.j && G.day % 3 === 0)
                    G.cav++;
            }
        });
        E.forEach(e => {
            if (e.f === G.fac && G.fac !== 6 || e.f === 6) {
                e.rl = (e.rl || 0) - (e.vas ? 0 : .3);
                if (e.rl < -10 && Math.random() < .05) {
                    const o = a0x[Math.floor(Math.random() * 8)];
                    if (o !== G.fac) {
                        lg(e.nm + ' sa vzbúril a prešiel k ' + FN[o] + '.');
                        e.f = o;
                    }
                }
            }
        });
        if (G.wed >= 0 && !G.heir && Math.random() < .04) {
            G.heir = 1;
            lg('Narodil sa ti dedič.');
        }
        VL.forEach(v => {
            if (v.st > 0)
                v.st--;
            else if (TW[v.t].mine)
                G.gold += 4;
        });
        spawnX();
        const a0 = [0, 1, 2, 3, 4, 5, 7, 8];
        TW.forEach(t => {
            t.g = Math.min(20 + (t.wl || 0) * 10, t.g + 1 + (t.wl || 0));
            if (t.mine)
                G.gold += G.king ? 20 : 10;
        });
        {
            const a = [0, 1, 2, 3, 4, 5, 7, 8], x = a[Math.floor(Math.random() * 8)], y = a[Math.floor(Math.random() * 8)];
            if (x !== y) {
                REL[x][y] = REL[y][x] = Math.max(-100, Math.min(100, REL[x][y] + (bloc(x) === bloc(y) ? 4 : -4) + Math.floor(Math.random() * 9 - 4)));
                const r = REL[x][y];
                if (r < -55 && !WR[x][y]) {
                    WR[x][y] = WR[y][x] = true;
                    lg(FN[x] + ' vyhlásil vojnu ' + FN[y] + '.');
                    AL[x][y] = AL[y][x] = false;
                    for (let z = 0; z < 9; z++)
                        if (AL[x][z] && z !== y)
                            WR[z][y] = WR[y][z] = true;
                }
                else if (r > -15 && WR[x][y]) {
                    WR[x][y] = WR[y][x] = false;
                    lg(FN[x] + ' a ' + FN[y] + ' uzavreli mier.');
                }
                else if (r > 45 && !WR[x][y] && bloc(x) === bloc(y)) {
                    if (!AL[x][y])
                        lg(FN[x] + ' a ' + FN[y] + ' uzavreli spojenectvo.');
                    AL[x][y] = AL[y][x] = true;
                }
            }
        }
        if (Math.random() < .6) {
            const f = a0[Math.floor(Math.random() * 8)], hs = TW.filter(t => hos(t.f, f));
            if (hs.length)
                CP[f] = TW.indexOf(hs[Math.floor(Math.random() * hs.length)]);
        }
        if (G.gold < 0) {
            G.gold = 0;
            if (G.inf > 1)
                G.inf--;
        }
        upd();
    }
    E = E.filter(e => !e.dead);
    sp -= dt;
    if (sp <= 0) {
        sp = 150;
        spawnE();
    }
    for (const e of E) {
        const pd = Math.hypot(G.x - e.x, G.y - e.y);
        let tg = null, td = 230, fol = null, stopHere = false;
        if (hos(e.f, G.fac) && pd < td) {
            tg = G;
            td = pd;
        }
        for (const o of E)
            if (o !== e && !o.dead && hos(o.f, e.f)) {
                const d = Math.hypot(o.x - e.x, o.y - e.y);
                if (d < td) {
                    td = d;
                    tg = o;
                }
            }
        if (!tg) {
            if (e.f === 9 || e.nz || e.home == null || !TW[e.home]) {
                // banditi, nazgûli a lordi bez domova: blúdia medzi hradmi ako doteraz
                if (e.ti == null)
                    e.ti = Math.floor(Math.random() * TW.length);
                let t = TW[e.ti];
                if (Math.hypot(t.x - e.x, t.y - e.y) < 20) { e.ti = Math.floor(Math.random() * TW.length); t = TW[e.ti]; }
                tg = t;
            }
            else if (e.role === 'guard') {
                // strážca léna: drží sa pri svojom hrade, hliadkuje po dedinách, zaháňa votrelcov; pri ohrození hradu sa stiahne dnu
                const h = TW[e.home], RG = 90 * K;
                let thr = null, tdist = 1e9;
                for (const o of E) if (o !== e && !o.dead && hos(o.f, e.f)) { const d = Math.hypot(o.x - h.x, o.y - h.y); if (d < RG && d < tdist) { tdist = d; thr = o; } }
                if (hos(G.fac, e.f) && Math.hypot(G.x - h.x, G.y - h.y) < RG && Math.hypot(G.x - h.x, G.y - h.y) < tdist) { thr = G; tdist = Math.hypot(G.x - h.x, G.y - h.y); }
                if (thr) {
                    const strong = thr === G ? pw() > e.n * 1.1 : thr.n > e.n * 1.1;
                    tg = (strong || tdist < 35 * K) ? h : thr;          // silnejšieho votrelca čaká za hradbami, slabšieho ide zahnať
                    if (tg === thr && Math.hypot(e.x - h.x, e.y - h.y) > RG) tg = h;   // neprenasleduje ďaleko od domova
                    e.inside = tg === h && Math.hypot(h.x - e.x, h.y - e.y) < 30;
                    if (tg === h && e.inside) { stopHere = true; }
                }
                else {
                    e.inside = 0;
                    if (!e.wp || Math.hypot(e.wp.x - e.x, e.wp.y - e.y) < 14 || G.day !== e.wpd) {
                        const vs = VL.filter(v => v.t === e.home), pick = Math.random() < .35 || !vs.length ? h : vs[Math.floor(Math.random() * vs.length)];
                        const a = Math.random() * 6.283, r = Math.random() * 22 * K;
                        e.wp = { x: pick.x + Math.cos(a) * r, y: pick.y + Math.sin(a) * r * .6 }; e.wpd = G.day;
                    }
                    tg = e.wp;
                }
            }
            else {
                // poľné vojsko: maršal kráľovstva zhromažďuje lordov a vedie ťaženie; ostatní ho nasledujú
                const m = marshal(e.f);
                if (m && m !== e && !m.dead && !(m.mu && e.muSkip === m.mu.t)) {
                    tg = m;
                    if (Math.hypot(m.x - e.x, m.y - e.y) < 12 * K) { stopHere = true; e.hold = 1; } else e.hold = 0;
                }
                else if (m && m !== e && !m.dead) { const h = TW[e.home]; tg = Math.hypot(h.x - e.x, h.y - e.y) < 20 ? null : h; if (!tg) stopHere = true; }   // odmietol výzvu: ostáva doma
                else {
                    const ci = CP[e.f] != null && TW[CP[e.f]] && hos(TW[CP[e.f]].f, e.f) ? CP[e.f] : null;
                    if (ci == null) { const h = TW[e.home]; tg = Math.hypot(h.x - e.x, h.y - e.y) < 20 ? null : h; if (!tg) { stopHere = true; } }
                    else {
                        const t = TW[ci];
                        if (!e.mu || e.mu.t !== ci) { e.mu = { t: ci, day: G.day }; onMuster(e, ci); }
                        const own = TW.filter(x => x.f === e.f), muster = own.length ? own.reduce((b, x) => Math.hypot(x.x - t.x, x.y - t.y) < Math.hypot(b.x - t.x, b.y - t.y) ? x : b) : TW[e.home];
                        const gathered = E.filter(o => o !== e && !o.dead && (o.f === e.f || AL[e.f][o.f]) && Math.hypot(o.x - e.x, o.y - e.y) < 40 * K).reduce((s, o) => s + o.n, 0) + e.n;
                        const need = t.g + 6 + (t.wl || 0) * 8 + E.filter(o => o.f === t.f && !o.dead && Math.hypot(o.x - t.x, o.y - t.y) < 15 * K).reduce((s, o) => s + o.n, 0);
                        const ready = gathered >= need * 1.1 || G.day - e.mu.day >= 5;
                        tg = ready ? t : muster;
                        if (!ready && Math.hypot(muster.x - e.x, muster.y - e.y) < 20) { stopHere = true; tg = null; }
                        if (ready && Math.hypot(t.x - e.x, t.y - e.y) < 20 && e.atkDay === G.day) { tg = null; stopHere = true; }   // dnes už útočil, čaká na ďalší deň
                        else if (ready && Math.hypot(t.x - e.x, t.y - e.y) < 20) {
                            e.atkDay = G.day;
                            // útok na hrad: útočníci v okolí proti posádke a lordom vnútri
                            const att = E.filter(o => !o.dead && (o.f === e.f || AL[e.f][o.f]) && Math.hypot(o.x - t.x, o.y - t.y) < 35 * K).reduce((s, o) => s + o.n, 0);
                            const def = t.g + 4 + (t.wl || 0) * 8 + E.filter(o => o.f === t.f && !o.dead && Math.hypot(o.x - t.x, o.y - t.y) < 15 * K).reduce((s, o) => s + o.n, 0);
                            if (att > def) {
                                const oldF = t.f;
                                captureEvent(t, oldF, e.f, e.nm); mst(e.f).wins++;
                                if (G.join && G.join.ci === ci && Math.hypot(G.x - t.x, G.y - t.y) < 40 * K) { G.ren += 3; G.gold += 60; e.rl = (e.rl || 0) + 6; lg('Za účasť na ťažení si dostal podiel na koristi (60 zlata) a slávu.'); G.join = null; }
                                t.lord = 0; e.n = Math.max(3, e.n - t.g * .5); t.f = e.f; t.g = 5; t.mine = 0; t.wl = 0;
                                E.filter(o => o.home === ci && o.f !== e.f).forEach(o => { o.n = Math.max(2, o.n * .5); o.home = null; });
                                CP[e.f] = null; e.mu = null;
                            } else {
                                mst(e.f).losses++;
                                e.n = Math.max(3, e.n - 2); t.g = Math.max(3, t.g - 2);   // neúspešný útok: straty na oboch stranách
                                if (G.day - e.mu.day >= 8) { CP[e.f] = null; e.mu = null; }
                            }
                            tg = null; stopHere = true;
                        }
                    }
                }
            }
            if (!tg) tg = { x: e.x, y: e.y };
        }
        const dd = Math.max(1, Math.hypot(tg.x - e.x, tg.y - e.y)), sv = tg === G ? 1 : .7, fl = (tg === G && e.n < pw() * .6) ? -1.1 : 1;
        e.vx = (tg.x - e.x) / dd * sv * fl;
        e.vy = (tg.y - e.y) / dd * sv * fl;
        if (e.fo || stopHere || (fol && Math.hypot(fol.x - e.x, fol.y - e.y) < 45)) {
            e.vx = 0;
            e.vy = 0;
        }
        e.x = Math.max(10, Math.min(WW - 10, e.x + e.vx * dt));
        e.y = Math.max(10, Math.min(WH - 10, e.y + e.vy * dt));
        if (hos(e.f, G.fac) && pd < 18 && mode === 'map' && !(G.safe > 0)) {
            startBattle(e, e.fo && !hos(e.fo.f, G.fac) ? e.fo : null);
            return;
        }
        if (G.talk === e && pd < 24 && mode === 'map') {
            G.talk = null;
            G.tx = G.x;
            G.ty = G.y;
            lord(e);
            return;
        }
        if (e.fo && !hos(e.f, G.fac) && hos(e.fo.f, G.fac) && pd < 26 && mode === 'map' && !(G.safe > 0)) {
            startBattle(e.fo, e);
            return;
        }
        if (!e.fo)
            for (const o of E)
                if (o !== e && !o.dead && !o.fo && hos(o.f, e.f) && Math.hypot(o.x - e.x, o.y - e.y) < 16) {
                    e.fo = o;
                    o.fo = e;
                }
        if (e.fo) {
            const o = e.fo;
            if (o.dead || !E.includes(o))
                e.fo = null;
            else {
                o.n -= .0012 * dt * e.n;
                if (o.n <= .5)
                    o.dead = 1;
            }
        }
    }
    cam.x = Math.max(0, Math.min(WW - W / Z, G.x - W / Z / 2));
    cam.y = Math.max(0, Math.min(WH - H / Z, G.y - H / Z / 2));
}
const lvl = o => Math.min(5, 1 + Math.floor((o.pr ?? 40) / 20)), DOOM = { x: 1690 * K, y: 600 * K };
/** Denný príjem z vlastného hradu podľa prosperity a budov. */
const castleIncome = t => lvl(t) * 4 + (G.king ? 20 : 10) + (t.bd && t.bd.m ? 10 : 0) + (t.bd && t.bd.t ? lvl(t) * 2 : 0);
/** Budovy vlastného hradu: [kľúč, názov, cena]. Účinky: mlyn zlato, kasárne pešiaci, veža obrancovia,
 *  kováčska dielňa lacnejšia výbava, stajňa lacnejšie kone a jazdci, chrám morálka v bitke, trhovisko tovar a prosperita. */
const BUILDINGS = [['m', 'Mlyn (+10 zlata denne)', 200], ['k', 'Kasárne (+1 pešiak denne)', 250], ['v', 'Strážna veža (+8 obrancov)', 180],
    ['s', 'Kováčska dielňa (výbava o 20 % lacnejšia)', 300], ['j', 'Stajňa (kone o 25 % lacnejšie, +1 jazdec za 3 dni)', 320], ['c', 'Chrám (tvoji vojaci sú v bitke pevnejší)', 260], ['t', 'Trhovisko (viac tovaru, +prosperita, +zlato)', 280]];
function daily2() {
    TW.forEach(t => { t.pr = Math.min(100, (t.pr ?? 40) + 1 + (t.bd && t.bd.m ? 1 : 0) + (t.bd && t.bd.t ? 1 : 0)); if (t.mine)
        G.gold += lvl(t) * 4 + (t.bd && t.bd.t ? lvl(t) * 2 : 0); });
    if (G.camp && G.stay) G.hp = Math.min(mh(), G.hp + 25);   // pobyt v hrade: rýchlejšie hojenie
    dailyTrade();
    dailyWeather();
    compDaily();
    if (mode === 'map' && save('auto')) TS = TS && TS.l > 0 ? TS : { s: 'Hra automaticky uložená (deň ' + G.day + ').', l: 150 };
    if (G.comp && G.comp.length && Math.random() < .5) { const c = compDef(G.comp[Math.floor(Math.random() * G.comp.length)]); if (c) TS = { s: c.n + ': „' + compLine(c) + '“', l: 320 }; }
    VL.forEach(v => { v.pr = Math.max(0, Math.min(100, (v.pr ?? 40) + (v.st > 0 ? -2 : 1))); if (TW[v.t].mine)
        G.gold += lvl(v) * 2; });
    if (G.ring === 1) {
        G.cor = Math.min(100, (G.cor || 0) + 2);
        E.forEach(e => { if (e.f === G.fac)
            e.rl = (e.rl || 0) - .5; });
        if (E.filter(e => e.nz).length < 4) {
            const t = TW.find(t => t.f === 2);
            if (t)
                E.push({ id: ++NID, x: t.x, y: t.y + 30, f: 2, nz: 1, n: 4, vx: 0, vy: 0, w: 0, nm: 'Nazgûl' });
        }
        if (G.cor >= 100) {
            G.ring = 0;
            G.cor = 0;
            G.hp = Math.max(10, G.hp - 50);
            lg('Prsteň ťa ovládol a Nazgûli si ho vzali späť.');
        }
    }
    ach();
    upd();
}
/** Maršal kráľovstva f: panovník, inak najsilnejší lord. */
const MAR = {};
function marshal(f) {
    let m = E.find(e => e.id === MAR[f] && !e.dead && e.f === f);
    if (!m) { const c = E.filter(e => e.f === f && !e.dead && !e.nz); if (!c.length) return null; m = c.find(e => e.kr) || c.reduce((a, b) => b.n > a.n ? b : a); MAR[f] = m.id; m.role = 'army'; }
    return m;
}
/** Rozdelenie úloh lordov frakcie: každý hrad dostane strážcu (ak lordov stačí), ostatní tvoria poľné vojsko maršala. */
function assignRoles(f) {
    const lords = E.filter(e => e.f === f && !e.dead && !e.nz), own = TW.map((t, i) => i).filter(i => TW[i].f === f);
    if (!lords.length) return;
    const m = marshal(f);
    const guards = new Set(), maxG = Math.max(1, Math.floor(lords.length / 2));   // najviac polovica lordov stráži, zvyšok tvorí poľné vojsko
    const hostile = TW.filter(t => hos(t.f, f));
    const threat = i => hostile.length ? Math.min(...hostile.map(h => Math.hypot(h.x - TW[i].x, h.y - TW[i].y))) : 0;
    const order = own.slice().sort((a, b) => (TW[b].lord ? 1 : 0) - (TW[a].lord ? 1 : 0) || threat(a) - threat(b));   // najprv udelené léna, potom pohraničie
    for (const i of order) {
        if (guards.size >= maxG) break;
        const t = TW[i];
        const named = lords.find(e => t.lord === e.nm && !guards.has(e.id) && e !== m);
        const g = named || lords.filter(e => !guards.has(e.id) && e !== m).sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y))[0];
        if (!g) break;
        g.role = 'guard'; g.home = i; guards.add(g.id);
    }
    lords.forEach(e => { if (!guards.has(e.id)) { e.role = 'army'; if (e.home == null || !TW[e.home] || TW[e.home].f !== f) e.home = own[0] ?? e.home; } });
    if (m) m.role = 'army';
}
function stratAI() {
    marshalDaily();
    [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach(assignRoles);
    const F = [0, 1, 2, 3, 4, 5, 7, 8], P = {};
    F.forEach(f => P[f] = E.filter(e => e.f === f).reduce((s, e) => s + e.n, 0) + TW.filter(t => t.f === f).reduce((s, t) => s + t.g, 0));
    F.forEach(f => {
        const own = TW.filter(t => t.f === f);
        if (!own.length)
            return;
        const th = own.find(t => E.some(e => hos(e.f, f) && e.f !== 9 && Math.hypot(e.x - t.x, e.y - t.y) < 450));
        if (th) {
            CP[f] = null;
            E.filter(e => e.f === f && !e.fo).sort((a, b) => Math.hypot(a.x - th.x, a.y - th.y) - Math.hypot(b.x - th.x, b.y - th.y)).slice(0, 2).forEach(e => e.ti = TW.indexOf(th));
        }
        else {
            let best = null, bs = 1e9;
            TW.forEach((t, i) => { if (!hos(t.f, f))
                return; const d = Math.min(...own.map(o => Math.hypot(o.x - t.x, o.y - t.y))), s = d + t.g * 60 + (t.wl || 0) * 300; if (s < bs) {
                bs = s;
                best = i;
            } });
            if (best != null)
                CP[f] = best;
        }
        const en = F.filter(x => x !== f && WR[f][x]), ep = en.reduce((s, x) => s + P[x], 0);
        if (en.length >= 2 && P[f] < ep * .5) {
            const st = en.sort((a, b) => P[b] - P[a])[0];
            if (st !== G.fac)
                rl(f, st, 6);
        }
        if (own.length > TW.length * .3)
            F.forEach(x => { if (x !== f && x !== G.fac)
                rl(x, f, -3); });
    });
}
function dailyEcho() {
    E.forEach(e => { per(e); if (e.f === G.fac || e.rl) {
        if (e.tr === 0)
            e.rl = (e.rl || 0) + (G.hon || 0) * .02;
        if (e.tr === 4)
            e.rl = (e.rl || 0) + (G.fear || 0) * .02;
        if (e.tr === 3 && e.f === G.fac && !e.vas)
            e.rl = (e.rl || 0) - .2;
    } });
    if ((G.fear || 0) > 20)
        G.gold += Math.floor(G.fear / 10);
}
function updMap(dt) {
    const idle = Math.hypot(G.tx - G.x, G.ty - G.y) <= 3 && G.dest < 0 && !(G.vd >= 0) && !G.chase && !G.talk && !G.qd;
    if (idle && !G.camp) {
        PAUSE = 1;
        return;
    }
    PAUSE = 0;
    const d = G.day;
    {
        const d = G.day;
        worldTick(dt);
        if (G.day !== d)
            daily2();
        if (LETTERS.length && mode === 'map' && ov.classList.contains('hide')) readLetter();
        const dd = Math.hypot(G.x - DOOM.x, G.y - DOOM.y);
        if (G.ring === 1 && mode === 'map' && dd < 180 && !G.rp) {
            G.rp = 1;
            mode = 'town';
            show('Hora osudu', 'Stojíš pri ohni, v ktorom bol Prsteň vykovaný.');
            btn('Hodiť Prsteň do ohňa', () => { G.ring = 2; G.ren += 10; E = E.filter(e => !e.nz); TW.forEach(t => { if (t.f === 2)
                t.g = Math.floor(t.g / 2); }); lg('Jeden prsteň je zničený! Moc Mordoru slabne.'); ach(); upd(); msg('Prsteň sa roztavil v ohni. Nazgûli zmizli a posádky Mordoru sú oslabené.', () => { ov.classList.add('hide'); mode = 'map'; }); });
            btn('Ponechať si ho', () => { ov.classList.add('hide'); mode = 'map'; });
        }
        if (dd > 400)
            G.rp = 0;
    }
    if (G.day !== d && mode === 'map') {
        stratAI();
        dailyEcho();
        if (G.camp)
            G.hp = Math.min(mh(), G.hp + 10);
        upd();
        if (G.fac !== 6 && !G.king && G.day % 7 === 0)
            council();
    }
}
