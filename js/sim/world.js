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
    const dx = G.tx - G.x, dy = G.ty - G.y, d = Math.hypot(dx, dy), v = it('m').v * (season() === 3 ? .85 : 1) * weatherSlow() * (isNight() ? .85 : 1) * (G.hungry ? .85 : 1);   // hladná družina ide pomalšie
    if (d > 3) {
        G.x += dx / d * v * dt;
        G.y += dy / d * v * dt;
        G.f = Math.atan2(dy, dx);
        if (travelTick(dt)) return;   // udalosť na ceste otvorila okno
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
    if (dayT > DAY_LEN) {
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
            if (!t.sg) t.g = Math.min(20 + (t.wl || 0) * 10, t.g + 1 + (t.wl || 0));   // obliehaný hrad nedostáva posily
            if (t.mine)
                G.gold += Math.round((G.king ? 20 : 10) * taxMul() * fiefShare(t));
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
    for (const e of E) if (lordTick(e, dt)) return;   // AI lordov a tlúp (js/sim/lords.js)
    cam.x = Math.max(0, Math.min(WW - W / Z, G.x - W / Z / 2));
    cam.y = Math.max(0, Math.min(WH - H / Z, G.y - H / Z / 2));
}
/** Hráč čaká (tábor, obliehanie, obrana hradu, zajatie): čas plynie aj bez pohybu a dá sa zrýchliť. */
const waiting = () => !!G && (G.camp || G.besiege >= 0 || G.defend >= 0 || !!G.captive);
/** Rýchlosť času na mape: pri čakaní ×1/×3/×8 (tlačidlo „Čas“), podržaný medzerník = ×8 (ako vo Warbande). */
let HOLD_FAST = false;
const timeMul = () => waiting() ? (HOLD_FAST ? 8 : (G.tmul || 1)) : 1;
function updMap(dt) {
    const idle = Math.hypot(G.tx - G.x, G.ty - G.y) <= 3 && G.dest < 0 && !(G.vd >= 0) && !G.chase && !G.talk && !G.qd;
    if (idle && !waiting()) {
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
        if (SIEGE_EVENT && mode === 'map' && ov.classList.contains('hide')) siegeEventUI();
        // odchod od obliehaného / bráneného hradu
        if (G.besiege >= 0 && TW[G.besiege] && Math.hypot(G.x - TW[G.besiege].x, G.y - TW[G.besiege].y) > SIEGE_R * 1.5) leaveSiege(G.besiege);
        if (G.defend >= 0 && TW[G.defend] && (Math.hypot(G.x - TW[G.defend].x, G.y - TW[G.defend].y) > 20 * K || !TW[G.defend].sg)) { if (TW[G.defend].sg) lg('Opustil si hrad ' + TW[G.defend].n + '.'); G.defend = -1; upd(); }
        if (G.captive && mode === 'map' && ov.classList.contains('hide') && !(G.capShown === G.day)) { G.capShown = G.day; captiveDay(); }
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
