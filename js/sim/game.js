/*
 * Nová hra, uloženie a načítanie.
 */
/**
 * Uložené pozície: 'vs1' = pozícia 1 (pôvodná), 'vs2', 'vs3' = ďalšie ručné, 'vsauto' = automatická (na konci každého dňa).
 * slot = 1, 2, 3 alebo 'auto'.
 */
const SLOTS = [['1', 'Pozícia 1'], ['2', 'Pozícia 2'], ['3', 'Pozícia 3'], ['auto', 'Automatická (koniec dňa)']];
const slotKey = slot => slot === 'auto' ? 'vsauto' : 'vs' + (slot || 1);
/** Popis uloženej pozície alebo null, ak je prázdna. */
function slotInfo(slot) {
    try {
        const s = JSON.parse(localStorage.getItem(slotKey(slot)));
        return s && s.G ? s.G.name + ', deň ' + s.G.day + ', ' + (s.G.kn || FN[s.G.fac]) + (s.when ? ', ' + s.when : '') : null;
    } catch (x) { return null; }
}
function save(slot) {
    try {
        localStorage.setItem(slotKey(slot), JSON.stringify({ G: { ...G, chase: null, talk: null }, T: TW.map(t => ({ f: t.f, g: t.g, mine: t.mine, wl: t.wl || 0, pr: t.pr, bd: t.bd, lord: t.lord, inv: t.inv })), E: E.map(e => ({ id: e.id, x: e.x, y: e.y, f: e.f, n: e.n, nm: e.nm, kr: e.kr, nz: e.nz, rl: e.rl || 0, home: e.home, role: e.role, vx: 0, vy: 0, w: 0 })), WR, REL, AL, CP, VL, MW, K, when: new Date().toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) }));
        return 1;
    }
    catch (x) {
        return 0;
    }
}
function newGame() {
    ov.classList.remove('intro');
    tb.style.display = 'flex';
    hud.style.visibility = '';
    {
        initA();
        setTimeout(help, 0);
        LOG = [];
        const pn = document.getElementById('pn'), fs = document.getElementById('fs'), nm = (pn && pn.value.trim()) || (G && G.name) || 'Vojvodca', f0 = fs ? +fs.value : 6;
        TW = mkTW();
        VL = nameVillages(mkVL());
        WR = mkWR();
        REL = mkREL();
        AL = mkAL();
        CP = {};
        MW = { n: 'clear', l: 0 };
        G = { name: nm, king: 0, arc: 0, elf: 0, roh: 0, pri: [], sk: 0, q: 0, qc: 0, qs: 0, qd: 0, cap: 0, vet: 0, txp: 0, wed: -1, heir: 0, s: { st: 0, od: 0, ob: 0, pr: 0, ls: 0 }, gold: 150, inf: 6, cav: 0, hp: 100, lv: 1, xp: 0, ren: 0, day: 1, x: 160 * K, y: 900 * K, tx: 160 * K, ty: 900 * K, dest: -1, pd: -1, fac: 6, chase: null, eq: { w: 0, a: 0, s: 0, m: 0, h: 0 }, own: { w: [0], a: [0], s: [0], m: [0], h: [0] } };
        E = [];
        sp = 150;
        QS = bloc(f0) ? QE : QG;
        G.st = { b: 0, w: 0, l: 0, k: 0, d: 0, c: 0, r: 0 };
        for (let i = 0; i < 110; i++)
            spawnE();
        [0, 1, 2, 3, 4, 5, 7, 8].forEach(f => { if (typeof assignRoles === 'function') assignRoles(f); });
        for (let i = 0; i < 4; i++)
            spawnX();
        if (bloc(f0))
            startGear(1);   // hrdina zla začína s orkskou výbavou
        if (typeof creatorResult === 'function') {   // tvorba postavy: vzhľad, povaha, schopnosti
            const cr = creatorResult();
            G.look = cr.look; G.trait = cr.trait; G.race = cr.race; Object.assign(G.s, cr.s);
            if (G.fac === 6) G.side = cr.side;                              // nezávislý hrdina: strana zvolená pri tvorbe postavy
            if (typeof RACES !== 'undefined' && RACES[cr.race]) RACES[cr.race].fx(G);
            if (TRAITS[cr.trait]) TRAITS[cr.trait].fx(G);
            if (G.trel) E.forEach(e => { if (!bloc(e.f)) e.rl = (e.rl || 0) + G.trel; });
        }
        if (f0 !== 6) {
            const t = TW.find(t => t.f === f0);
            G.fac = f0;
            G.x = G.tx = t.x;
            G.y = G.ty = t.y + 30;
            TW.forEach(x => {
                if (x.f === 6)
                    x.f = f0;
            });
        }
        dayT = 0;
        mode = 'map';
        ov.classList.add('hide');
        upd();
    }
}
function load(slot) {
    L_load0: {
        initA();
        try {
            const s = JSON.parse(localStorage.getItem(slotKey(slot)));
            if (!s)
                break L_load0;
            TW = mkTW();
            s.T.forEach((o, i) => Object.assign(TW[i], o));
            G = s.G;
            if (!G.own)   // staré uloženie: výbava sa kupovala postupne, takže hrdina vlastní všetko až po súčasnú vec
                G.own = Object.fromEntries(Object.keys(G.eq).map(k => [k, Array.from({ length: G.eq[k] + 1 }, (_, i) => i)]));
            E = s.E;
            QS = bloc(G.fac) ? QE : QG;
            WR = s.WR.length < 10 ? mkWR() : s.WR;
            REL = s.REL.length < 10 ? mkREL() : s.REL;
            AL = s.AL.length < 10 ? mkAL() : s.AL;
            CP = s.CP || {};
            VL = s.VL || mkVL();
            if (s.K && s.K !== K) {   // staršie uloženie z menšej mapy: prepočítať polohy na novú mierku
                const q = K / s.K; const sc = o => { o.x *= q; o.y *= q; if (o.tx != null) { o.tx *= q; o.ty *= q; } };
                sc(G); E.forEach(sc); VL.forEach(sc); if (G.sg) G.sg = null;
            }
            if (!s.K) { const q = K / 4.5; const sc = o => { o.x *= q; o.y *= q; if (o.tx != null) { o.tx *= q; o.ty *= q; } }; sc(G); E.forEach(sc); VL.forEach(sc); }
            E.forEach(e => { if (e.home == null && !e.nz && e.f !== 9) { const t = TW.map((x, i) => i).filter(i => TW[i].f === e.f).sort((a, b) => Math.hypot(TW[a].x - e.x, TW[a].y - e.y) - Math.hypot(TW[b].x - e.x, TW[b].y - e.y))[0]; e.home = t; e.role = e.role || 'army'; } });
            MW = s.MW || { n: 'clear', l: 0 };
            NID = 1e5;
            sp = 100;
            dayT = 0;
            mode = 'map';
            ov.classList.add('hide');
            upd();
        }
        catch (x) { }
    }
    if (G) {
        ov.classList.remove('intro');
        tb.style.display = 'flex';
        hud.style.visibility = '';
    }
}
