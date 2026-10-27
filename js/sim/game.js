/*
 * Nová hra, uloženie a načítanie.
 */
function save() {
    try {
        localStorage.setItem('vs1', JSON.stringify({ G: { ...G, chase: null, talk: null }, T: TW.map(t => ({ f: t.f, g: t.g, mine: t.mine, wl: t.wl || 0, pr: t.pr, bd: t.bd, lord: t.lord })), E: E.map(e => ({ id: e.id, x: e.x, y: e.y, f: e.f, n: e.n, nm: e.nm, kr: e.kr, nz: e.nz, rl: e.rl || 0, vx: 0, vy: 0, w: 0 })), WR, REL, AL, CP, VL }));
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
        VL = mkVL();
        WR = mkWR();
        REL = mkREL();
        AL = mkAL();
        CP = {};
        G = { name: nm, king: 0, arc: 0, elf: 0, roh: 0, pri: [], sk: 0, q: 0, qc: 0, qs: 0, qd: 0, cap: 0, vet: 0, txp: 0, wed: -1, heir: 0, s: { st: 0, od: 0, ob: 0, pr: 0, ls: 0 }, gold: 150, inf: 6, cav: 0, hp: 100, lv: 1, xp: 0, ren: 0, day: 1, x: 720, y: 4050, tx: 720, ty: 4050, dest: -1, fac: 6, chase: null, eq: { w: 0, a: 0, s: 0, m: 0, h: 0 } };
        E = [];
        sp = 150;
        QS = bloc(f0) ? QE : QG;
        G.st = { b: 0, w: 0, l: 0, k: 0, d: 0, c: 0, r: 0 };
        for (let i = 0; i < 55; i++)
            spawnE();
        for (let i = 0; i < 4; i++)
            spawnX();
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
function load() {
    L_load0: {
        initA();
        try {
            const s = JSON.parse(localStorage.getItem('vs1'));
            if (!s)
                break L_load0;
            TW = mkTW();
            s.T.forEach((o, i) => Object.assign(TW[i], o));
            G = s.G;
            E = s.E;
            QS = bloc(G.fac) ? QE : QG;
            WR = s.WR.length < 10 ? mkWR() : s.WR;
            REL = s.REL.length < 10 ? mkREL() : s.REL;
            AL = s.AL.length < 10 ? mkAL() : s.AL;
            CP = s.CP || {};
            VL = s.VL || mkVL();
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
