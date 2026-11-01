/*
 * AI lordov a tlúp na mape (volá worldTick pre každú armádu): výber cieľa (nepriateľ v dosahu, tlupy pri dedinách, strážca léna,
 * poľné vojsko maršala a ťaženie), pohyb, stret s hráčom a boj armád medzi sebou; maršal, rozdelenie úloh a strategická AI frakcií.
 */
function lordTick(e, dt) {
    const pd = Math.hypot(G.x - e.x, G.y - e.y);
    let tg = null, td = SEEK_R, fol = null, stopHere = false;
    const sheltered = G.defend >= 0 && TW[G.defend] && Math.hypot(G.x - TW[G.defend].x, G.y - TW[G.defend].y) < 20 * K;   // hráč za hradbami
    if (hos(e.f, G.fac) && pd < td && !sheltered) {
        tg = G;
        td = pd;
    }
    for (const o of E)
        if (o !== e && !o.dead && !o.inside && hos(o.f, e.f)) {
            const d = Math.hypot(o.x - e.x, o.y - e.y);
            if (d < td) {
                td = d;
                tg = o;
            }
        }
    if (!tg) {
        if (e.f === 9 && VL.length) {
            // tlupy: potulujú sa medzi dedinami v okolí (do 250 jednotiek), číhajú pri cestách; vargovia sa držia lesov a hôr
            if (e.vi == null || !VL[e.vi] || Math.hypot(VL[e.vi].x - e.x, VL[e.vi].y - e.y) < 60 * K * .3) {
                const near = VL.map((v, i) => i).filter(i => Math.hypot(VL[i].x - e.x, VL[i].y - e.y) < 250 * K);
                e.vi = near.length ? near[Math.floor(Math.random() * near.length)] : Math.floor(Math.random() * VL.length);
                if (e.wait == null) e.wait = 0;
            }
            if (e.wait > 0) { e.wait -= dt; stopHere = true; tg = { x: e.x, y: e.y }; }
            else { const v = VL[e.vi]; tg = { x: v.x + 30 * K * .3, y: v.y + 20 * K * .3 }; if (Math.hypot(tg.x - e.x, tg.y - e.y) < 15) e.wait = 200 + Math.random() * 400; }
        }
        else if (e.f === 9 || e.nz || e.home == null || !TW[e.home]) {
            // nazgûli a lordi bez domova: blúdia medzi hradmi ako doteraz
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
                    const besieging = t.sg && (t.sg.f === e.f || AL[t.sg.f][e.f]);
                    const ready = besieging || gathered >= need * 1.1 || G.day - e.mu.day >= 5;
                    tg = ready ? t : muster;
                    if (!ready && Math.hypot(muster.x - e.x, muster.y - e.y) < 20) { stopHere = true; tg = null; }
                    else if (ready && Math.hypot(t.x - e.x, t.y - e.y) < SIEGE_R) {
                        // obliehanie: tábor okolo hradu, technika sa stavia každý deň, útok podľa js/sim/siege.js
                        if (!t.sg) startSiege(ci, e.f, e.id);
                        const a = (e.id * 2.39996) % 6.283;
                        tg = { x: t.x + Math.cos(a) * 24 * K, y: t.y + Math.sin(a) * 15 * K };
                        if (Math.hypot(tg.x - e.x, tg.y - e.y) < 8) { stopHere = true; tg = null; }
                    }
                    if (!t.sg && G.day - e.mu.day >= 14) { CP[e.f] = null; e.mu = null; }   // ťaženie bez obliehania po dvoch týždňoch skončí
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
    if (hos(e.f, G.fac) && pd < ENGAGE_R && mode === 'map' && !(G.safe > 0) && !sheltered) {
        startBattle(e, e.fo && !hos(e.fo.f, G.fac) ? e.fo : null);
        return true;
    }
    if (G.talk === e && pd < 24 && mode === 'map') {
        G.talk = null;
        G.tx = G.x;
        G.ty = G.y;
        lord(e);
        return true;
    }
    if (e.fo && !hos(e.f, G.fac) && hos(e.fo.f, G.fac) && pd < 26 && mode === 'map' && !(G.safe > 0)) {
        startBattle(e.fo, e);
        return true;
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

    return false;
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
