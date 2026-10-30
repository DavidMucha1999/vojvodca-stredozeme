/*
 * Bitka: tvorba jednotiek, začiatok a koniec bitky, boj, šípy, rozkazy a hradby pri obliehaní.
 */
function mkBase(t, k, f) {
    const P = { i: [30, 1.2, 5, 6], c: [45, 1.9, 7, 8], o: [24 + Math.min(20, G.day * 1.5), 1.1, 4, 6], a: [24, 1.1, 5, 6], e: [26, 1.3, 6, 6], r: [60, 2.1, 9, 9], t: [120, .8, 14, 11], w: [18, 2.2, 5, 5], x: [220, .7, 20, 15], v: [50, 1.25, 8, 7], z: [150, 1.5, 13, 10] }[k], hp = P[0];
    return { bn: Math.random() < .1, fc: f, k, t, x: t ? BW - 120 - Math.random() * 140 : 100 + Math.random() * 140, y: 140 + Math.random() * (BH - 280), hp, mh: hp, sp: P[1], d: P[2], c: 0, r: P[3], f: t ? Math.PI : 0 };
}
function startBattleBase(en, al) {
    LB = en;
    en.al = al;
    AR = [];
    en.n = Math.max(1, Math.round(en.n));
    PT = [];
    U = [{ h: 1, t: 0, x: 140, y: BH / 2, hp: G.hp, mh: mh(), sp: 1.2 * it('m').v * (1 + .08 * G.s.ob), c: 0, r: 9, k: 'h', f: 0 }];
    for (let i = 0; i < Math.min(G.inf, 40); i++)
        U.push(mk(0, 'i'));
    for (let i = 0; i < Math.min(G.cav, 20); i++)
        U.push(mk(0, 'c'));
    for (let i = 0; i < Math.min(G.arc, 20); i++)
        U.push(mk(0, 'a'));
    for (let i = 0; i < Math.min(G.vet, 20); i++)
        U.push(mk(0, 'v'));
    for (let i = 0; i < Math.min(G.elf, 15); i++)
        U.push(mk(0, 'e'));
    for (let i = 0; i < Math.min(G.roh, 12); i++)
        U.push(mk(0, 'r'));
    if (al)
        for (let i = 0; i < Math.min(Math.ceil(al.n), 12); i++)
            U.push(Object.assign(mk(0, 'i'), { ally: 1 }));
    for (let i = 0; i < en.n; i++)
        U.push(mk(1, en.nz ? 'z' : (i % 3 === 1 && FK[en.f] && FK[en.f].length ? FK[en.f][i % 2] : ek(en.f, i)), en.f));
    if (en.siege)
        U.forEach(u => {
            if (u.t)
                u.hp = u.mh = u.mh * (1.3 + (en.t.wl || 0) * .15);
        });
    mode = 'battle';
    setOrd('a');
    od.style.display = 'flex';
    tb.style.display = 'none';
    WX = battleWeather();       // počasie z mapy, v noci kratší dostrel
    snd('horn');
    roar(1);
    BI = regionAt(G.x, G.y);
    if (BI === 's' && WX.n === 'clear')
        WX = { ...WX, n: 'snow', r: Math.round(WX.r * .85) };
}
/** Chrám v niektorom z tvojich hradov: tvoji vojaci sú pevnejší (o 10 % menej zranení). */
const temple = () => TW.some(t => t.mine && t.bd && t.bd.c);
function hit(b, d, from) {
    b.hp -= d * (b.h ? red() : !b.t && temple() ? .9 : 1);
    snd(b.hp <= 0 ? 'dy' : b.h ? 'sh' : Math.random() < .5 ? 'sw' : 'hb');
    for (let i = 0; i < 4; i++)
        PT.push({ x: b.x, y: b.y, vx: Math.random() * 3 - 1.5, vy: Math.random() * 3 - 1.5, l: 18, c: b.t ? '#8a2a1a' : '#d9a441' });
}
function mk(t, k, f) {
    if (k === 'roh')
        k = 'r';
    if (k === 'elf')
        k = 'e';
    const F = FU[k];
    if (!F)
        return mkBase(t, k, f);
    const u = mkBase(t, F.b, F.f);
    Object.assign(u, { uk: k, hp: F.hp, mh: F.hp, d: F.d, sp: F.sp, r: F.r, fc: F.f });
    return u;
}
let SGB = null, BG0 = null, CBG = null, PAUSE = 0, KD = 0;
function startBattle(en, al) {
    L_startBattle1: {
        if (en.ar) {
            const s = { inf: G.inf, cav: G.cav, arc: G.arc, elf: G.elf, roh: G.roh, vet: G.vet };
            G.inf = G.cav = G.arc = G.elf = G.roh = G.vet = 0;
            startBattleBase(en, al);
            Object.assign(G, s);
            break L_startBattle1;
        }
        startBattleBase(en, al);
        for (const k in FU)
            if (k[0] === 'u' && G[k])
                for (let i = 0; i < Math.min(G[k], 15); i++)
                    U.push(mk(0, k));
        U.push(...compUnits());    // spoločníci bojujú ako hrdinovia
    }
    if (en.siege) {
        const sg = G.sg && G.sg.t === TW.indexOf(en.t) ? G.sg : {};
        SGB = { gate: 60 + (en.t.wl || 0) * 30, mg: 60 + (en.t.wl || 0) * 30, lad: sg.lad, ram: sg.ram };
        BG0 = BG;
        BG = CBG || (CBG = mkCBG());
    }
    else
        SGB = null;
}
function endBattle(win) {
    compAfterBattle();
    if (SGB) {
        BG = BG0;
        SGB = null;
        G.sg = null;
    }
    const L = LB;
    L_endBattle1: {
        const L = LB;
        if (L.ar) {
            mode = 'over';
            od.style.display = 'none';
            tb.style.display = 'flex';
            roar(0);
            G.safe = 180;
            G.hp = Math.max(20, U[0].hp);
            if (win) {
                const g = 80 + G.lv * 20;
                G.gold += g;
                G.ren++;
                G.tw = (G.tw || 0) + 1;
                rl(G.fac, L.t.f, 5);
                lg('Víťazstvo v turnaji v ' + L.t.n + '.');
                show('Víťaz turnaja', 'Ľud ťa oslavuje. Získal si ' + g + ' zlata a +1 slávu.');
            }
            else
                show('Porážka v aréne', 'Prebral si sa v ošetrovni. Nabudúce budeš mať viac šťastia.');
            btn('Pokračovať', () => { ov.classList.add('hide'); mode = 'map'; });
            upd();
            ach();
            break L_endBattle1;
        }
        if (win) {
            G.dl = G.dl || [];
            G.tro = G.tro || [];
            if (L.nm && !L.siege && !L.vil)
                G.dl.unshift(L.nm + ' (' + FN[L.f] + ', deň ' + G.day + ')');
            if (L.kr) {
                G.tro.push('Koruna panovníka: ' + L.nm);
                lg('Trofej: koruna panovníka ' + L.nm + '.');
            }
            if (L.nz) {
                G.nzk = (G.nzk || 0) + 1;
                G.tro.push('Morgulská čepeľ Nazgûla');
            }
            if (!G.ring && (L.nz && Math.random() < .5 || L.kr && L.f === 2)) {
                G.ring = 1;
                G.cor = 0;
                lg('Našiel si Jeden prsteň!');
            }
            if (L.f === 9 && Math.random() < .3)
                G.tro.push('Lúpežnícky poklad: ' + L.nm);
            if (L.vil)
                L.vil.pr = Math.max(0, (L.vil.pr ?? 40) - 30);
            if (L.siege)
                L.t.pr = Math.max(0, (L.t.pr ?? 40) - 15);
        }
        for (const u of U)
            if (u.uk && !u.cp) {
                if (!u.t && u.hp <= 0 && G[u.uk] > 0)
                    G[u.uk]--;
                u.k = 'fx';
            }
        if (!win)
            for (const k in FU)
                if (k[0] === 'u' && G[k])
                    G[k] = Math.floor(G[k] / 2);
        L_endBattle0: {
            const dI = U.filter(u => !u.t && !u.ally && !u.cp && u.k === 'i' && u.hp <= 0).length, dC = U.filter(u => !u.t && u.k === 'c' && u.hp <= 0).length;
            {
                const S = G.st || (G.st = { b: 0, w: 0, l: 0, k: 0, d: 0, c: 0, r: 0 });
                S.b++;
                S[win ? 'w' : 'l']++;
                S.k += U.filter(u => u.t && u.hp <= 0).length;
                S.d += U.filter(u => !u.t && !u.h && !u.ally && !u.cp && u.hp <= 0).length;
                if (win && LB.siege)
                    S.c++;
                if (win && LB.vil)
                    S.r++;
                if (win && LB.nz) {
                    G.ren += 2;
                    lg('Porazil si Nazgûla!');
                }
            }
            mode = 'over';
            od.style.display = 'none';
            tb.style.display = 'flex';
            G.safe = 180;
            G.chase = null;
            roar(0);
            E = E.filter(e => e !== LB);
            if (win) {
                const loot = LB.n * 7 + 10 + (LB.siege ? 120 : 0) + (LB.vil ? 80 + Math.floor(Math.random() * 80) : 0);
                let up = 0;
                if (LB.vil)
                    LB.vil.st = 8;
                if (LB.siege) {
                    lg('Dobyl si hrad ' + LB.t.n + ' aj s okolitými dedinami.');
                    LB.t.f = G.fac;
                    LB.t.g = 8;
                    LB.t.mine = 1;
                }
                G.inf = Math.max(0, G.inf - dI);
                G.arc = Math.max(0, G.arc - U.filter(u => !u.t && u.k === 'a' && u.hp <= 0).length);
                G.vet = Math.max(0, G.vet - U.filter(u => !u.t && u.k === 'v' && u.hp <= 0).length);
                G.elf = Math.max(0, G.elf - U.filter(u => !u.t && u.k === 'e' && u.hp <= 0).length);
                G.roh = Math.max(0, G.roh - U.filter(u => !u.t && u.k === 'r' && u.hp <= 0).length);
                G.cav = Math.max(0, G.cav - dC);
                G.gold += loot;
                G.ren++;
                G.xp += Math.round(LB.n * 5 * (G.twise ? 1.1 : 1));
                G.hp = Math.max(20, U[0].hp);
                while (G.xp >= G.lv * 30) {
                    G.xp -= G.lv * 30;
                    G.lv++;
                    up++;
                    G.sk++;
                }
                if (up)
                    G.hp = mh();
                upd();
                const lv = up ? ` Nová úroveň: ${G.lv}, zdravie je plné.` : '';
                if (G.king && G.ren >= 30) {
                    show('Slávny vojvodca', 'Orkské tlupy sú rozprášené a Stredozem ťa oslavuje. Dosiahol si slávu 12 za ' + G.day + ' dní.');
                    btn('Hrať znova', newGame);
                    break L_endBattle0;
                }
                show('Víťazstvo', 'Padlo ' + (dI + dC) + ' tvojich mužov. Korisť: ' + loot + ' zlata.' + lv);
                const L = LB;
                if (!L.siege)
                    G.cap += Math.floor(L.n * .3);
                G.txp += L.n * 3;
                if (!L.siege && !L.vil) {
                    qChk('k', L.f);
                    questEvent('k', L.f);
                }
                if (L.siege)
                    qChk('c', L.t.n);
                if (L.al) {
                    rl(G.fac, L.al.f, 10);
                    L.al.rl = (L.al.rl || 0) + 15;
                }
                if (L.nm && !L.siege) {
                    btn('Zajať veliteľa ' + L.nm, () => { G.pri.push(L.nm); rl(G.fac, L.f, -5); ov.classList.add('hide'); mode = 'map'; upd(); });
                    btn('Popraviť', () => { rl(G.fac, L.f, -18); ov.classList.add('hide'); mode = 'map'; });
                    btn('Prepustiť (vzťah +8)', () => { rl(G.fac, L.f, 8); G.ren++; ov.classList.add('hide'); mode = 'map'; upd(); });
                }
                else {
                    rl(G.fac, L.f, -10);
                    btn('Pokračovať', () => { ov.classList.add('hide'); mode = 'map'; });
                }
            }
            else {
                G.inf = Math.max(3, Math.floor(G.inf / 2));
                G.cav = Math.floor(G.cav / 2);
                G.arc = Math.floor(G.arc / 2);
                G.gold = Math.floor(G.gold / 2);
                G.hp = mh();
                G.x = G.tx = TW[0].x;
                G.y = G.ty = TW[0].y;
                upd();
                show('Porazený', 'Prišiel si o polovicu zlata aj mužov. Prebral si sa v Hobitove.');
                btn('Pokračovať', () => { ov.classList.add('hide'); mode = 'map'; });
            }
        }
        ach();
    }
    if (win && L.vil) {
        G.hon = (G.hon || 0) - 3;
        G.fear = (G.fear || 0) + 2;
    }
    [...document.querySelectorAll('#bt button')].forEach(b => { if (/^Popraviť/.test(b.textContent))
        b.addEventListener('click', () => { G.fear = (G.fear || 0) + 5; G.hon = (G.hon || 0) - 5; lg('Poprava sa rozniesla po kraji. Strach z teba rastie.'); upd(); }); if (/^Prepustiť/.test(b.textContent))
        b.addEventListener('click', () => { G.hon = (G.hon || 0) + 5; lg('Tvoja česť rastie.'); upd(); }); });
}
function updBattle(dt) {
    L_updBattle0: {
        if (Math.random() < .06 * dt)
            snd('cl');
        compBattleShout();
        if (fx > 0)
            fx -= dt;
        bc.x = Math.max(0, Math.min(BW - W, U[0].x - W / 2));
        bc.y = Math.max(0, Math.min(BH - H, U[0].y - H / 2));
        for (const p of PT) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.l -= dt;
        }
        PT = PT.filter(p => p.l > 0);
        for (const a of AR) {
            a.x += a.vx * dt;
            a.y += a.vy * dt;
            a.l -= dt;
            for (const v of U)
                if (v.hp > 0 && v.t !== a.t && Math.abs(v.x - a.x) < 7 && Math.abs(v.y - a.y) < 7) {
                    hit(v, (a.d || 4.5) + (a.t ? 0 : G.s.ls));
                    a.l = 0;
                    break;
                }
        }
        AR = AR.filter(a => a.l > 0);
        for (const u of U) {
            if (u.hp <= 0)
                continue;
            u.c -= dt;
            u.x = Math.max(10, Math.min(BW - 10, u.x));
            u.y = Math.max(20, Math.min(BH - 10, u.y));
            u.bs = u.bs || u.sp;
            u.sp = u.bs * ((u.x > 690 && u.x < 750 && (u.y < 440 || u.y > 520)) ? .5 : 1);
            if (u.h) {
                let mx = 0, my = 0;
                if (keys.ArrowLeft || keys.a)
                    mx--;
                if (keys.ArrowRight || keys.d)
                    mx++;
                if (keys.ArrowUp || keys.w)
                    my--;
                if (keys.ArrowDown || keys.s)
                    my++;
                if (ptr.down) {
                    const dx = ptr.x + bc.x - u.x, dy = ptr.y + bc.y - u.y, d = Math.hypot(dx, dy);
                    if (d > 8) {
                        mx = dx / d;
                        my = dy / d;
                    }
                }
                if (mx || my) {
                    const m = Math.hypot(mx, my);
                    u.f = Math.atan2(my, mx);
                    u.x = Math.max(8, Math.min(BW - 8, u.x + mx / m * u.sp * dt));
                    u.y = Math.max(20, Math.min(BH - 8, u.y + my / m * u.sp * dt));
                }
                const rg = it('w').r || 34;
                let near = false;
                for (const v of U)
                    if (v.t && v.hp > 0 && Math.hypot(v.x - u.x, v.y - u.y) < rg)
                        near = true;
                if ((keys[' '] || (ptr.down && near)) && u.c <= 0) {
                    u.c = 22;
                    fx = 10;
                    for (const v of U)
                        if (v.t && v.hp > 0 && Math.hypot(v.x - u.x, v.y - u.y) < rg)
                            hit(v, dmg());
                }
            }
            else {
                let b = null, bd = 1e9;
                for (const v of U)
                    if (v.t !== u.t && v.hp > 0) {
                        const d = Math.hypot(v.x - u.x, v.y - u.y);
                        if (d < bd) {
                            bd = d;
                            b = v;
                        }
                    }
                if (!u.t && !u.ally && b) {
                    if (ORD === 'r') {
                        u.f = Math.PI;
                        u.x = Math.max(20, u.x - u.sp * 1.15 * dt);
                        continue;
                    }
                    if (ORD === 'h' && bd > 75 && u.k !== 'a' && u.k !== 'e')
                        continue;
                    if (ORD === 'f') {
                        const h = U[0], ix = U.indexOf(u), tx = h.x - 30, ty = h.y + (ix % 11 - 5) * 22, dd = Math.hypot(tx - u.x, ty - u.y);
                        if (dd > 25 && bd > 45) {
                            u.x += (tx - u.x) / dd * u.sp * dt;
                            u.y += (ty - u.y) / dd * u.sp * dt;
                            u.f = 0;
                            continue;
                        }
                    }
                }
                if (b) {
                    u.f = Math.atan2(b.y - u.y, b.x - u.x);
                    if ((u.k === 'a' || u.k === 'e')) {
                        if (bd > 150) {
                            u.x += (b.x - u.x) / bd * u.sp * dt;
                            u.y += (b.y - u.y) / bd * u.sp * dt;
                        }
                        else if (bd < 90) {
                            u.x -= (b.x - u.x) / bd * u.sp * dt;
                            u.y -= (b.y - u.y) / bd * u.sp * dt;
                        }
                        if (u.c <= 0 && bd < WX.r) {
                            u.c = 75;
                            const an = Math.atan2(b.y - u.y, b.x - u.x) + (Math.random() - .5) * .12;
                            AR.push({ x: u.x, y: u.y, vx: Math.cos(an) * 7, vy: Math.sin(an) * 7, l: 40, t: u.t, d: u.k === 'e' ? 7 : 4.5 });
                            snd('ar');
                        }
                    }
                    else if (bd > 13) {
                        u.x += (b.x - u.x) / bd * u.sp * dt;
                        u.y += (b.y - u.y) / bd * u.sp * dt;
                    }
                    else if (u.c <= 0) {
                        hit(b, u.d * (.7 + Math.random() * .6));
                        u.c = 45;
                    }
                }
            }
        }
        U[0].tt = (U[0].tt || 0) + dt;
        if (U[0].tt > 9000) {
            const s = t => U.filter(u => u.t === t && u.hp > 0).reduce((a, u) => a + u.hp, 0);
            endBattle(s(0) >= s(1));
            break L_updBattle0;
        }
        if (U[0].hp <= 0)
            endBattle(false);
        else if (!U.some(u => u.t && u.hp > 0))
            endBattle(true);
    }
    if (!SGB || mode !== 'battle')
        return;
    const LY = [250, 710];
    for (const u of U) {
        if (u.hp <= 0)
            continue;
        const gate = SGB.gate <= 0 && u.y > 440 && u.y < 520, lad = SGB.lad && !u.t && LY.some(l => Math.abs(u.y - l) < 22);
        if (u.x > 990 && u.x < 1050 && !gate && !lad)
            u.x = u.x < 1020 ? 990 : 1050;
        if (!u.t && !u.h && u.x >= 980 && u.x <= 992) {
            const py = [480, ...(SGB.lad ? LY : [])].reduce((a, b) => Math.abs(b - u.y) < Math.abs(a - u.y) ? b : a);
            u.y += Math.sign(py - u.y) * Math.min(Math.abs(py - u.y), u.sp * dt * 1.2);
        }
        if (u.t && u.x >= 1048 && u.x <= 1056 && SGB.gate <= 0)
            u.y += Math.sign(480 - u.y) * Math.min(Math.abs(480 - u.y), u.sp * dt);
    }
    if (SGB.gate > 0) {
        let n = 0;
        for (const u of U)
            if (!u.t && u.hp > 0 && u.x > 950 && u.x < 995 && u.y > 425 && u.y < 535)
                n++;
        SGB.gate -= n * dt * (SGB.ram ? .06 : .015) + (SGB.ram && n ? dt * .05 : 0);
        if (n && Math.random() < .05 * dt)
            snd('sh');
        if (SGB.gate <= 0) {
            lg('Brána padla!');
            snd('horn');
        }
    }
}
